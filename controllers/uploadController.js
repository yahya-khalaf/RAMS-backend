// controllers/uploadController.js
const db = require('../db/database');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function uploadCandidates(req, res) {
    if (!req.file) {
        return res.status(400).json({ status: 'ERROR', message: 'No file uploaded.' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf8');
        const readableStream = new Readable();
        readableStream.push(fileContent);
        readableStream.push(null); // End the stream

        const candidates = [];
        const insertionPromises = [];

        readableStream
            .pipe(csv())
            .on('data', (row) => {
                // Assuming your CSV columns are named exactly as in the database schema
                const candidate = {
                    firstName: row['First Name'],
                    lastName: row['Last Name'],
                    position: row['Position'],
                    institute: row['Institute'],
                    country: row['Country'],
                    phoneNumber: row['Phone Number'],
                    email: row['Email'] // <<< NEW: Read the email column
                };
                candidates.push(candidate);

                // Create a promise for each insertion
                const queryText = db.INSERT_BULK_CANDIDATES_QUERY;
                const values = [
                    candidate.firstName,
                    candidate.lastName,
                    candidate.position,
                    candidate.institute,
                    candidate.country,
                    candidate.phoneNumber,
                    candidate.email
                ];
                insertionPromises.push(db.query(queryText, values));
            })
            .on('end', async () => {
                try {
                    // Execute all insertion promises concurrently
                    await Promise.all(insertionPromises);
                    res.status(200).json({ status: 'SUCCESS', message: `Successfully inserted ${candidates.length} candidates.`, data: candidates });
                } catch (error) {
                    console.error('Database insertion error:', error);
                    res.status(500).json({ status: 'ERROR', message: 'Error inserting data into the database.' });
                }
            })
            .on('error', (error) => {
                console.error('CSV parsing error:', error);
                res.status(500).json({ status: 'ERROR', message: 'Error parsing CSV file.' });
            });

    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    uploadCandidates
};
