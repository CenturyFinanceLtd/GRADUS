/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowedOrigin = origin || "http://localhost:5173"; 

  // NOTE: credentials: "true" requires explicit origin, not wildcard.
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

serve(async (req) => {
  // Handle CORS for OPTIONS requests explicitly and early
  if (req.method === "OPTIONS") {
     return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const cors = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const { name, email, phone, state, qualification, program_name, landing_page_id, mentor_name, date, time, key_benefit } = await req.json();

      // Insert registration data
      const { data, error: insertError } = await supabase
        .from("landing_page_registrations")
        .insert([
          {
            name,
            email,
            phone,
            state,
            qualification,
            program_name,
            landing_page_id,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting registration:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { ...cors, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Determine Zoom Link and Banner Image based on Mentor Name
      let zoomLink = "#";
      let bannerImage = "";
      const normalizedMentorName = (mentor_name || "").toLowerCase().trim();
      const origin = req.headers.get("Origin") || "https://gradusindia.in"; // Fallback to production domain if missing

      // Sanitize origin to remove trailing slash if present
      const baseUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;

      if (normalizedMentorName.includes("vaibhav batra")) {
        zoomLink = "https://us06web.zoom.us/j/84317772672?pwd=adYOZ0oj0FAeEAvYiaZeUGPQLGZOe2.1";
        bannerImage = "email-banner-vaibhav.png";
      } else if (normalizedMentorName.includes("akhil pandey")) {
        zoomLink = "https://us06web.zoom.us/j/89785000556?pwd=Om0roPIrvSjf7Jk6nRfaRYAxRZSuXa.1";
        bannerImage = "email-banner-akhil.png";
      }

      const bannerHtml = bannerImage 
        ? `<div style="text-align: center; margin-bottom: 20px;">
             <img src="${baseUrl}/assets/${bannerImage}" alt="${mentor_name} Masterclass" style="max-width: 100%; height: auto; border-radius: 8px;" />
           </div>`
        : "";

      // Use dynamic Supabase URL for internal calls
      const functionsUrl = `${supabaseUrl}/functions/v1/send-email`;

      // Send Confirmation Email
      try {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
              ${bannerHtml}
              <p>Hi ${name},</p>
              <p>Thanks for registration. You’re invited to attend our FREE Masterclass, For exclusive users only!</p>
              
              <p><strong>📅 Date:</strong> ${date || "TBD"}<br>
              <strong>⏰ Time:</strong> ${time || "TBD"}</p>
              
              <p>In this session, <strong>${mentor_name || "our expert"}</strong> will share valuable insights and practical takeaways to help you <strong>${key_benefit || "gain financial literacy"}</strong>.</p>
              
              <p>🎟 Seats are limited—don’t miss out!</p>
              <p>👉 Joining Link : <a href="${zoomLink}">${zoomLink}</a></p>
              
              <p>We look forward to having you join us.</p>
              <p>Best Regards,<br>Team Gradus</p>
          </div>
        `;

        const emailResponse = await fetch(functionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `${program_name}: Registration Confirmed`,
            html: emailBody,
            from: "contact@gradusindia.in"
          }),
        });

        if (!emailResponse.ok) {
           const errText = await emailResponse.text();
           console.error("Failed to send email:", errText);
           // Return partial success or error? User likely wants to know if email failed.
           // However, registration IS successful. 
           // Let's include a warning in the response.
           return new Response(JSON.stringify({ ...data, emailStatus: 'failed', emailError: errText }), {
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      } catch (emailErr: any) {
        console.error("Email dispatch error:", emailErr);
        return new Response(JSON.stringify({ ...data, emailStatus: 'failed', emailError: emailErr.message }), {
            headers: { ...cors, "Content-Type": "application/json" },
          });
      }

      return new Response(JSON.stringify({ ...data, emailStatus: 'sent' }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});
