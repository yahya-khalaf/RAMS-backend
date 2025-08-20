// controllers/authController.js
const db = require('../db/database');
const bcrypt = require('bcryptjs');
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
        const isPasswordMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isPasswordMatch) {
            return res.status(401).json({ status: 'ERROR', message: 'Invalid credentials.' });
        }
        const tokenPayload = {
            adminId: admin.admin_id,
            username: admin.username,
            role: admin.role
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ status: 'SUCCESS', token: token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

// NEW: Function to create a new admin account
async function createAdmin(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'ERROR', message: 'Username and password are required.' });
    }

    try {
        // Hash the password before storing it for security
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(db.INSERT_NEW_ADMIN_QUERY, [username, passwordHash]);

        // Check if the user was actually inserted (in case of conflict)
        if (result.rowCount === 0) {
            return res.status(409).json({ status: 'ERROR', message: 'Admin with this username already exists.' });
        }

        res.status(201).json({ status: 'SUCCESS', message: 'Admin account created successfully.', data: result.rows[0] });

    } catch (error) {
        // Handle cases where the username already exists (unique constraint violation)
        if (error.code === '23505') {
            return res.status(409).json({ status: 'ERROR', message: 'Admin with this username already exists.' });
        }
        console.error('Create admin error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}async function createRegisterer(req, res) {
    // Role check: Only admins can perform this action
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'ERROR', message: 'Access denied. Administrator role required.' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ status: 'ERROR', message: 'Username and password are required.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const result = await db.query(db.INSERT_NEW_REGISTERER_QUERY, [username, passwordHash]);
        
        if (result.rowCount === 0) {
            return res.status(409).json({ status: 'ERROR', message: 'Registerer with this username already exists.' });
        }
        res.status(201).json({ status: 'SUCCESS', message: 'Registerer account created successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Create registerer error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

async function updateRegistererStatus(req, res) {
    // Role check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'ERROR', message: 'Access denied. Administrator role required.' });
    }

    const { id } = req.params;
    const { status } = req.body; // Expecting 'active' or 'suspended'

    if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ status: 'ERROR', message: 'A valid status ("active" or "suspended") is required.' });
    }

    try {
        const result = await db.query(db.UPDATE_REGISTERER_STATUS_QUERY, [status, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Registerer not found.' });
        }
        res.status(200).json({ status: 'SUCCESS', message: `Registerer status updated to ${status}.`, data: result.rows[0] });
    } catch (error) {
        console.error('Update registerer status error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

async function deleteRegisterer(req, res) {
    // Role check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'ERROR', message: 'Access denied. Administrator role required.' });
    }

    const { id } = req.params;
    try {
        const result = await db.query(db.DELETE_REGISTERER_QUERY, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Registerer not found.' });
        }
        res.status(200).json({ status: 'SUCCESS', message: 'Registerer account deleted successfully.' });
    } catch (error) {
        console.error('Delete registerer error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}
async function getAllRegisterers(req, res) {
    // Role check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'ERROR', message: 'Access denied. Administrator role required.' });
    }

    try {
        const result = await db.query(db.GET_ALL_REGISTERERS_QUERY);
        res.status(200).json({ status: 'SUCCESS', data: result.rows });
    } catch (error) {
        console.error('Get all registerers error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    login,
    createAdmin,
    createRegisterer,      
    updateRegistererStatus,
    deleteRegisterer,
    getAllRegisterers
};
