const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const registerController = require('../controllers/registerController'); // NEW: Import new controller

// Define the POST endpoint for updating a candidate's state
router.post('/update-state', candidateController.updateCandidateState);

// Define the POST endpoint for inserting a single candidate
router.post('/', candidateController.createCandidate);

// NEW: Endpoint to get institute details for a custom registration form
router.get('/register/:token', registerController.getInstituteByToken);

// Define the GET endpoint for retrieving candidates with filters
router.get('/', candidateController.getFilteredCandidates);

module.exports = router;