const pool = require('../db/pool');

function safeParse(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

/**
 * GET /api/dashboard
 * Returns the user's profile, latest assessment, and a trend series (risk
 * probability over time) for charting.
 */
async function getDashboard(req, res) {
  const userId = req.user.id;
  try {
    const [[user]] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    const [assessments] = await pool.query(
      `SELECT a.id, a.risk_level, a.probability, a.factors, a.recommendations,
              a.model_version, a.created_at,
              p.age, p.gender, p.height, p.weight, p.blood_pressure, p.heart_rate, p.glucose, p.sleep
       FROM assessments a
       JOIN health_profiles p ON p.id = a.health_profile_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [userId]
    );

    const latest = assessments.length
      ? { ...assessments[0], factors: safeParse(assessments[0].factors), recommendations: safeParse(assessments[0].recommendations) }
      : null;

    const trend = assessments
      .slice()
      .reverse()
      .map((a) => ({ date: a.created_at, risk_level: a.risk_level, probability: a.probability }));

    return res.json({
      user,
      latest_assessment: latest,
      recent_assessments: assessments.map((a) => ({
        id: a.id, risk_level: a.risk_level, probability: a.probability, created_at: a.created_at,
      })),
      trend,
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ error: 'Could not load dashboard.' });
  }
}

module.exports = { getDashboard };
