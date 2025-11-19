/*
  Admin Gmail controller
  - Lists configured shared inboxes and exposes message list/detail endpoints
*/
const asyncHandler = require('express-async-handler');
const {
  GmailServiceError,
  getConfiguredMailboxes,
  getSupportedLabels,
  listMailboxSummaries,
  listMessagesForAccount,
  getMessageById,
  getAttachmentData,
} = require('../services/gmailWorkspaceService');

const sendServiceError = (res, error) => {
  if (error instanceof GmailServiceError && error.httpStatus) {
    res.status(error.httpStatus);
  }
};

const listMailboxes = asyncHandler(async (req, res) => {
  const summaries = await listMailboxSummaries();
  const supportedLabels = getSupportedLabels().map((label) => ({ id: label.id, name: label.name }));

  res.json({
    accounts: summaries,
    supportedLabels,
    defaultAccount: summaries[0]?.email || null,
    fetchedAt: new Date().toISOString(),
  });
});

const listMessages = asyncHandler(async (req, res) => {
  const configured = getConfiguredMailboxes();
  if (!configured.length) {
    res.status(503);
    throw new Error('No admin mailboxes have been configured.');
  }

  const accountEmail = (req.query.account || configured[0].email || '').trim().toLowerCase();

  try {
    const data = await listMessagesForAccount({
      accountEmail,
      labelId: req.query.labelId,
      pageToken: req.query.pageToken,
      maxResults: req.query.maxResults,
      query: req.query.search || req.query.q,
    });
    res.json(data);
  } catch (error) {
    sendServiceError(res, error);
    throw error;
  }
});

const getMessage = asyncHandler(async (req, res) => {
  const configured = getConfiguredMailboxes();
  if (!configured.length) {
    res.status(503);
    throw new Error('No admin mailboxes have been configured.');
  }

  const accountEmail = (req.query.account || configured[0].email || '').trim().toLowerCase();
  const messageId = req.params.messageId;

  try {
    const data = await getMessageById({
      accountEmail,
      messageId,
    });
    res.json(data);
  } catch (error) {
    sendServiceError(res, error);
    throw error;
  }
});

const getAttachment = asyncHandler(async (req, res) => {
  const configured = getConfiguredMailboxes();
  if (!configured.length) {
    res.status(503);
    throw new Error('No admin mailboxes have been configured.');
  }

  const accountEmail = (req.query.account || configured[0].email || '').trim().toLowerCase();
  const { messageId, attachmentId } = req.params;

  try {
    const data = await getAttachmentData({
      accountEmail,
      messageId,
      attachmentId,
    });
    res.json(data);
  } catch (error) {
    sendServiceError(res, error);
    throw error;
  }
});

module.exports = {
  listMailboxes,
  listMessages,
  getMessage,
  getAttachment,
};
