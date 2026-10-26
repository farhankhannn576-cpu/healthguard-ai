const express = require('express');
const router = express.Router();
const {
  createAssessment, listAssessments, getAssessment, deleteAssessment,
} = require('../controllers/assessmentController');
const { requireAuth } = require('../middleware/auth');
const { validateAssessment } = require('../middleware/validate');

router.use(requireAuth);
router.post('/', validateAssessment, createAssessment);
router.get('/', listAssessments);
router.get('/:id', getAssessment);
router.delete('/:id', deleteAssessment);

module.exports = router;
