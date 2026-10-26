const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/profile', requireAuth, getProfile);

module.exports = router;
