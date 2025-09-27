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

const listContactInquiries = asyncHandler(async (req, res) => {
  const { search } = req.query || {};

  const filter = {};

  if (search && search.trim()) {
    const normalizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(normalizedSearch, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { region: regex },
      { institution: regex },
      { course: regex },
      { message: regex },
    ];
  }

  const inquiries = await ContactInquiry.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const items = inquiries.map((inquiry) => ({
    id: inquiry._id.toString(),
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    region: inquiry.region,
    institution: inquiry.institution,
    course: inquiry.course,
    message: inquiry.message,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  }));

  res.json({
    items,
    total: items.length,
  });
});

module.exports = {
  createContactInquiry,
  listContactInquiries,
};
