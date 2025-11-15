/*
  Admin email template controller
  - Allows authorized admins to view and update transactional email templates
*/
const asyncHandler = require('express-async-handler');
const EmailTemplate = require('../models/EmailTemplate');
const templateDefinitions = require('../data/emailTemplateDefinitions');
const { invalidateTemplateCache } = require('../services/emailTemplateService');

const serializeTemplate = (definition, record) => ({
  key: definition.key,
  name: definition.name,
  description: definition.description,
  variables: definition.variables,
  subject: record?.subject || definition.subject,
  html: record?.html || definition.html,
  text: record?.text || definition.text,
  updatedAt: record?.updatedAt || null,
  isCustomized: Boolean(record),
});

const listEmailTemplates = asyncHandler(async (req, res) => {
  const keys = Object.keys(templateDefinitions);
  const records = await EmailTemplate.find({ key: { $in: keys } }).lean();
  const recordMap = records.reduce((acc, record) => {
    acc[record.key] = record;
    return acc;
  }, {});

  const items = keys.map((key) => {
    const definition = templateDefinitions[key];
    const record = recordMap[key];

    return {
      key,
      name: definition.name,
      description: definition.description,
      variables: definition.variables,
      updatedAt: record?.updatedAt || null,
      isCustomized: Boolean(record),
    };
  });

  res.json({ items });
});

const getEmailTemplate = asyncHandler(async (req, res) => {
  const key = req.params.key;
  const definition = templateDefinitions[key];

  if (!definition) {
    res.status(404);
    throw new Error('Template not found');
  }

  const record = await EmailTemplate.findOne({ key }).lean();
  res.json({ item: serializeTemplate(definition, record) });
});

const upsertEmailTemplate = asyncHandler(async (req, res) => {
  const key = req.params.key;
  const definition = templateDefinitions[key];

  if (!definition) {
    res.status(404);
    throw new Error('Template not found');
  }

  const { subject, html, text } = req.body || {};
  if (!subject || !html || !text) {
    res.status(400);
    throw new Error('Subject, HTML, and text versions are required');
  }

  let template = await EmailTemplate.findOne({ key });
  if (!template) {
    template = new EmailTemplate({
      key,
      name: definition.name,
      description: definition.description,
      variables: definition.variables.map((variable) => variable.token),
    });
  }

  template.subject = subject;
  template.html = html;
  template.text = text;
  template.variables = definition.variables.map((variable) => variable.token);

  if (req.admin?._id) {
    template.updatedBy = req.admin._id;
  }

  await template.save();
  invalidateTemplateCache(key);

  res.json({
    message: 'Template saved successfully',
    item: serializeTemplate(definition, template.toObject()),
  });
});

const deleteEmailTemplate = asyncHandler(async (req, res) => {
  const key = req.params.key;
  const definition = templateDefinitions[key];

  if (!definition) {
    res.status(404);
    throw new Error('Template not found');
  }

  const template = await EmailTemplate.findOne({ key });
  if (template) {
    await template.deleteOne();
    invalidateTemplateCache(key);
  }

  res.json({ success: true });
});

module.exports = {
  listEmailTemplates,
  getEmailTemplate,
  upsertEmailTemplate,
  deleteEmailTemplate,
};
