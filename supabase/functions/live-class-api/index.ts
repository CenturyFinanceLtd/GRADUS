/// <reference lib="deno.ns" />
/**
 * Live Class API Edge Function
 * Handles 100ms room creation, token generation, and room codes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

// ============================================================================
// CORS & Helpers
// ============================================================================

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

function jsonResponse(data: any, status = 200, cors: any) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
    });
}

// ============================================================================
// 100ms Helper Functions
// ============================================================================

const HMS_ACCESS_KEY = Deno.env.get("HMS_ACCESS_KEY") || "";
const HMS_SECRET = Deno.env.get("HMS_SECRET") || "";
const HMS_TEMPLATE_ID = Deno.env.get("HMS_TEMPLATE_ID") || "";

async function generateManagementToken(): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(HMS_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        access_key: HMS_ACCESS_KEY,
        type: "management",
        version: 2,
        iat: now,
        nbf: now,
        exp: now + 86400, // 24 hours
        jti: crypto.randomUUID(),
    };

    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

async function generateAuthToken(roomId: string, userId: string, role: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(HMS_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        access_key: HMS_ACCESS_KEY,
        type: "app",
        version: 2,
        room_id: roomId,
        user_id: userId,
        role: role,
        iat: now,
        nbf: now,
        exp: now + 86400, // 24 hours
        jti: crypto.randomUUID(),
    };

    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

async function createRoom(name: string, description?: string): Promise<any> {
    const managementToken = await generateManagementToken();
    const safeName = name.replace(/[^a-zA-Z0-9.\-_:]/g, '_').substring(0, 60);

    const response = await fetch("https://api.100ms.live/v2/rooms", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${managementToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: safeName,
            description: description || "Live Class Session",
            template_id: HMS_TEMPLATE_ID,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create room: ${error}`);
    }

    return await response.json();
}

async function createRoomCodes(roomId: string): Promise<any> {
    const managementToken = await generateManagementToken();
    const response = await fetch(`https://api.100ms.live/v2/room-codes/room/${roomId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${managementToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create room codes: ${error}`);
    }

    return await response.json();
}

async function listRooms(): Promise<any> {
    const managementToken = await generateManagementToken();
    const response = await fetch("https://api.100ms.live/v2/rooms?enabled=true", {
        method: "GET",
        headers: { "Authorization": `Bearer ${managementToken}` },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to list rooms: ${error}`);
    }

    return await response.json();
}

async function disableRoom(roomId: string): Promise<any> {
    const managementToken = await generateManagementToken();
    const response = await fetch(`https://api.100ms.live/v2/rooms/${roomId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${managementToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: false }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to disable room: ${error}`);
    }

    return await response.json();
}

async function getRoomCodes(roomId: string): Promise<any> {
    const managementToken = await generateManagementToken();
    const response = await fetch(`https://api.100ms.live/v2/room-codes/room/${roomId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${managementToken}` },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get room codes: ${error}`);
    }

    return await response.json();
}

// ============================================================================
// Notification Helper
// ============================================================================

async function sendLiveClassNotifications(
    courseSlug: string,
    roomId: string,
    courseName: string,
    codes: Record<string, string>
): Promise<void> {
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        
        if (!supabaseUrl || !supabaseServiceKey) {
            console.warn("[Notifications] Supabase credentials not configured");
            return;
        }

        // Create Supabase client
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Find course by slug
        const { data: course, error: courseError } = await supabase
            .from("course")
            .select("id, name")
            .eq("slug", courseSlug)
            .single();

        if (courseError || !course) {
            console.error(`[Notifications] Course not found: ${courseSlug}`, courseError);
            return;
        }

        // 2. Find all active enrollments for this course
        const { data: enrollments, error: enrollError } = await supabase
            .from("enrollments")
            .select(`
                user_id,
                users!inner(
                    id,
                    email,
                    push_token
                )
            `)
            .eq("course_id", course.id)
            .eq("status", "ACTIVE")
            .eq("payment_status", "PAID");

        if (enrollError) {
            console.error(`[Notifications] Failed to fetch enrollments:`, enrollError);
            return;
        }

        if (!enrollments || enrollments.length === 0) {
            console.log(`[Notifications] No enrolled students found for course: ${courseSlug}`);
            return;
        }

        // 3. Get student code for join link
        const studentCode = codes.student || codes.guest || codes.viewer || null;
        const domainConfig = Deno.env.get("HMS_SYSTEM_SUBDOMAIN") || "gradus.app.100ms.live";
        const fullDomain = domainConfig.includes(".") ? domainConfig : `${domainConfig}.app.100ms.live`;
        const joinUrl = studentCode ? `https://${fullDomain}/meeting/${studentCode}` : null;

        // 4. Create notifications for each enrolled student
        const notifications = enrollments.map((enrollment: any) => ({
            user_id: enrollment.user_id || enrollment.users?.id,
            title: "🎥 Live Class Started!",
            body: `${courseName} - Join now!`,
            data: {
                type: "live_class",
                roomId: roomId,
                courseSlug: courseSlug,
                courseName: courseName,
                joinUrl: joinUrl,
            },
            read: false,
        })).filter((n: any) => n.user_id);

        if (notifications.length > 0) {
            const { error: notifError } = await supabase
                .from("notifications")
                .insert(notifications);

            if (notifError) {
                console.error(`[Notifications] Failed to create notifications:`, notifError);
            } else {
                console.log(`[Notifications] Created ${notifications.length} notifications for course: ${courseSlug}`);
            }
        }

        // 5. Send push notifications via Expo (if configured)
        const expoPushTokens = enrollments
            .map((e: any) => e.users?.push_token)
            .filter((token: string) => token && token.startsWith("ExponentPushToken"));

        if (expoPushTokens.length > 0) {
            try {
                const expoUrl = "https://exp.host/--/api/v2/push/send";
                const messages = expoPushTokens.map((token: string) => ({
                    to: token,
                    sound: "default",
                    title: "🎥 Live Class Started!",
                    body: `${courseName} - Join now!`,
                    data: {
                        type: "live_class",
                        roomId: roomId,
                        courseSlug: courseSlug,
                        courseName: courseName,
                        joinUrl: joinUrl,
                    },
                }));

                // Send in chunks of 100
                for (let i = 0; i < messages.length; i += 100) {
                    const chunk = messages.slice(i, i + 100);
                    await fetch(expoUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        body: JSON.stringify(chunk),
                    });
                }

                console.log(`[Notifications] Sent ${expoPushTokens.length} push notifications`);
            } catch (pushError) {
                console.error(`[Notifications] Push notification error:`, pushError);
            }
        }

    } catch (error) {
        console.error("[Notifications] Error sending live class notifications:", error);
    }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
    const cors = getCorsHeaders(req) as any;

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: cors });
    }

    // Check if 100ms is configured
    if (!HMS_ACCESS_KEY || !HMS_SECRET) {
        return jsonResponse({ error: "100ms not configured", success: false }, 503, cors);
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname.replace(/\/$/, "");
        const pathParts = path.split("/").filter(Boolean);

        // Remove "live-class-api" prefix from path
        const apiPath = "/" + pathParts.slice(pathParts.indexOf("live-class-api") + 1).join("/");

        // 1. POST /create-room
        if (apiPath === "/create-room" && req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            const { name, description, courseSlug, courseName } = body;
            const roomName = name || `live-class-${Date.now()}`;

            const room = await createRoom(roomName, description);
            let codesData = [];
            try {
                const codesRes = await createRoomCodes(room.id);
                codesData = codesRes.data || [];
            } catch (err) {
                console.error("Failed to create room codes (ignoring):", err);
            }

            const codesMap: Record<string, string> = {};
            codesData.forEach((c: any) => { codesMap[c.role] = c.code; });

            // Send notifications to enrolled students if courseSlug is provided
            if (courseSlug) {
                try {
                    await sendLiveClassNotifications(courseSlug, room.id, courseName || roomName, codesMap);
                } catch (notifErr) {
                    console.error("[live-class-api] Notification error (non-blocking):", notifErr);
                }
            }

            return jsonResponse({
                success: true,
                room: {
                    id: room.id,
                    name: room.name,
                    enabled: room.enabled,
                    createdAt: room.created_at,
                    codes: codesMap,
                },
            }, 200, cors);
        }

        // 2. POST /get-token
        if (apiPath === "/get-token" && req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            const { roomId, userId, role } = body;

            if (!roomId || !userId || !role) {
                return jsonResponse({ error: "roomId, userId, and role are required", success: false }, 400, cors);
            }

            const token = await generateAuthToken(roomId, userId, role);
            return jsonResponse({ success: true, token: token, roomId: roomId }, 200, cors);
        }

        // 3. GET /rooms
        if (apiPath === "/rooms" && req.method === "GET") {
            const result = await listRooms();
            return jsonResponse({ success: true, rooms: result.data || [] }, 200, cors);
        }

        // 4. GET /get-room-codes/:roomId
        if (apiPath.startsWith("/get-room-codes/") && req.method === "GET") {
            const roomId = apiPath.split("/").pop();
            if (!roomId) return jsonResponse({ error: "roomId is required", success: false }, 400, cors);

            const codesRes = await getRoomCodes(roomId);
            const codesData = codesRes.data || [];
            const codesMap: Record<string, string> = {};
            codesData.forEach((c: any) => { codesMap[c.role] = c.code; });

            return jsonResponse({ success: true, codes: codesMap }, 200, cors);
        }

        // 5. POST /end-room/:roomId
        if (apiPath.startsWith("/end-room/") && req.method === "POST") {
            const roomId = apiPath.split("/").pop();
            if (!roomId) return jsonResponse({ error: "roomId is required", success: false }, 400, cors);

            await disableRoom(roomId);
            return jsonResponse({ success: true, message: "Room session ended" }, 200, cors);
        }

        // 6. GET /active-classes - Get active live classes for enrolled students
        if (apiPath === "/active-classes" && req.method === "GET") {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader) {
                return jsonResponse({ error: "Authorization required", success: false }, 401, cors);
            }

            try {
                const token = authHeader.replace("Bearer ", "");
                const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
                const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
                const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me";
                
                const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
                const supabase = createClient(supabaseUrl, supabaseAnonKey);

                // Get user ID - try Supabase auth first, then JWT
                let userId: string | null = null;
                
                // Try Supabase Auth
                const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser(token);
                if (sbUser) {
                    userId = sbUser.id;
                } else {
                    // Try Custom JWT Verification
                    try {
                        const encoder = new TextEncoder();
                        const key = await crypto.subtle.importKey(
                            "raw",
                            encoder.encode(JWT_SECRET),
                            { name: "HMAC", hash: "SHA-256" },
                            false,
                            ["verify"]
                        );
                        const payload = await verify(token, key);
                        userId = (payload as any).id || (payload as any).sub;
                    } catch (jwtErr) {
                        console.error("[live-class-api] Auth failed:", authError, jwtErr);
                        return jsonResponse({ error: "Unauthorized", success: false }, 401, cors);
                    }
                }

                if (!userId) {
                    return jsonResponse({ error: "Unauthorized", success: false }, 401, cors);
                }

                // Get user's enrollments (use service role for query)
                const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey);
                const { data: enrollments, error: enrollError } = await supabaseService
                    .from("enrollments")
                    .select("course_id, course:course!inner(id, slug, name, image)")
                    .eq("user_id", userId)
                    .eq("status", "ACTIVE")
                    .eq("payment_status", "PAID");

                if (enrollError || !enrollments || enrollments.length === 0) {
                    return jsonResponse({ success: true, classes: [] }, 200, cors);
                }

                const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean);
                
                // Get all active rooms
                const roomsResult = await listRooms();
                const activeRooms = (roomsResult.data || []).filter((r: any) => r.enabled === true);

                // Match rooms to enrolled courses by checking room name/description for course slugs
                const liveClasses: any[] = [];
                for (const room of activeRooms) {
                    const roomName = room.name || "";
                    const roomDesc = room.description || "";
                    
                    // Try to find matching course
                    for (const enrollment of enrollments) {
                        const course = enrollment.course;
                        if (!course) continue;
                        
                        const courseSlug = course.slug || "";
                        const courseName = course.name || "";
                        
                        // Check if room name/description contains course identifier
                        if (courseSlug && (roomName.includes(courseSlug) || roomDesc.includes(courseSlug) || 
                            roomName.includes(courseName) || roomDesc.includes(courseName))) {
                            
                            // Get room codes
                            let codes: Record<string, string> = {};
                            try {
                                const codesRes = await getRoomCodes(room.id);
                                const codesData = codesRes.data || [];
                                codesData.forEach((c: any) => { codes[c.role] = c.code; });
                            } catch (err) {
                                console.error(`Failed to get codes for room ${room.id}:`, err);
                            }

                            const studentCode = codes.student || codes.guest || codes.viewer;
                            const domainConfig = Deno.env.get("HMS_SYSTEM_SUBDOMAIN") || "gradus.app.100ms.live";
                            const fullDomain = domainConfig.includes(".") ? domainConfig : `${domainConfig}.app.100ms.live`;
                            const joinUrl = studentCode ? `https://${fullDomain}/meeting/${studentCode}` : null;

                            liveClasses.push({
                                roomId: room.id,
                                roomName: room.name,
                                courseId: course.id,
                                courseSlug: courseSlug,
                                courseName: courseName,
                                courseImage: course.image?.url || null,
                                joinUrl: joinUrl,
                                startedAt: room.created_at,
                            });
                            break; // Found match, move to next room
                        }
                    }
                }

                return jsonResponse({ success: true, classes: liveClasses }, 200, cors);
            } catch (error) {
                console.error("[live-class-api] Error fetching active classes:", error);
                return jsonResponse({ 
                    error: error instanceof Error ? error.message : "Internal server error", 
                    success: false 
                }, 500, cors);
            }
        }

        return jsonResponse({ error: "Not found", success: false }, 404, cors);

    } catch (error) {
        console.error("[live-class-api] Error:", error);
        return jsonResponse({
            error: error instanceof Error ? error.message : "Internal server error",
            success: false,
        }, 500, cors);
    }
});
