const { Expo } = require("expo-server-sdk");
const supabase = require("../config/supabase");
const notificationService = require("../services/notificationService");

let expo = new Expo();

/**
 * Send push notification to all students enrolled in a course
 * @param {string} courseId - The course ID
 * @param {object} notification - The notification payload { title, body, data }
 */
const sendCourseNotification = async (courseId, { title, body, data }) => {
  try {
    // 1. Find all active enrollments for the course
    console.log(`[Notification] Querying enrollments for course: ${courseId}`);

    // We need to fetch users who are enrolled in this course and have a push token
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select(
        `
        user:users (
          id,
          email,
          push_token
        )
      `
      )
      .eq("course_id", courseId) // Assuming UUID
      .eq("status", "ACTIVE")
      .eq("payment_status", "PAID");

    if (error) {
      console.error(
        `[Notification] Failed to query enrollments: ${error.message}`
      );
      return;
    }

    console.log(
      `[Notification] Found ${enrollments?.length || 0} active enrollments.`
    );

    // 2. Extract valid tokens
    let messages = [];
    for (const enrollment of enrollments || []) {
      const user = enrollment.user;
      if (!user) {
        // console.log(`[Notification] Enrollment has no user linked.`);
        continue;
      }

      const pushToken = user.push_token;

      if (!pushToken) {
        // console.log(`[Notification] User ${user.email} (ID: ${user.id}) has no push token.`);
        // Still save in-app notification below
      } else if (!Expo.isExpoPushToken(pushToken)) {
        console.log(
          `[Notification] User ${user.email} has invalid token: ${pushToken}`
        );
      } else {
        messages.push({
          to: pushToken,
          sound: "default",
          title: title || "New Live Class",
          body: body || "A live session is starting now!",
          data: data || {},
        });
      }

      // [NEW] Persist to Database via Supabase
      try {
        await notificationService.createNotification(user.id, {
          title: title || "New Live Class",
          body: body || "A live session is starting now!",
          data: data || {},
        });
      } catch (dbErr) {
        console.error(
          `[Notification] Failed to save to DB for user ${user.id}`,
          dbErr
        );
      }
    }

    if (messages.length === 0) {
      console.log(
        `[Notification] No subscribed users with tokens found for course ${courseId}`
      );
      return;
    }

    // 3. Chunk and send
    let chunks = expo.chunkPushNotifications(messages);

    console.log(`[Notification] Sending ${messages.length} notifications...`);

    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(
          "[Notification] Expo API Response:",
          JSON.stringify(ticketChunk, null, 2)
        );
      } catch (error) {
        console.error("[Notification] Error sending chunks", error);
      }
    }
  } catch (error) {
    console.error("[Notification] Failed to send course notifications:", error);
  }
};

/**
 * Send a simple in-app notification to a single user (no push).
 * Safe to call from anywhere; errors are swallowed with a console log.
 */
const sendUserNotification = async (userId, { title, body, data }) => {
  if (!userId || !title || !body) {
    return;
  }
  try {
    await notificationService.createNotification(userId, {
      title,
      body,
      data: data || {},
    });
  } catch (error) {
    console.error("[Notification] Failed to create user notification", {
      userId,
      error,
    });
  }
};

module.exports = { sendCourseNotification, sendUserNotification };
