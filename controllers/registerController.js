    // controllers/registerController.js
    const db = require('../db/database');

    /**
     * Fetches institute details using a registration token for a custom form.
     * @param {Object} req The Express request object.
     * @param {Object} res The Express response object.
     */
    async function getInstituteByToken(req, res) {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ status: 'ERROR', message: 'Missing required parameter: token.' });
        }

        try {
            const result = await db.query(db.GET_INSTITUTE_BY_TOKEN_QUERY, [token]);

            if (result.rowCount === 0) {
                return res.status(404).json({ status: 'NOT_FOUND', message: 'Institute not found for this token.' });
            }

            res.status(200).json({ status: 'SUCCESS', data: result.rows[0] });

        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
        }
    }

    module.exports = {
        getInstituteByToken
    };
    