/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
      let pd = user.personal_details;
      if (typeof pd === 'string') {
        try {
          pd = JSON.parse(pd);
        } catch (e) {
          console.warn("Failed to parse personal_details", e);
          pd = {};
        }
      }
      return {
        ...user,
        firstName: user.first_name,
        lastName: user.last_name,
        personalDetails: pd || {},
        emailVerified: user.email_verified,
        authProvider: user.auth_provider
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
        console.log("Looking up user by email:", email);

        const { data: byEmail, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (byEmail) {
          user = byEmail;
          error = emailError;
        } else {
          console.log("No user row found for email; creating new profile row.");

          const firstName =
            (sbUser.user_metadata as any)?.first_name ||
            (sbUser.user_metadata as any)?.full_name?.split(" ")[0] ||
            "";
          const lastName =
            (sbUser.user_metadata as any)?.last_name ||
            (sbUser.user_metadata as any)?.full_name?.split(" ").slice(1).join(" ") ||
            "";

          const { data: inserted, error: insertError } = await supabase
            .from("users")
            .insert({
              email,
              first_name: firstName,
              last_name: lastName,
              // If supabase_id column exists this will populate it;
              // if not, Supabase will throw which we handle below.
              supabase_id: userId,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Failed to auto-create user profile row:", insertError);
            return new Response(
              JSON.stringify({ error: "Failed to create user profile" }),
              {
                status: 500,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }

          user = inserted;
          error = null;
        }
      } else {
        // Legacy JWT users: look up by id as before
        const { data: byLegacyId, error: legacyError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        user = byLegacyId;
        error = legacyError;
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
      const updates: any = {};

      if (body.firstName !== undefined) updates.first_name = body.firstName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.mobile !== undefined) updates.mobile = body.mobile;
      if (body.personalDetails !== undefined) updates.personal_details = JSON.stringify(body.personalDetails);

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
        .eq("user_id", userId);

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
            .eq("user_id", userId);
            
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
              course: courseData || null 
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

    // POST /wipe-all-data - ADMIN UTILITY TO WIPE EVERYTHING
    if (path.endsWith("/wipe-all-data") && req.method === "POST") {
      console.log("Wiping all data...");
      
      // 1. Delete all rows from public tables (Order matters for FK)
      await supabase.from("enrollments").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Hack to delete all
      await supabase.from("tickets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("verification_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // 2. Delete all Auth Users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const deletePromises = users.map((u) => supabase.auth.admin.deleteUser(u.id));
      await Promise.all(deletePromises);

      return new Response(JSON.stringify({ message: `Wiped ${users.length} auth users and public data.` }), { 
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
