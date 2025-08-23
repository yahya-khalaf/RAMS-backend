
// controllers/checkinController.js
const db = require('../db/database');

/**
 * Retrieves candidate details for check-in using the invitation ID.
 */
async function getCandidateForCheckIn(req, res) {
    const { invitationId } = req.params;
    try {
        const user = await db.query(db.GET_ADMIN_BY_USERNAME_QUERY, [req.user.username]);
        const admin = user.rows[0];
        if (admin.status === 'suspended') {
            return res.status(403).json({ status: 'ERROR', message: 'This account has been suspended.' });
        }
        const result = await db.query(db.GET_CANDIDATE_FOR_CHECKIN_QUERY, [invitationId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Invitation not found or invalid.' });
        }

        res.status(200).json({ status: 'SUCCESS', data: result.rows[0] });

    } catch (error) {
        console.error('Check-in lookup error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

/**
 * Marks a candidate as checked-in.
 */
async function checkInCandidate(req, res) {
    const { invitationId } = req.params;

    try {
        const result = await db.query(db.MARK_CANDIDATE_AS_CHECKED_IN_QUERY, [invitationId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Invitation not found or already checked in.' });
        }


        res.status(200).json({ status: 'SUCCESS', message: 'Candidate checked in successfully.', data: result.rows[0] });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    getCandidateForCheckIn,
    checkInCandidate
};