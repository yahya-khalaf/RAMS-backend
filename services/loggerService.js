// services/loggerService.js
const { google } = require('googleapis');
require('dotenv').config();

// Parse the credentials from the environment variable
const credentials = JSON.parse(process.env.GCP_CREDENTIALS);
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

// Set up the Google Sheets API client
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Appends a new row to the Google Sheet log.
 * @param {string} action - The type of action performed (e.g., 'DELETE_CANDIDATE').
 * @param {string} performedBy - The ID or username of the admin who performed the action.
 * @param {string} details - A string with details about the action (e.g., 'Candidate ID: 1234-abcd').
 */
async function logAction(action, performedBy, details) {
    try {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });

        const row = [
            timestamp,       // Column A: Timestamp
            action,          // Column B: Action Type
            performedBy,     // Column C: Performed By (Admin ID)
            details          // Column D: Details
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A1', // Appends after the last row in Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [row],
            },
        });
        console.log('✅ Action logged to Google Sheets.');

    } catch (error) {
        console.error('❌ Error logging to Google Sheets:', error.message);
    }
}

module.exports = {
    logAction
};