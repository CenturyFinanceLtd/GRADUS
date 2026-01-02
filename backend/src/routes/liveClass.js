/*
  Live Class Routes
  - Simple endpoints for 100ms room creation and token generation
*/
const express = require("express");
const router = express.Router();
const HMS = require("@100mslive/server-sdk");

// Initialize 100ms SDK
let hms = null;
try {
    if (process.env.HMS_ACCESS_KEY && process.env.HMS_SECRET) {
        hms = new HMS.SDK(process.env.HMS_ACCESS_KEY, process.env.HMS_SECRET);
    }
} catch (error) {
    console.error("[100ms] Failed to initialize SDK:", error.message);
}

// Create a new room
router.post("/create-room", async (req, res) => {
    try {
        if (!hms) {
            return res.status(503).json({ error: "100ms not configured" });
        }

        const { name, description } = req.body;
        const roomName = name || `live-class-${Date.now()}`;

        // Create room using 100ms API
        const room = await hms.rooms.create({
            name: roomName,
            description: description || "Live Class Session",
            template_id: process.env.HMS_TEMPLATE_ID,
        });

        res.json({
            success: true,
            room: {
                id: room.id,
                name: room.name,
                enabled: room.enabled,
                createdAt: room.created_at,
            },
        });
    } catch (error) {
        console.error("[100ms] Create room error:", error);
        res.status(500).json({ error: error.message || "Failed to create room" });
    }
});

// Get auth token for joining a room
router.post("/get-token", async (req, res) => {
    try {
        if (!hms) {
            return res.status(503).json({ error: "100ms not configured" });
        }

        const { roomId, userId, role, userName } = req.body;

        if (!roomId || !userId || !role) {
            return res.status(400).json({ error: "roomId, userId, and role are required" });
        }

        // Generate auth token
        const token = await hms.auth.getAuthToken({
            roomId: roomId,
            userId: userId,
            role: role, // 'host' or 'guest'
        });

        res.json({
            success: true,
            token: token,
            roomId: roomId,
        });
    } catch (error) {
        console.error("[100ms] Get token error:", error);
        res.status(500).json({ error: error.message || "Failed to generate token" });
    }
});

// List active rooms
router.get("/rooms", async (req, res) => {
    try {
        if (!hms) {
            return res.status(503).json({ error: "100ms not configured" });
        }

        const rooms = await hms.rooms.list({ enabled: true });
        res.json({
            success: true,
            rooms: rooms.data || [],
        });
    } catch (error) {
        console.error("[100ms] List rooms error:", error);
        res.status(500).json({ error: error.message || "Failed to list rooms" });
    }
});

// End a room session
router.post("/end-room/:roomId", async (req, res) => {
    try {
        if (!hms) {
            return res.status(503).json({ error: "100ms not configured" });
        }

        const { roomId } = req.params;

        // Disable the room to end the session
        await hms.rooms.update(roomId, { enabled: false });

        res.json({
            success: true,
            message: "Room session ended",
        });
    } catch (error) {
        console.error("[100ms] End room error:", error);
        res.status(500).json({ error: error.message || "Failed to end room" });
    }
});

module.exports = router;
