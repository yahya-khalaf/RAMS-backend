
// routes/checkinRoutes.js
const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');

// Note: We will create this middleware in a later step
const authenticateRegisterer = require('../registererAuthMiddleware');

// Get candidate details by scanning a QR code (invitation ID)
router.get('/:invitationId', authenticateRegisterer, checkinController.getCandidateForCheckIn);

// Mark the candidate as checked-in
router.post('/:invitationId', authenticateRegisterer, checkinController.checkInCandidate);

module.exports = router;