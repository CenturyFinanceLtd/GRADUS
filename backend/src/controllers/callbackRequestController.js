const CallbackRequest = require('../models/CallbackRequest');
const { sendEmail } = require('../utils/email');

// @desc    Create a new callback request
// @route   POST /api/callback-requests
// @access  Private
const createCallbackRequest = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user._id;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Please provide name, email, and phone number' });
    }

    const callbackRequest = await CallbackRequest.create({
      userId,
      name,
      email,
      phone
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Callback Request Received - Gradus',
      text: `Hi ${name},\n\nWe have received your callback request. Our team will contact you shortly.\n\nRegards,\nTeam Gradus`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0f5ad8;">Callback Request Received</h2>
          <p>Hi ${name},</p>
          <p>We have received your request for a callback. Our team will contact you shortly at <strong>${phone}</strong>.</p>
          <p>Regards,<br/>Team Gradus</p>
        </div>
      `
    });

    // Send notification email to admin
    await sendEmail({
      to: 'contact@gradusindia.in',
      subject: 'New Callback Request',
      text: `New callback request from ${name}.\n\nDetails:\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nUser ID: ${userId}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0f5ad8;">New Callback Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    res.status(201).json(callbackRequest);
  } catch (error) {
    console.error('Error creating callback request:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all callback requests
// @route   GET /api/callback-requests
// @access  Private/Admin
const listCallbackRequests = async (req, res) => {
  try {
    const requests = await CallbackRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching callback requests:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createCallbackRequest,
  listCallbackRequests
};
