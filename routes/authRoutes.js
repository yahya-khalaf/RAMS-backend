// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../authMiddleware');


// Public route for logging in
router.post('/login', authController.login);
// Protected route for creating a new admin. Only an authenticated admin can create another admin.
router.post('/register',  authController.createAdmin);
router.post('/registerer', authenticateToken, authController.createRegisterer);

// Update a registerer's status (suspend/reactivate)
router.put('/registerer/:id/status', authenticateToken, authController.updateRegistererStatus);

// Delete a registerer account
router.delete('/registerer/:id', authenticateToken, authController.deleteRegisterer);
router.get('/registerers', authenticateToken, authController.getAllRegisterers);
module.exports = router;
