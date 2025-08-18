// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Import the database and routes
const db = require('./db/database');
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const instituteRoutes = require('./routes/instituteRoutes');
const authenticateToken = require('./authMiddleware'); // Import the middleware

// const corsOptions = {
//     origin: 'https://registration.iccdglobal.com',
//     optionsSuccessStatus: 200 // For legacy browser support
// };
// app.use(cors(corsOptions));
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Public route for login
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/invitations',  invitationRoutes);
app.use('/api/institutes', authenticateToken, instituteRoutes);

// A simple health check route
app.get('/', (req, res) => {
    res.send('Welcome to the RAMS backend API wwe!');
});

// Start the server
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
