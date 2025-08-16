const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const registerController = require('../controllers/registerController'); // NEW: Import new controller


router.post('/update-state', candidateController.updateCandidateState);
router.post('/', candidateController.createCandidate);
router.get('/register/:token', registerController.getInstituteByToken);
router.get('/', candidateController.getFilteredCandidates);
router.delete('/:id', candidateController.deleteCandidate);

module.exports = router;