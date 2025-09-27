const asyncHandler = require('express-async-handler');
const ContactInquiry = require('../models/ContactInquiry');

const createContactInquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, region, institution, course, message } = req.body || {};

  if (!name || !email || !phone || !region || !institution || !course || !message) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const inquiry = await ContactInquiry.create({
    name,
    email,
    phone,
    region,
    institution,
    course,
    message,
  });

  res.status(201).json({
    message: 'Inquiry submitted successfully',
    inquiryId: inquiry._id,
  });
});

module.exports = {
  createContactInquiry,
};
