// routes/invitationRoutes.js
const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');

// Updated route to use the new controller function
router.post('/send-emails', invitationController.sendInvitations);
router.get('/confirm', invitationController.handleConfirmInvitation);
router.get('/decline', invitationController.handleDeclineInvitation);
router.get('/show-qrcode', invitationController.handleShowQrCode); // NEW: Add this line

module.exports = router;
