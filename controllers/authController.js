// controllers/authController.js
const db = require('../db/database');
const bcrypt = require('bcryptjs'); // MODIFIED: Changed from 'bcrypt' to 'bcryptjs'
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'ERROR', message: 'Username and password are required.' });
    }

    try {
        const result = await db.query(db.GET_ADMIN_BY_USERNAME_QUERY, [username]);

        if (result.rowCount === 0) {
            return res.status(401).json({ status: 'ERROR', message: 'Invalid credentials.' });
        }

        const admin = result.rows[0];
        // The bcrypt.compare function works identically in both libraries
        const isPasswordMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isPasswordMatch) {
            return res.status(401).json({ status: 'ERROR', message: 'Invalid credentials.' });
        }

        // Use a secure, long secret for JWT, stored in environment variables
        const token = jwt.sign({ adminId: admin.admin_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ status: 'SUCCESS', token: token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    login
};
