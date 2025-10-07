const express = require('express');
const asyncHandler = require('express-async-handler');
const { handleChatMessage } = require('../services/chatbotService');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { message, history, page } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    const response = await handleChatMessage({ message, history, page });

    res.json({
      reply: response.reply,
      contexts: response.contexts?.map((context) => ({
        id: context.id,
        title: context.title,
        source: context.source,
        content: context.content,
      })),
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      error: response.provider?.startsWith('fallback') ? response.error : undefined,
    });
  })
);

module.exports = router;


