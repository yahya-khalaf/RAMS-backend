// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Import the database and routes
const db = require('./db/database');
const candidateRoutes = require('./routes/candidateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const instituteRoutes = require('./routes/instituteRoutes');

// Middleware to enable CORS for all origins
// It is highly recommended to replace '*' with your cPanel frontend domain for production.
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

// Middleware to parse JSON bodies from requests
app.use(express.json());

// Main entry point for our candidate-related APIs
app.use('/api/candidates', candidateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/institutes', instituteRoutes);

// A simple health check route
app.get('/', (req, res) => {
    res.send('Welcome to the RAMS backend API!');
});

// Start the server and connect to the database
async function startServer() {
    try {
        await db.pool.connect();
        console.log('✅ Connected successfully to the Neon database.');
        app.listen(port, () => {
            console.log(`🚀 RAMS backend listening on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
