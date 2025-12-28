/// <reference lib="deno.ns" />
// Force deploy v2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  // CRITICAL: Echo the origin exactly, or fallback to a known safe one. 
  // Never return "*" if credentials: include is used.
  const allowedOrigin = origin || "http://localhost:5173"; 

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const auth = req.headers.get("Authorization");
  console.log(`[PaymentAPI] Origin: ${origin}, Auth Present: ${!!auth}, Method: ${req.method}`);
  
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "X-Function-Version": "v3" } as any });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop(); 

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { 
        status: 401, 
        headers: { ...corsHeaders, "X-Debug-Auth-Status": "no_header", "Content-Type": "application/json" } as any 
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string | undefined;

    // Support dual token verification
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (user) {
        userId = user.id;
      } else {
        // Fallback to custom JWT
        const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me";
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        const payload = await verify(token, key) as any;
        userId = payload.id || payload.sub;
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders as any });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { 
          ...corsHeaders, 
          "X-Debug-Auth-Status": "userId_missing",
          "X-Debug-Token-Start": token.substring(0, 10),
          "Content-Type": "application/json"
        } as any 
      });
    }

    const body = await req.json().catch(() => ({}));
    
    // Configuration
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const GST_RATE = Number(Deno.env.get("RAZORPAY_GST_RATE") || 0.18);

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay not configured");
    }

    // --- Action: Create Order ---
    if (action === "create-order" || action === "course-order") {
        const { courseSlug } = body;
        
        // 1. Fetch Course
        const { data: course, error: cErr } = await supabaseClient
            .from("course")
            .select("*")
            .eq("slug", courseSlug)
            .single();

        if (cErr || !course) throw new Error("Course not found");

        // 2. Calculate Amount
        // Try price_inr first, fallback to doc.hero.priceINR, then doc.price
        const pInr = course.price_inr ?? course.doc?.hero?.priceINR ?? course.doc?.price ?? course.price;
        const basePrice = Number(String(pInr).replace(/[^0-9.]/g, ""));
        
        if (!basePrice || isNaN(basePrice)) {
            console.error("Invalid price for course:", courseSlug, pInr);
            throw new Error(`Invalid course price: ${pInr}`);
        }

        const basePaise = Math.round(basePrice * 100);
        const taxPaise = Math.ceil(basePaise * GST_RATE); // Use ceil to ensure at least some GST for small amounts
        const totalPaise = basePaise + taxPaise;

        // 3. Create Razorpay Order
        const receipt = `enr_edge_${Date.now().toString(36)}`;
        
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
            },
            body: JSON.stringify({
                amount: totalPaise,
                currency: "INR",
                receipt,
                notes: { userId, courseId: course.id }
            })
        });

        if (!rzpResponse.ok) {
            const err = await rzpResponse.text();
            throw new Error(`Razorpay Error: ${err}`);
        }

        const order = await rzpResponse.json();

        // 4. Create Enrollment Record
        console.log(`[PaymentAPI] Upserting enrollment: User ${userId}, Course ${course.id}`);
        const { error: upsertError } = await supabaseClient.from("enrollments").upsert({
            user_id: userId,
            course_id: course.id,
            course_slug: course.slug,
            status: "ACTIVE",
            payment_status: "PENDING",
            payment_gateway: "RAZORPAY",
            currency: "INR",
            price_base: Math.round(basePaise / 100),
            price_tax: Math.round(taxPaise / 100),
            price_total: Math.round(totalPaise / 100),
            razorpay_order_id: order.id,
            receipt,
            updated_at: new Date()
        }, { onConflict: "user_id,course_id" });

        if (upsertError) {
            console.error("[PaymentAPI] Upsert Error:", upsertError);
            throw new Error(`Enrollment upsert failed: ${upsertError.message}`);
        }
        console.log(`[PaymentAPI] Upsert success for order ${order.id}`);

        return new Response(JSON.stringify({
            keyId: RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            course: { slug: course.slug, name: course.name }
        }), { headers: { ...(getCorsHeaders(req) as any), "Content-Type": "application/json" } });
    }

    // --- Action: Verify ---
    if (action === "verify") {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
        console.log(`[PaymentAPI] Verify called for Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);
        
        // 1. Verify Signature
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
        const msgData = encoder.encode(text);

        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        const signatureHex = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        if (signatureHex !== razorpay_signature) {
             console.error(`[PaymentAPI] Signature mismatch! Expected: ${signatureHex}, Got: ${razorpay_signature}`);
             // Allow mock for dev if needed, logic omitted for brevity/security
            throw new Error("Invalid signature");
        }
        console.log("[PaymentAPI] Signature verified.");

        // 2. Update Enrollment
        const { error } = await supabaseClient
            .from("enrollments")
            .update({
                payment_status: "PAID",
                payment_reference: razorpay_payment_id,
                razorpay_payment_id,
                razorpay_signature,
                paid_at: new Date(),
                updated_at: new Date()
            })
            .eq("razorpay_order_id", razorpay_order_id);
            
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ status: "ok" }), { 
            headers: { ...(getCorsHeaders(req) as any), "Content-Type": "application/json" } 
        });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Payment Processing Error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 500,
      headers: { ...(getCorsHeaders(req) as any), "Content-Type": "application/json" },
    });
  }
});
