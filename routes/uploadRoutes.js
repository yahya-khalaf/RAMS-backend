// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Define the POST endpoint for uploading a CSV file
// The 'candidates_file' name should match the field name in your form
router.post('/csv', upload.single('candidates_file'), uploadController.uploadCandidates);

module.exports = router;
