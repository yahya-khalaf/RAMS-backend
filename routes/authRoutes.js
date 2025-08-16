// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../authMiddleware');

// Public route for logging in
router.post('/login', authController.login);

// Protected route for creating a new admin. Only an authenticated admin can create another admin.
router.post('/register',  authController.createAdmin);

module.exports = router;
