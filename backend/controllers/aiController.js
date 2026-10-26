const pool = require('../db/pool');
const { predictRisk } = require('../services/mlService');
const { chatWithGemini } = require('../services/geminiService');

/**
 * POST /api/ai/predict
 * Standalone prediction endpoint (does not persist) — useful for a "preview"
 * before the user formally saves an assessment, or for debugging the model.
 */
async function predict(req, res) {
  try {
    const result = await predictRisk(req.body);
    return res.json({ prediction: result });
  } catch (err) {
    console.error('predict error:', err);
    return res.status(502).json({ error: `AI risk prediction failed: ${err.message}` });
  }
}

/**
 * POST /api/ai/chat
 * Sends the user's message (plus recent chat history and optional latest
 * assessment context) to Gemini, stores both turns, and returns the reply.
 */
async function chat(req, res) {
  const userId = req.user.id;
  const { message } = req.body;

  try {
    const [historyRows] = await pool.query(
      'SELECT role, message FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 12',
      [userId]
    );
    const history = historyRows.reverse();

    const [latestAssessment] = await pool.query(
      `SELECT risk_level, probability, factors FROM assessments
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let context = null;
    if (latestAssessment.length) {
      const a = latestAssessment[0];
      let factors = [];
      try { factors = JSON.parse(a.factors); } catch { /* noop */ }
      context = `Latest risk level: ${a.risk_level} (${a.probability}% confidence). Contributing factors: ${factors.join('; ') || 'none noted'}.`;
    }

    const reply = await chatWithGemini({ history, userMessage: message, context });

    await pool.query(
      'INSERT INTO chat_history (user_id, role, message) VALUES (?, ?, ?), (?, ?, ?)',
      [userId, 'user', message, userId, 'assistant', reply]
    );

    return res.json({ reply });
  } catch (err) {
    console.error('chat error:', err);
    return res.status(502).json({ error: `AI assistant failed: ${err.message}` });
  }
}

/** GET /api/ai/chat/history — full chat log for the current user. */
async function getChatHistory(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT role, message, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [req.user.id]
    );
    return res.json({ history: rows });
  } catch (err) {
    console.error('getChatHistory error:', err);
    return res.status(500).json({ error: 'Could not load chat history.' });
  }
}

module.exports = { predict, chat, getChatHistory };
