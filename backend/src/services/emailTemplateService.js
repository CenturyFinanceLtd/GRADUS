/*
  Email template service
  - Provides helpers to retrieve definitions + admin overrides
  - Renders template strings with provided variables
*/
const EmailTemplate = require('../models/EmailTemplate');
const templateDefinitions = require('../data/emailTemplateDefinitions');

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const getTemplateDefinition = (key) => templateDefinitions[key];

const getCacheEntry = (key) => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCacheEntry = (key, value) => {
  cache.set(key, { value, timestamp: Date.now() });
};

const invalidateTemplateCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

const buildTemplateFromRecord = (definition, record) => ({
  subject: record?.subject || definition.subject,
  html: record?.html || definition.html,
  text: record?.text || definition.text,
});

const getCompiledTemplate = async (key) => {
  const definition = getTemplateDefinition(key);
  if (!definition) {
    return null;
  }

  const cached = getCacheEntry(key);
  if (cached) {
    return cached;
  }

  const record = await EmailTemplate.findOne({ key }).lean();
  const template = buildTemplateFromRecord(definition, record);
  setCacheEntry(key, template);
  return template;
};

const renderTemplateString = (templateString, variables = {}) => {
  if (!templateString) {
    return '';
  }

  return templateString.replace(/{{\s*([\w.]+)\s*}}/g, (match, token) => {
    const value = variables[token];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
};

const renderEmailTemplate = async (key, variables = {}) => {
  const compiled = await getCompiledTemplate(key);
  if (!compiled) {
    return null;
  }

  return {
    subject: renderTemplateString(compiled.subject, variables),
    text: renderTemplateString(compiled.text, variables),
    html: renderTemplateString(compiled.html, variables),
  };
};

module.exports = {
  getTemplateDefinition,
  renderEmailTemplate,
  getCompiledTemplate,
  invalidateTemplateCache,
};
