/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import bcrypt from "npm:bcryptjs@2.4.3";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  
  // When credentials are included (cookies/auth headers), 
  // Access-Control-Allow-Origin MUST NOT be '*'
  // It must be the exact origin of the requester.
  const allowedOrigin = origin || "http://localhost:5173"; 

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me";

serve(async (req: Request) => {
  const cors = getCorsHeaders(req) as any;
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors, "X-Function-Version": "v2" } as any });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "");

    // POST /wipe-all-data - ADMIN UTILITY TO WIPE EVERYTHING
    // Placed before JWT verification to allow system admin execution
    if (path.endsWith("/wipe-all-data") && req.method === "POST") {
      console.log("Wiping all data...");
      
      const errors = [];

      // 1. Delete all rows from public tables (Order matters for FK)
      // Delete dependent tables first
      const tablesToDelete = [
        "user_auth_logs",
        "ticket_messages",
        "notifications",
        "course_progresses",
        "enrollments",
        "tickets",
        "verification_sessions",
        "users"
      ];

      for (const table of tablesToDelete) {
        const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          console.error(`Failed to wipe ${table}:`, error);
          errors.push(`${table}: ${error.message}`);
        }
      }

      // 2. Delete all Auth Users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const deletePromises = users.map((u) => supabase.auth.admin.deleteUser(u.id));
      await Promise.all(deletePromises);

      if (errors.length > 0) {
        return new Response(JSON.stringify({ message: `Partial wipe. Auth users deleted: ${users.length}. Database errors: ${errors.join(", ")}` }), { 
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ message: `Successfully wiped ${users.length} auth users and cleaned public tables.` }), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    // Helper to map DB user to Frontend expected format
    const mapUserToFrontend = (user: any) => {
      if (!user) return null;

      // Support both new individual columns and legacy JSONB for backward compatibility
      const pd = typeof user.personal_details === 'string' 
        ? JSON.parse(user.personal_details || '{}') 
        : (user.personal_details || {});
      const ed = typeof user.education_details === 'string'
        ? JSON.parse(user.education_details || '{}')
        : (user.education_details || {});
      const jd = typeof user.job_details === 'string'
        ? JSON.parse(user.job_details || '{}')
        : (user.job_details || {});

      // Derive fullname and initials correctly
      const fullname = user.fullname || 
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || '';

      // Map individual columns to frontend structure
      return {
        ...user,
        id: user.id,
        fullname: fullname,
        firstName: user.first_name || (fullname ? fullname.split(' ')[0] : ''),
        lastName: user.last_name || (fullname ? fullname.split(' ').slice(1).join(' ') : ''),
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        phone: user.phone || '',
        personalDetails: {
          ...pd,
          city: pd?.city || user.city || null,
          state: pd?.state || user.state || null,
          zipCode: pd?.zipCode || pd?.zip_code || user.pincode || null,
          address: pd?.address || user.address || null,
        },
        educationDetails: {
          ...ed,
          graduationYear: ed?.graduationYear || user.graduation_year || '',
          degree: ed?.degree || user.degree || '',
          institutionName: ed?.institutionName || user.college || '',
        },
        jobDetails: {
          ...jd,
          companyName: jd?.companyName || user.company_name || '',
          designation: jd?.designation || user.designation || '',
          yearsOfExperience: jd?.yearsOfExperience || user.years_of_experience || '',
          linkedinUrl: jd?.linkedinUrl || user.linkedin_url || '',
        },
        emailVerified: user.email_verified,
        authProvider: user.auth_provider,
        role: user.role,
      };
    };

    // Extract and verify JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { 
        status: 401, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string;

    // 1. Try Supabase Auth Verification (for Google/Supabase Signins)
    const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser(token);

    if (sbUser) {
      userId = sbUser.id;
      console.log("Verified via Supabase Auth:", userId, "email:", sbUser.email);
    } else {
      // 2. Try Custom JWT Verification (for Legacy/Email Signins)
      try {
        const key = await crypto.subtle.importKey(
          "raw", 
          new TextEncoder().encode(JWT_SECRET), 
          { name: "HMAC", hash: "SHA-256" }, 
          false, 
          ["sign", "verify"]
        );
        const payload = await verify(token, key);
        userId = payload.id;
        console.log("Verified via Custom JWT:", userId);
        
        if (!userId) throw new Error("Token payload missing user id");
      } catch (jwtErr) {
        console.error("Auth check failed (Both Supabase and Custom JWT):", authError, jwtErr);
        return new Response(JSON.stringify({ 
          error: "Invalid token", 
          details: { 
            supabase: authError?.message, 
            custom: (jwtErr as any).message 
          } 
        }), { 
          status: 401, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
    }

    // GET /me - Get user profile
    if (path.endsWith("/me") && req.method === "GET") {
      console.log("GET /me called for userId:", userId);

      let user: any = null;
      let error: any = null;

      // For Supabase-authenticated users (Google/email via Supabase),
      // prefer lookup (and auto-create) by email so that new Google
      // accounts get a row in public.users automatically.
      if (sbUser?.email) {
        const email = sbUser.email.toLowerCase().trim();
        console.log("Upserting user by email:", email);

        const firstName =
          (sbUser.user_metadata as any)?.first_name ||
          (sbUser.user_metadata as any)?.full_name?.split(" ")[0] ||
          "";
        const lastName =
          (sbUser.user_metadata as any)?.last_name ||
          (sbUser.user_metadata as any)?.full_name?.split(" ").slice(1).join(" ") ||
          "";

        // Simple, robust upsert by email. This works regardless of whether
        // a supabase_id column exists and avoids duplicate key errors.
        const { data: upserted, error: upsertError } = await supabase
          .from("users")
          .upsert(
            {
              email,
              first_name: firstName,
              last_name: lastName,
            },
            { onConflict: "email" },
          )
          .select()
          .single();

        if (upsertError) {
          console.error("Failed to upsert user profile row:", upsertError);
          return new Response(
            JSON.stringify({ error: "Failed to create user profile" }),
            {
              status: 500,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }

        user = upserted;
        error = null;
      } else if (sbUser?.phone) {
        // Phone-authenticated user
        console.log("Fetching user by phone-based ID:", userId);
        
        // Database trigger 'on_auth_user_created' now handles:
        // 1. Creating public.users row if missing
        // 2. Merging if phone number existed under different ID (via ON UPDATE CASCADE)
        
        const { data: existingUser, error: existingError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        user = existingUser;
        error = existingError;

        // Fallback: If for some reason the trigger didn't fire (e.g. existing auth user but no public record yet),
        // we can do a simple insert-if-missing here, but NO complex merge logic.
        if (!user && !error) {
           console.log("User record missing despite auth. Insert skeleton.");
           const { data: created, error: createError } = await supabase
             .from("users")
             .insert({
                id: userId,
                phone: sbUser.phone,
                role: 'student',
                auth_provider: 'PHONE'
             })
             .select()
             .single();
           user = created;
           error = createError;
        }

      } else {
        // Legacy JWT users: look up by id
        console.log("Looking up legacy user by id:", userId);
        const { data: byLegacyId, error: legacyError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (!byLegacyId && !legacyError) {
          console.log("Legacy user record missing, auto-creating skeleton for userId:", userId);
          // Create a skeleton record so /me doesn't fail 404
          const { data: created, error: createError } = await supabase
            .from("users")
            .insert({
                id: userId,
                role: 'student',
                auth_provider: 'PHONE' // Fallback
            })
            .select()
            .single();
          
          if (createError) {
            console.error("Failed to auto-create legacy skeleton:", createError);
            user = null;
            error = createError;
          } else {
            user = created;
            error = null;
          }
        } else {
          user = byLegacyId;
          error = legacyError;
        }
      }

      console.log(
        "User query result - data:",
        user ? "found" : "null",
        "error:",
        error?.message,
      );

      if (error || !user) {
        console.error("User fetch error:", error);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const mappedUser = mapUserToFrontend(user);
      console.log("Returning user:", JSON.stringify(mappedUser));
      return new Response(JSON.stringify({ user: mappedUser }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // PUT /me - Update user profile
    if (path.endsWith("/me") && req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      // Fetch current data first to ensure we don't overwrite other fields in JSON columns
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (fetchError || !currentUser) {
          return new Response(JSON.stringify({ error: "User not found for update" }), { 
            status: 404, 
            headers: { ...cors, "Content-Type": "application/json" } 
          });
      }

      const updates: any = {};

      // Basic info
      if (body.fullname !== undefined) updates.fullname = body.fullname;
      if (body.firstName !== undefined) updates.first_name = body.firstName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.mobile !== undefined) updates.mobile = body.mobile;

      // Safe Merge for Personal Details
      if (body.personalDetails !== undefined) {
          let currentPd = currentUser.personal_details || {};
          if (typeof currentPd === 'string') {
              try { currentPd = JSON.parse(currentPd); } catch { currentPd = {}; }
          }
          // Merge new details into existing
          const newPd = { ...currentPd, ...body.personalDetails };
          updates.personal_details = JSON.stringify(newPd);
      }

      // Safe Merge for Education Details
      if (body.educationDetails !== undefined) {
          let currentEd = currentUser.education_details || {};
          if (typeof currentEd === 'string') {
              try { currentEd = JSON.parse(currentEd); } catch { currentEd = {}; }
          }
          const newEd = { ...currentEd, ...body.educationDetails };
          updates.education_details = JSON.stringify(newEd);
      }

      // Safe Merge for Job Details
      if (body.jobDetails !== undefined) {
          let currentJd = currentUser.job_details || {};
          if (typeof currentJd === 'string') {
              try { currentJd = JSON.parse(currentJd); } catch { currentJd = {}; }
          }
          const newJd = { ...currentJd, ...body.jobDetails };
          updates.job_details = JSON.stringify(newJd);
      }

      const { data: user, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify(mapUserToFrontend(user)), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    // PUT /me/password - Update user password (legacy JWT users)
    if (path.endsWith("/me/password") && req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");

      if (!currentPassword || !newPassword) {
        return new Response(JSON.stringify({ error: "Current and new password are required" }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      if (newPassword.length < 8) {
        return new Response(JSON.stringify({ error: "New password must be at least 8 characters long" }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, password_hash, auth_provider")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "User not found" }), { 
          status: 404, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      if (!user.password_hash) {
        return new Response(JSON.stringify({ error: "Password not available for this account" }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return new Response(JSON.stringify({ error: "Current password is incorrect" }), { 
          status: 401, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: hashedPassword })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { 
          status: 500, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ message: "Password updated successfully" }), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    // GET /enrollments - Get user enrollments
    if (path.endsWith("/enrollments") && req.method === "GET") {
      console.log(`[UsersAPI] Fetching enrollments manually for userId: ${userId}`);
      
      // 1. Fetch raw enrollments
      let enrollments: any[] | null = null;
      let enrollError: any = null;

      // Attempt 1: Service Role
      console.log(`[UsersAPI] Attempt 1: Fetching enrollments (Service Role) for userId: ${userId}`);
      const { data: dataAdmin, error: errorAdmin } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", userId)
        .eq("payment_status", "PAID");

      if (errorAdmin) {
          console.error("Service Role Fetch Error:", errorAdmin);
      } else {
          enrollments = dataAdmin;
      }

      // Attempt 2: User Context (if Attempt 1 matches nothing)
      if ((!enrollments || enrollments.length === 0) && req.headers.get("Authorization")) {
          console.log(`[UsersAPI] Attempt 1 yielded 0 results. Switch to User Token.`);
          
          const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
          const userClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: `Bearer ${userToken}` } } }
          );
          
          const { data: dataUser, error: errorUser } = await userClient
            .from("enrollments")
            .select("*")
            .eq("user_id", userId)
            .eq("payment_status", "PAID");
            
          if (errorUser) {
              console.error("User Token Fetch Error:", errorUser);
          } else {
              if(dataUser && dataUser.length > 0) {
                  console.log(`[UsersAPI] Attempt 2 SUCCESS. Found ${dataUser.length} enrollments via User Token.`);
                  enrollments = dataUser;
              } else {
                  console.log(`[UsersAPI] Attempt 2 yielded 0 results.`);
              }
          }
      }

      if (!enrollments || enrollments.length === 0) {
        return new Response(JSON.stringify([]), { 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      // 2. Extract course IDs
      const courseIds = enrollments.map(e => e.course_id).filter(Boolean);

      console.log(`[UsersAPI] Found course IDs: ${courseIds.join(", ")}`);

      // 3. Fetch courses
      const { data: courses, error: courseError } = await supabase
        .from("course")
        .select("*")
        .in("id", courseIds);

      if (courseError) {
         console.error("Course fetch error:", courseError);
         // Return enrollments without course details if course fetch fails? 
         // Or throw error? Let's return error to be safe.
         return new Response(JSON.stringify({ error: courseError.message }), { 
          status: 500, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }


      // 4. Map courses back to enrollments
      const result = enrollments.map(enrollment => {
          const courseData = courses?.find(c => String(c.id) === String(enrollment.course_id));
          return {
              ...enrollment,
              course: mapSupabaseCourse(courseData) 
          };
      });

      console.log(`[UsersAPI] Returning ${result.length} enrollments with course data.`);

      return new Response(JSON.stringify(result), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    // POST /email-change/start - Start email change process
    if (path.endsWith("/email-change/start") && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { newEmail } = body;
      
      if (!newEmail) {
        return new Response(JSON.stringify({ error: "New email required" }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      // Check if new email is already in use
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", newEmail.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Email already in use" }), { 
          status: 409, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      // For now, just update the email directly (simplified flow)
      // In production, you'd send a verification email here
      const { data: user, error } = await supabase
        .from("users")
        .update({ email: newEmail.toLowerCase().trim(), email_verified: false })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ 
        message: "Email updated successfully. Please verify your new email.",
        user: mapUserToFrontend(user)
      }), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }


    // POST /account-delete/start - Start account deletion process
    if (path.endsWith("/account-delete/start") && req.method === "POST") {
      // Delete user's tickets first (FK constraint)
      await supabase.from("tickets").delete().eq("user_id", userId);
      
      // Delete user's enrollments
      await supabase.from("enrollments").delete().eq("user_id", userId);
      
      // Delete verification sessions
      const { data: user } = await supabase.from("users").select("email").eq("id", userId).single();
      if (user?.email) {
        await supabase.from("verification_sessions").delete().eq("email", user.email);
      }
      
      // Delete the user
      const { error } = await supabase.from("users").delete().eq("id", userId);
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ 
        message: "Account deleted successfully" 
      }), { 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }


    return new Response(JSON.stringify({ error: "Not found", path }), { 
      status: 404, 
      headers: { ...cors, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  }
});

const mapSupabaseCourse = (course: any) => {
  if (!course) return null;
  
  // If we have a 'doc' field, it contains the full original document
  // We prioritize it to ensure no data is lost from the migration
  const base = course.doc || {};
  
  return {
    _id: course.id || base._id?.$oid || base.id,
    slug: course.slug || base.slug,
    name: course.name || base.name,
    imageUrl: course.image?.url || base.image?.url || (base.image && base.image.secure_url) || null,
    modulesCount: course.stats?.modules || base.stats?.modules || (base.modules ? base.modules.length : 0),
    enrolledCount: (() => {
        const val = course.stats?.learners || base.stats?.learners;
        if (val) return val;
        
        // Fallback: parse from hero.enrolledText
        const text = course.hero?.enrolledText || base.hero?.enrolledText || course.hero?.enrolled_text || base.hero?.enrolled_text;
        if (text) {
            const match = text.match(/([\d,\.]+[kK]?)/);
            if (match) {
                 let numStr = match[1].replace(/,/g, "");
                 if (numStr.toLowerCase().endsWith("k")) {
                     return parseFloat(numStr) * 1000;
                 }
                 return parseFloat(numStr);
            }
        }
        return 0;
    })(),
    programme: course.programme || base.programme,
    programmeSlug: course.programme_slug || base.programmeSlug,
    courseSlug: course.course_slug || base.courseSlug,
    subtitle: course.subtitle || base.subtitle || base.hero?.subtitle,
    focus: course.focus || base.focus,
    placementRange: course.placement_range || base.placementRange,
    price: course.price || base.price,
    priceINR: course.price_inr || base.priceINR || base.hero?.priceINR || 0,
    level: course.level || base.level || base.stats?.level,
    duration: course.duration || base.duration || base.stats?.duration,
    mode: course.mode || base.mode || base.stats?.mode,
    outcomeSummary: course.outcome_summary || base.outcomeSummary,
    finalAward: course.final_award || base.finalAward,
    assessmentMaxAttempts: course.assessment_max_attempts || base.assessmentMaxAttempts || 3,
    isVisible: course.is_visible !== undefined ? course.is_visible : (base.isVisible !== undefined ? base.isVisible : true),
    order: course.order || course.sort_order || base.order,
    weeks: course.weeks || base.weeks || [],
    partners: course.partner_schema || base.partners || [],
    certifications: course.certifications || base.certifications || [],
    hero: course.hero || base.hero || {},
    stats: course.stats || base.stats || {},
    aboutProgram: course.about_program || base.aboutProgram || [],
    learn: course.learn || base.learn || [],
    skills: course.skills || base.skills || [],
    approvals: course.approvals || base.approvals || [],
    deliverables: course.deliverables || base.deliverables || [],
    outcomes: course.outcomes || base.outcomes || [],
    capstonePoints: course.capstone_points || base.capstonePoints || [],
    careerOutcomes: course.career_outcomes || base.careerOutcomes || [],
    toolsFrameworks: course.tools_frameworks || base.toolsFrameworks || [],
    targetAudience: course.target_audience || base.targetAudience || [],
    prereqsList: course.prereqs_list || base.prereqsList || [],
    modules: course.modules || base.modules || [],
    instructors: course.instructors || base.instructors || [],
    offeredBy: course.offered_by || base.offeredBy || {},
    capstone: course.capstone || base.capstone || {},
    image: course.image || base.image || {},
    media: course.media || base.media || {},
    createdAt: course.created_at || base.createdAt?.$date || base.createdAt,
    updatedAt: course.updated_at || base.updatedAt?.$date || base.updatedAt,
    details: base.details || {}, 
  };
};
