// routes/instituteRoutes.js
const express = require('express');
const router = express.Router();
const instituteController = require('../controllers/instituteController');

// Define the GET endpoint for retrieving all institutes
router.get('/', instituteController.getAllInstitutes);
router.post('/', instituteController.addInstitute);

module.exports = router;
