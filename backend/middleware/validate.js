const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const { name, email, password } = req.body || {};
  const errors = [];

  if (!name || String(name).trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (!password || String(password).length < 8) errors.push('Password must be at least 8 characters.');

  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (!password) errors.push('Password is required.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  next();
}

const ACTIVITY_VALUES = ['sedentary', 'light', 'moderate', 'active'];
const SMOKING_VALUES = ['never', 'former', 'current'];
const ALCOHOL_VALUES = ['none', 'occasional', 'frequent'];
const STRESS_VALUES = ['low', 'moderate', 'high'];
const GENDER_VALUES = ['male', 'female', 'other'];
const BP_RE = /^\d{2,3}\/\d{2,3}$/;

function validateAssessment(req, res, next) {
  const b = req.body || {};
  const errors = [];

  const numFields = {
    age: [1, 120], height: [50, 260], weight: [20, 350],
    heart_rate: [30, 220], glucose: [40, 500], sleep: [0, 24],
  };
  for (const [field, [min, max]] of Object.entries(numFields)) {
    const v = Number(b[field]);
    if (Number.isNaN(v) || v < min || v > max) {
      errors.push(`${field} must be a number between ${min} and ${max}.`);
    }
  }

  if (!GENDER_VALUES.includes(b.gender)) errors.push('gender must be one of: ' + GENDER_VALUES.join(', '));
  if (!BP_RE.test(b.blood_pressure || '')) errors.push('blood_pressure must look like "120/80".');
  if (!ACTIVITY_VALUES.includes(b.activity)) errors.push('activity must be one of: ' + ACTIVITY_VALUES.join(', '));
  if (!SMOKING_VALUES.includes(b.smoking)) errors.push('smoking must be one of: ' + SMOKING_VALUES.join(', '));
  if (!ALCOHOL_VALUES.includes(b.alcohol)) errors.push('alcohol must be one of: ' + ALCOHOL_VALUES.join(', '));
  if (!STRESS_VALUES.includes(b.stress)) errors.push('stress must be one of: ' + STRESS_VALUES.join(', '));

  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  next();
}

function validateChat(req, res, next) {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }
  if (String(message).length > 2000) {
    return res.status(400).json({ error: 'message is too long (max 2000 characters).' });
  }
  next();
}

module.exports = { validateRegister, validateLogin, validateAssessment, validateChat };
