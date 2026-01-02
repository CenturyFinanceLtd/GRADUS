/// <reference lib="deno.ns" />
/**
 * Live Class API Edge Function
 * Handles 100ms room creation, token generation, and room codes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
            const { name, description } = body;
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

        return jsonResponse({ error: "Not found", success: false }, 404, cors);

    } catch (error) {
        console.error("[live-class-api] Error:", error);
        return jsonResponse({
            error: error instanceof Error ? error.message : "Internal server error",
            success: false,
        }, 500, cors);
    }
});
