const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

let expo = new Expo();

/**
 * Send push notification to all students enrolled in a course
 * @param {string} courseId - The course ID
 * @param {object} notification - The notification payload { title, body, data }
 */
const sendCourseNotification = async (courseId, { title, body, data }) => {
  try {
    // 1. Find all active enrollments for the course
    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    }).populate('user', 'pushToken');

    // 2. Extract valid tokens
    let messages = [];
    for (const enrollment of enrollments) {
      if (enrollment.user && enrollment.user.pushToken && Expo.isExpoPushToken(enrollment.user.pushToken)) {
        messages.push({
          to: enrollment.user.pushToken,
          sound: 'default',
          title: title || 'New Live Class',
          body: body || 'A live session is starting now!',
          data: data || {},
        });
      }
    }

    if (messages.length === 0) {
      console.log(`[Notification] No subscribed users with tokens found for course ${courseId}`);
      return;
    }

    // 3. Chunk and send
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    
    console.log(`[Notification] Sending ${messages.length} notifications...`);
    
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[Notification] Error sending chunks', error);
      }
    }
  } catch (error) {
    console.error('[Notification] Failed to send course notifications:', error);
  }
};

module.exports = { sendCourseNotification };
