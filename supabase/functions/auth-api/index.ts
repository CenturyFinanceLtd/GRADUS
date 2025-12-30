/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowedOrigin = origin || "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me"; 

serve(async (req: Request) => {
  const cors = getCorsHeaders(req) as any;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, ""); 
    const segments = path.split("/").filter(Boolean);
    
    // Improved action detection:
    // If path is /functions/v1/auth-api/login -> segments=["functions", "v1", "auth-api", "login"]
    // If path is /auth-api/login -> segments=["auth-api", "login"]
    // We look for known actions in the last segment or second to last.
    
    // For specific sub-resources like password/reset, we use the `endsWith` checks below.
    // For top-level actions (login, signup, logout, enrollments, me), we can check the tail.
    const lastSegment = segments[segments.length - 1];
    let action = lastSegment; 

    // Handle /me (GET/PUT)
    if (path.endsWith("/me")) action = "me";
    // Handle /enrollments
    if (path.endsWith("/enrollments")) action = "enrollments";
    // Handle /logout
    if (path.endsWith("/logout")) action = "logout";
    // Handle /login
    if (path.endsWith("/login")) action = "login";
    // Handle /signup or /signup/start
    if (path.endsWith("/signup") || path.endsWith("/signup/start")) action = "signup";
    // Handle /verify or /signup/verify-otp
    if (path.endsWith("/verify") || path.endsWith("/verify-otp")) action = "verify";
    // Handle /complete-signup or /signup/complete
    if (path.endsWith("/complete-signup") || path.endsWith("/signup/complete")) action = "complete-signup";
    // Handle /social/google/onetap
    if (path.endsWith("/social/google/onetap")) action = "google-onetap";
    
    // Handle /supabase/create-profile special case
    if (path.endsWith("/create-profile") && segments.includes("supabase")) action = "supabase-create-profile";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Helper to map DB user to Frontend expected format
    const mapUserToFrontend = (user: any) => ({
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      personalDetails: user.personal_details,
      emailVerified: user.email_verified,
      authProvider: user.auth_provider
    });

    const body = await req.json().catch(() => ({}));

    // 1. SIGNUP: POST /signup
    if (action === "signup") {
      const { email, firstName, lastName, mobile } = body;
      if (!email) throw new Error("Email required");
      
      const normalizedEmail = email.toLowerCase().trim();

      const { data: existing } = await supabase.from("users").select("id").eq("email", normalizedEmail).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "User already exists" }), { status: 409, headers: cors });
      }

      // Cleanup old sessions
      await supabase.from("verification_sessions").delete().eq("type", "SIGNUP").eq("email", normalizedEmail);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const payload = { firstName, lastName, mobile, personalDetails: body.personalDetails || {} };

      const { data: session, error: sErr } = await supabase.from("verification_sessions").insert([{
        type: "SIGNUP",
        email: normalizedEmail,
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        payload: JSON.stringify(payload) // Explicitly stringify to ensure text/jsonb compatibility
      }]).select().single();

      if (sErr) throw sErr;

      // Send Email via Edge Function using fetch for better error handling
      const emailResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: normalizedEmail,
          template: "otp",
          subject: "Verify your Gradus account",
          html: `<p>Your verification code is: <strong>${otp}</strong></p>`
        })
      });
      
      if (!emailResp.ok) {
        const errText = await emailResp.text();
        console.error("Email send failed:", errText);
        throw new Error("Failed to send OTP: " + errText);
      }

      return new Response(JSON.stringify({ sessionId: session.id, email: normalizedEmail }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 2. VERIFY: POST /verify
    if (action === "verify") {
       const { sessionId, otp } = body;
       const { data: session } = await supabase.from("verification_sessions").select("*").eq("id", sessionId).single();
       
       if (!session || session.status === "COMPLETED" || new Date(session.otp_expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 400, headers: cors });
       }

       const isMatch = await bcrypt.compare(otp, session.otp_hash);
       if (!isMatch) {
          return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 401, headers: cors });
       }

       const verificationToken = crypto.randomUUID();
       await supabase.from("verification_sessions").update({ status: "OTP_VERIFIED", verification_token: verificationToken }).eq("id", sessionId);

       return new Response(JSON.stringify({ sessionId, verificationToken }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 3. COMPLETE SIGNUP: POST /complete-signup
    if (action === "complete-signup") {
       const { sessionId, verificationToken, password } = body;
       // ... Validation logic ...
       const { data: session } = await supabase.from("verification_sessions").select("*").eq("id", sessionId).single();
       if (!session || session.verification_token !== verificationToken) throw new Error("Invalid session");

       const payload = session.payload || {};
       const email = session.email;
       const hashPass = await bcrypt.hash(password, 10); // Still storing hash in public.users for legacy compatibility if needed? Or just rely on Auth?
       // Let's store it to be safe/consistent with existing schema, although Auth handles it now.

       // 1. Create User in Supabase Auth
       const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
             first_name: payload.firstName,
             last_name: payload.lastName,
          }
       });

       if (authError) throw authError;

       // 2. Create User in public.users (Linked by ID)
       const { data: user, error: uErr } = await supabase.from("users").insert([{
          id: authUser.user.id, // CRITICAL: Link IDs
          email: session.email,
          password_hash: hashPass, // Optional now, but keeping for schema consistency
          first_name: payload.firstName,
          last_name: payload.lastName,
          mobile: payload.mobile,
          email_verified: true,
          personal_details: JSON.stringify(payload.personalDetails)
       }]).select().single();

       if (uErr) {
          console.error("Failed to create public user:", uErr);
          // Rollback Auth User if public insert fails (Manual Transaction)
          await supabase.auth.admin.deleteUser(authUser.user.id);
          throw new Error("Failed to create user profile: " + uErr.message);
       }
       
       // Cleanup
       await supabase.from("verification_sessions").delete().eq("id", sessionId);

       // Return success (Frontend will perform login)
       return new Response(JSON.stringify({ success: true, user: mapUserToFrontend(user) }), { status: 201, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 4. LOGIN: POST /login
    if (action === "login") {
       const { email, password } = body;
       console.log("Login attempt for:", email);
       
       const { data: user, error: userErr } = await supabase.from("users").select("*").eq("email", email.toLowerCase().trim()).maybeSingle();
       
       console.log("User found:", user ? "yes" : "no", "Error:", userErr?.message);
       
       if (!user || !user.password_hash) {
          console.log("No user or no password_hash");
          return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: cors });
       }

       console.log("Password hash exists, comparing...");
       const isMatch = await bcrypt.compare(password, user.password_hash);
       console.log("Password match:", isMatch);
       
       if (!isMatch) {
          return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: cors });
       }

       const token = await create({ alg: "HS256", typ: "JWT" }, { id: user.id, exp: getNumericDate(60 * 60 * 24 * 30) }, await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));

       return new Response(JSON.stringify({ token, user: mapUserToFrontend(user) }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 4.1 GOOGLE ONE-TAP: POST /social/google/onetap
    if (action === "google-onetap" && req.method === "POST") {
       const credential = body.credential || body.idToken || body.id_token;
       if (!credential) {
         return new Response(JSON.stringify({ error: "Missing Google credential" }), { status: 400, headers: cors });
       }

       const tokenInfoResp = await fetch(
         `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
       );

       if (!tokenInfoResp.ok) {
         const errText = await tokenInfoResp.text().catch(() => "Invalid Google token");
         return new Response(JSON.stringify({ error: "Invalid Google token", details: errText }), { status: 401, headers: cors });
       }

       const tokenInfo = await tokenInfoResp.json().catch(() => ({}));
       const email = (tokenInfo.email || "").toLowerCase().trim();

       if (!email) {
         return new Response(JSON.stringify({ error: "Google token missing email" }), { status: 400, headers: cors });
       }

       const allowedAudiences = (Deno.env.get("GOOGLE_CLIENT_IDS") || "")
         .split(",")
         .map((id) => id.trim())
         .filter(Boolean);

       if (allowedAudiences.length > 0 && tokenInfo.aud && !allowedAudiences.includes(tokenInfo.aud)) {
         return new Response(JSON.stringify({ error: "Google token audience mismatch" }), { status: 401, headers: cors });
       }

       const firstName = tokenInfo.given_name || (tokenInfo.name ? tokenInfo.name.split(" ")[0] : "");
       const lastName = tokenInfo.family_name || (tokenInfo.name ? tokenInfo.name.split(" ").slice(1).join(" ") : "");
       const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

       const { data: existing } = await supabase
         .from("users")
         .select("*")
         .eq("email", email)
         .maybeSingle();

       let user = existing;
       if (existing) {
         const updates: Record<string, unknown> = {};
         if (!existing.first_name && firstName) updates.first_name = firstName;
         if (!existing.last_name && lastName) updates.last_name = lastName;
         if (!existing.auth_provider) updates.auth_provider = "google";
         if (emailVerified && !existing.email_verified) updates.email_verified = true;

         if (Object.keys(updates).length > 0) {
           const { data: updated, error: uErr } = await supabase
             .from("users")
             .update(updates)
             .eq("id", existing.id)
             .select()
             .single();
           if (uErr) throw uErr;
           user = updated;
         }
       } else {
         const { data: created, error: cErr } = await supabase
           .from("users")
           .insert([{
             email,
             first_name: firstName,
             last_name: lastName,
             email_verified: emailVerified,
             auth_provider: "google",
           }])
           .select()
           .single();
         if (cErr) throw cErr;
         user = created;
       }

       const key = await crypto.subtle.importKey(
         "raw",
         new TextEncoder().encode(JWT_SECRET),
         { name: "HMAC", hash: "SHA-256" },
         false,
         ["sign", "verify"]
       );

       const token = await create(
         { alg: "HS256", typ: "JWT" },
         { id: user.id, exp: getNumericDate(60 * 60 * 24 * 30) },
         key
       );

       return new Response(JSON.stringify({ token, user: mapUserToFrontend(user) }), {
         headers: { ...cors, "Content-Type": "application/json" },
       });
    }

    // 5. LOGOUT: POST /logout
    if (action === "logout") {
       return new Response(JSON.stringify({ message: "Logged out" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 6. SYNC PROFILE: POST /supabase/create-profile
    if (action === "supabase-create-profile") {
       // Typically used by Hybrid Auth (Google/Supabase sign-ins) to sync to public.users
       const { supabaseId, email, firstName, lastName, mobile } = body;
       
       if (!email || !supabaseId) {
         return new Response(
           JSON.stringify({ error: "supabaseId and email are required" }),
           { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
         );
       }
       
       // Upsert by email, but always store/link the Supabase Auth user id
       const { data: user, error } = await supabase
         .from("users")
         .upsert(
           {
             email: email.toLowerCase().trim(),
             first_name: firstName,
             last_name: lastName,
             mobile,
             supabase_id: supabaseId,
           },
           { onConflict: "email" },
         )
         .select()
         .single();

       if (error) throw error;
       return new Response(JSON.stringify(user), {
         headers: { ...cors, "Content-Type": "application/json" },
       });
    }


    // 7. GET PROFILE: GET /me
    if (action === "me" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: cors });
      }
      
      const token = authHeader.replace("Bearer ", "");
      try {
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        const payload = await verify(token, key);
        const userId = payload.id;

        if (!userId) throw new Error("Invalid token payload");

        const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single();
        
        if (error || !user) {
           return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: cors });
        }

        return new Response(JSON.stringify(mapUserToFrontend(user)), { headers: { ...cors, "Content-Type": "application/json" } });

      } catch (e) {
         return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: cors });
      }
    }

    // 8. UPDATE PROFILE: PUT /me
    if (action === "me" && req.method === "PUT") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: cors });
      }
      
      const token = authHeader.replace("Bearer ", "");
      try {
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        const payload = await verify(token, key);
        const userId = payload.id;

        const body = await req.json().catch(() => ({}));
        const updates: any = {};
        
        if (body.firstName !== undefined) updates.first_name = body.firstName;
        if (body.lastName !== undefined) updates.last_name = body.lastName;
        if (body.mobile !== undefined) updates.mobile = body.mobile;
        if (body.personalDetails !== undefined) updates.personal_details = body.personalDetails;

        // Perform update
        const { error: updateError } = await supabase.from("users").update(updates).eq("id", userId);
        if (updateError) throw updateError;

        // Fetch updated user
        const { data: user, error: fetchError } = await supabase.from("users").select("*").eq("id", userId).single();
        if (fetchError || !user) {
           return new Response(JSON.stringify({ error: "User not found after update" }), { status: 404, headers: cors });
        }
        
        return new Response(JSON.stringify(mapUserToFrontend(user)), { headers: { ...cors, "Content-Type": "application/json" } });

      } catch (e) {
         return new Response(JSON.stringify({ error: "Update failed: " + e.message }), { status: 500, headers: cors });
      }
    }

    // 9. GET ENROLLMENTS: GET /enrollments
    if (action === "enrollments" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: cors });
      }

      const token = authHeader.replace("Bearer ", "");
      try {
         const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
         const payload = await verify(token, key);
         const userId = payload.id;

         // Fetch enrollments with course details
         const { data: enrollments, error } = await supabase
            .from("enrollments")
            .select("*, course:courses(*)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

         if (error) throw error;

         // Map to frontend format
         const items = (enrollments || []).map((e: any) => ({
             id: e.id,
             enrolledAt: e.created_at,
             status: e.status,
             paymentStatus: e.payment_status,
             priceTotal: e.price_total,
             course: {
                 name: e.course?.name,
                 slug: e.course?.slug,
                 // Map image. Legacy frontend expects imageUrl.
                 imageUrl: e.course?.image?.url || e.course?.image || "",
                 price: e.course?.price,
                 hero: e.course?.hero // for price fallback
             }
         }));

         return new Response(JSON.stringify({ items }), { headers: { ...cors, "Content-Type": "application/json" } });

      } catch (e) {
         return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
      }
    }


    // ROBUST ROUTING: Find action based on path tail
    // Support nested routes for password reset
    const isPasswordResetStart = path.endsWith("/password/reset/start");
    const isPasswordResetVerify = path.endsWith("/password/reset/verify-otp");
    const isPasswordResetComplete = path.endsWith("/password/reset/complete");

    // 10. FORGOT PASSWORD: START
    if (isPasswordResetStart && req.method === "POST") {
       const { email } = body;
       const normalizedEmail = (email || "").toLowerCase().trim();
       if (!normalizedEmail) return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: cors });

       // Check if user exists (optional security choice: return success even if not found to prevent enumeration? 
       // For this app, let's be explicitly helpful or vague based on preference. Code implies existing user check.
       const { data: user } = await supabase.from("users").select("id").eq("email", normalizedEmail).maybeSingle();
       
       if (user) {
         // Generate OTP
         const otp = Math.floor(100000 + Math.random() * 900000).toString();
         const otpHash = await bcrypt.hash(otp, 10);
         const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

         // Create session
         const { data: session, error: sErr } = await supabase.from("verification_sessions").insert([{
            type: "PASSWORD_RESET",
            email: normalizedEmail,
            otp_hash: otpHash,
            otp_expires_at: expiresAt,
            payload: {} 
         }]).select().single();

         if (sErr) throw sErr;

         // Send Email via Edge Function
         const emailResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
           method: "POST",
           headers: {
             "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
             "Content-Type": "application/json"
           },
           body: JSON.stringify({
             to: normalizedEmail,
             template: "otp",
             subject: "Reset your Gradus password",
             html: `<p>Your password reset code is: <strong>${otp}</strong></p>`
           })
         });
         
         if (!emailResp.ok) {
           const errText = await emailResp.text();
           console.error("Email send failed:", errText);
           return new Response(JSON.stringify({ error: "Failed to send email: " + errText }), { status: 500, headers: cors });
         }

         return new Response(JSON.stringify({ sessionId: session.id, message: "Verification code sent" }), { headers: { ...cors, "Content-Type": "application/json" } });
       } else {
         // User not found - fake a success to prevent enumeration (or just return success)
         // But the frontend logic checks for sessionId. If we don't return one, frontend expects a message.
         return new Response(JSON.stringify({ message: "If an account exists, a code has been sent." }), { headers: { ...cors, "Content-Type": "application/json" } });
       }
    }

    // 11. FORGOT PASSWORD: VERIFY OTP
    if (isPasswordResetVerify && req.method === "POST") {
        const { sessionId, otp } = body;
        if (!sessionId || !otp) return new Response(JSON.stringify({ error: "Missing session or OTP" }), { status: 400, headers: cors });

        const { data: session } = await supabase.from("verification_sessions").select("*").eq("id", sessionId).single();
        
        if (!session || session.status === "COMPLETED" || new Date(session.otp_expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 400, headers: cors });
        }

        const isMatch = await bcrypt.compare(otp, session.otp_hash);
        if (!isMatch) {
          return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 401, headers: cors });
        }

        const verificationToken = crypto.randomUUID();
        await supabase.from("verification_sessions").update({ status: "OTP_VERIFIED", verification_token: verificationToken }).eq("id", sessionId);

        return new Response(JSON.stringify({ sessionId, verificationToken }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 12. FORGOT PASSWORD: COMPLETE
    if (isPasswordResetComplete && req.method === "POST") {
        const { sessionId, verificationToken, password } = body;
        if (!sessionId || !verificationToken || !password) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: cors });

        const { data: session } = await supabase.from("verification_sessions").select("*").eq("id", sessionId).single();
        if (!session || session.verification_token !== verificationToken) {
           return new Response(JSON.stringify({ error: "Invalid session or token" }), { status: 400, headers: cors });
        }

        const hashPass = await bcrypt.hash(password, 10);
        
        // Update user
        const { error: uErr } = await supabase.from("users").update({
           password_hash: hashPass
        }).eq("email", session.email);

        if (uErr) throw uErr;

        // Cleanup
        await supabase.from("verification_sessions").delete().eq("id", sessionId);

        return new Response(JSON.stringify({ message: "Password updated successfully" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ 
      error: "Not found", 
      debug: { 
        path, 
        segments,
        action,
        method: req.method
      } 
    }), { status: 404, headers: cors });

  } catch (error) {
     return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});
