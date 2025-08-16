// controllers/instituteController.js
const db = require('../db/database');

/**
 * Retrieves a list of all invited institutes.
 * @param {Object} req The Express request object.
 * @param {Object} res The Express response object.
 */
async function getAllInstitutes(req, res) {
    try {
        const result = await db.query(db.GET_ALL_INSTITUTES_QUERY);
        res.status(200).json({ status: 'SUCCESS', data: result.rows });
    } catch (error) {
        console.error('Database retrieval error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

async function addInstitute(req, res) {
    const { instituteName, instituteType, institutePriority, isVip } = req.body;

    if (!instituteName) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required field: instituteName.' });
    }

    try {
        const values = [instituteName, instituteType, institutePriority, isVip];
        const result = await db.query(db.INSERT_NEW_INSTITUTE_QUERY, values);

        res.status(201).json({ status: 'SUCCESS', message: 'Institute added successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Database insertion error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    getAllInstitutes,
    addInstitute
};
