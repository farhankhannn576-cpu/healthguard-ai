const pool = require('../db/pool');
const { predictRisk } = require('../services/mlService');

function toCsv(value) {
  if (Array.isArray(value)) return value.join(',');
  return value ? String(value) : '';
}

function fromCsv(value) {
  if (!value) return [];
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * POST /api/assessment
 * Saves the submitted health profile, runs the ML prediction, and stores
 * the resulting assessment. Returns both records to the client.
 */
async function createAssessment(req, res) {
  const b = req.body;
  const userId = req.user.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [profileResult] = await conn.query(
      `INSERT INTO health_profiles
        (user_id, age, gender, height, weight, blood_pressure, heart_rate, glucose,
         sleep, activity, smoking, alcohol, stress, family_history, existing_conditions, symptoms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, b.age, b.gender, b.height, b.weight, b.blood_pressure, b.heart_rate, b.glucose,
        b.sleep, b.activity, b.smoking, b.alcohol, b.stress,
        toCsv(b.family_history), toCsv(b.existing_conditions), toCsv(b.symptoms),
      ]
    );
    const healthProfileId = profileResult.insertId;

    let prediction;
    try {
      prediction = await predictRisk(b);
    } catch (mlErr) {
      console.error('ML prediction error:', mlErr.message);
      await conn.rollback();
      return res.status(502).json({ error: `AI risk prediction failed: ${mlErr.message}` });
    }

    const [assessmentResult] = await conn.query(
      `INSERT INTO assessments
        (user_id, health_profile_id, risk_level, probability, factors, recommendations, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, healthProfileId, prediction.risk_level, prediction.probability,
        JSON.stringify(prediction.factors), JSON.stringify(prediction.recommendations),
        prediction.model_version,
      ]
    );

    await conn.commit();

    return res.status(201).json({
      assessment: {
        id: assessmentResult.insertId,
        health_profile_id: healthProfileId,
        risk_level: prediction.risk_level,
        probability: prediction.probability,
        class_probabilities: prediction.class_probabilities,
        factors: prediction.factors,
        recommendations: prediction.recommendations,
        model_version: prediction.model_version,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('createAssessment error:', err);
    return res.status(500).json({ error: 'Could not create assessment.' });
  } finally {
    conn.release();
  }
}

/** GET /api/assessment — list the current user's assessments, newest first. */
async function listAssessments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.risk_level, a.probability, a.factors, a.recommendations,
              a.model_version, a.created_at,
              p.age, p.gender, p.height, p.weight, p.blood_pressure, p.heart_rate,
              p.glucose, p.sleep, p.activity, p.smoking, p.alcohol, p.stress
       FROM assessments a
       JOIN health_profiles p ON p.id = a.health_profile_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    const assessments = rows.map((r) => ({
      ...r,
      factors: safeParse(r.factors),
      recommendations: safeParse(r.recommendations),
    }));
    return res.json({ assessments });
  } catch (err) {
    console.error('listAssessments error:', err);
    return res.status(500).json({ error: 'Could not load assessments.' });
  }
}

/** GET /api/assessment/:id — full detail for one assessment owned by the user. */
async function getAssessment(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.risk_level, a.probability, a.factors, a.recommendations,
              a.model_version, a.created_at,
              p.age, p.gender, p.height, p.weight, p.blood_pressure, p.heart_rate,
              p.glucose, p.sleep, p.activity, p.smoking, p.alcohol, p.stress,
              p.family_history, p.existing_conditions, p.symptoms
       FROM assessments a
       JOIN health_profiles p ON p.id = a.health_profile_id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assessment not found.' });

    const a = rows[0];
    return res.json({
      assessment: {
        ...a,
        factors: safeParse(a.factors),
        recommendations: safeParse(a.recommendations),
        family_history: fromCsv(a.family_history),
        existing_conditions: fromCsv(a.existing_conditions),
        symptoms: fromCsv(a.symptoms),
      },
    });
  } catch (err) {
    console.error('getAssessment error:', err);
    return res.status(500).json({ error: 'Could not load assessment.' });
  }
}

/** DELETE /api/assessment/:id */
async function deleteAssessment(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM assessments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Assessment not found.' });
    return res.json({ message: 'Assessment deleted.' });
  } catch (err) {
    console.error('deleteAssessment error:', err);
    return res.status(500).json({ error: 'Could not delete assessment.' });
  }
}

function safeParse(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

module.exports = { createAssessment, listAssessments, getAssessment, deleteAssessment };
