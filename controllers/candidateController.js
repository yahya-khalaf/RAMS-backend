// controllers/candidateController.js
const db = require('../db/database');

/**
 * Updates a candidate's state based on ID and Invitation ID.
 * @param {Object} req The Express request object.
 * @param {Object} res The Express response object.
 */
async function updateCandidateState(req, res) {
    const { id, invitationId, newState } = req.body;

    if (!id || !invitationId || !newState) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required parameters: id, invitationId, and newState.' });
    }

    try {
        const values = [newState, id, invitationId];
        const result = await db.query(db.UPDATE_CANDIDATE_STATE_QUERY, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Candidate not found or invitation invalid.' });
        }

        const updatedRow = result.rows[0];
        res.status(200).json({ status: 'SUCCESS', message: `Candidate state updated to ${newState}.`, data: updatedRow });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

async function deleteCandidate(req, res) {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required parameter: id.' });
    }

    try {
        const result = await db.query(db.DELETE_CANDIDATE_QUERY, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'NOT_FOUND', message: 'Candidate not found.' });
        }

        res.status(200).json({ status: 'SUCCESS', message: 'Candidate deleted successfully.' });

    } catch (error) {
        console.error('Database deletion error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

/**
 * Inserts a single candidate into the database.
 * @param {Object} req The Express request object.
 * @param {Object} res The Express response object.
 */
async function createCandidate(req, res) {
    const { firstName, lastName, position, institute, country, phoneNumber, email, instituteId } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required fields: firstName, lastName, phoneNumber, and email.' });
    }

    try {
        const queryText = instituteId ? db.INSERT_SINGLE_CANDIDATE_WITH_INSTITUTE_QUERY : db.INSERT_SINGLE_CANDIDATE_QUERY;
        const values = instituteId
            ? [firstName, lastName, position, institute, country, phoneNumber, email, instituteId]
            : [firstName, lastName, position, institute, country, phoneNumber, email];

        const result = await db.query(queryText, values);

        if (result.rowCount === 0) {
            return res.status(409).json({ status: 'ERROR', message: 'Candidate with this email or phone number already exists.' });
        }

        const newCandidate = result.rows[0];
        res.status(201).json({ status: 'SUCCESS', message: 'Candidate created successfully.', data: newCandidate });

    } catch (error) {
        console.error('Database insertion error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

/**
 * Retrieves a list of candidates with optional filters.
 * @param {Object} req The Express request object.
 * @param {Object} res The Express response object.
 */
async function getFilteredCandidates(req, res) {
    // Extract query parameters from the request URL
    const { phoneNumber, email, invitationId, state, invitesSent } = req.query;

    const queryParts = [];
    const values = [];
    let paramIndex = 1;

    // Dynamically build the WHERE clause based on the provided parameters
    if (phoneNumber) {
        queryParts.push(`c.phone_number = $${paramIndex++}`);
        values.push(phoneNumber);
    }
    if (email) {
        queryParts.push(`c.email = $${paramIndex++}`);
        values.push(email);
    }
    if (invitationId) {
        queryParts.push(`ei.invitation_id = $${paramIndex++}`);
        values.push(invitationId);
    }
    if (state) {
        queryParts.push(`ei.state = $${paramIndex++}`);
        values.push(state);
    }
    if (invitesSent) {
        queryParts.push(`ei.invitations_sent = $${paramIndex++}`);
        values.push(invitesSent);
    }

    const whereClause = queryParts.length > 0 ? `WHERE ${queryParts.join(' AND ')}` : '';

    try {
        const queryText = `
            SELECT
                c.candidate_id,
                c.first_name,
                c.last_name,
                c.phone_number,
                c.email,
                c.institute,
                ii.institute_name as custom_institute_name,
                ei.invitation_id,
                ei.state,
                ei.invitations_sent
            FROM candidates c
            LEFT JOIN event_invitations ei ON c.candidate_id = ei.candidate_id
            LEFT JOIN invited_institutes ii ON c.institute_id = ii.institute_id
            ${whereClause}
            ORDER BY c.created_at DESC;
        `;
        
        const result = await db.query(queryText, values);
        
        // Map the result to use the custom institute name if available
        const finalData = result.rows.map(row => ({
            ...row,
            // Use the custom institute name if available, otherwise use the regular one
            institute: row.custom_institute_name || row.institute
        }));
        
        res.status(200).json({ status: 'SUCCESS', data: finalData });

    } catch (error) {
        console.error('Database retrieval error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}


module.exports = {
    updateCandidateState,
    createCandidate,
    getFilteredCandidates,
    deleteCandidate
};
