// registererAuthMiddleware.js
const jwt = require('jsonwebtoken');

function authenticateRegisterer(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }

        // Check if the user has the 'registerer' role
        if (user.role !== 'registerer' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Registerer role required.' });
        }
       if (user.status === 'suspended') {
            return res.status(403).json({ status: 'ERROR', message: 'This account has been suspended.' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateRegisterer;