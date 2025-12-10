const { Expo } = require('expo-server-sdk');
const mongoose = require('mongoose');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification'); // [NEW] Import Model

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
    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    }).populate('user', 'pushToken firstName email');

    console.log(`[Notification] Found ${enrollments.length} active enrollments.`);

    // 2. Extract valid tokens
    let messages = [];
    for (const enrollment of enrollments) {
      if (!enrollment.user) {
        console.log(`[Notification] Enrollment ${enrollment._id} has no user linked.`);
        continue;
      }
      if (!enrollment.user.pushToken) {
        console.log(`[Notification] User ${enrollment.user.email} (ID: ${enrollment.user._id}) has no push token.`);
        continue;
      }
      if (!Expo.isExpoPushToken(enrollment.user.pushToken)) {
        console.log(`[Notification] User ${enrollment.user.email} has invalid token: ${enrollment.user.pushToken}`);
        continue;
      }

      messages.push({
        to: enrollment.user.pushToken,
        sound: 'default',
        title: title || 'New Live Class',
        body: body || 'A live session is starting now!',
        data: data || {},
      });

      // [NEW] Persist to Database
      try {
        await Notification.create({
          user: enrollment.user._id,
          title: title || 'New Live Class',
          body: body || 'A live session is starting now!',
          data: data || {},
        });
      } catch (dbErr) {
        console.error(`[Notification] Failed to save to DB for user ${enrollment.user._id}`, dbErr);
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
        console.log('[Notification] Expo API Response:', JSON.stringify(ticketChunk, null, 2));
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
