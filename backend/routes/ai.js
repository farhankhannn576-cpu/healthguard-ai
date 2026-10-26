const express = require('express');
const router = express.Router();
const { predict, chat, getChatHistory } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { validateChat } = require('../middleware/validate');

router.use(requireAuth);
router.post('/predict', predict);
router.post('/chat', validateChat, chat);
router.get('/chat/history', getChatHistory);

module.exports = router;
