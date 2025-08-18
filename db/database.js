// db/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Add an 'error' event listener to the connection pool
pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client:', err);
});

async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

// SQL query to update the state of a candidate using the invitation token
const UPDATE_CANDIDATE_STATE_QUERY = `
    UPDATE event_invitations
    SET state = $1, responded_at = NOW()
    WHERE invitation_token = $2
    RETURNING invitation_id, candidate_id;
`;

const GET_INSTITUTE_BY_TOKEN_QUERY = `
        SELECT institute_id, institute_name FROM invited_institutes WHERE registration_token = $1;
    `;


const INSERT_SINGLE_CANDIDATE_WITH_INSTITUTE_QUERY = `
        INSERT INTO candidates (
            first_name,
            last_name,
            position,
            institute,
            country,
            phone_number,
            email,
            language,
            institute_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8 ,$9)
        ON CONFLICT (email, phone_number) DO NOTHING
        RETURNING candidate_id;
    `;

const INSERT_BULK_CANDIDATES_QUERY = `
    INSERT INTO candidates (
        first_name,
        last_name,
        position,
        institute,
        country,
        phone_number,
        email,
        language 
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (email, phone_number) DO NOTHING;
`;

const INSERT_SINGLE_CANDIDATE_QUERY = `
    INSERT INTO candidates (
        first_name,
        last_name,
        position,
        institute,
        country,
        phone_number,
        email,
        language 
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (email, phone_number) DO NOTHING
    RETURNING candidate_id;
`;

const GET_CANDIDATE_ID_BY_EMAIL = `
    SELECT candidate_id FROM candidates WHERE email = $1;
`;

const GET_CANDIDATE_DETAILS_BY_ID = `
    SELECT email, first_name, last_name, language FROM candidates WHERE candidate_id = $1;
`;

const GET_CANDIDATE_AND_EVENT_BY_TOKEN = `
    SELECT
        c.first_name,
        c.email,
        ei.invitation_id
    FROM
        event_invitations ei
    JOIN
        candidates c ON ei.candidate_id = c.candidate_id
    WHERE
        ei.invitation_token = $1;
`;

const UPSERT_INVITATION_QUERY = `
    INSERT INTO event_invitations (
        invitation_id,
        candidate_id,
        event_id,
        state,
        invitations_sent,
        invitation_token
    ) VALUES (gen_random_uuid(), $1, $2, 'pending', 1, gen_random_uuid())
    ON CONFLICT (candidate_id, event_id) DO UPDATE
    SET invitations_sent = event_invitations.invitations_sent + 1,
        invitation_token = gen_random_uuid()
    RETURNING invitation_token;
`;

const GET_ALL_INSTITUTES_QUERY = `
    SELECT
        institute_id,
        institute_name,
        institute_type,
        institute_priority,
        is_vip,
        registration_token

    FROM invited_institutes
    ORDER BY created_at DESC;
`;
const INSERT_NEW_INSTITUTE_QUERY = `
    INSERT INTO invited_institutes (institute_name, institute_type, institute_priority, is_vip)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;

// NEW: Query to delete a candidate by ID
const DELETE_CANDIDATE_QUERY = `
    DELETE FROM candidates
    WHERE candidate_id = $1
    RETURNING candidate_id;
`;

// NEW: Query to delete an institute by ID
const DELETE_INSTITUTE_QUERY = `
    DELETE FROM invited_institutes
    WHERE institute_id = $1
    RETURNING institute_id;
`;
const GET_ADMIN_BY_USERNAME_QUERY = `
    SELECT admin_id, password_hash FROM admins WHERE username = $1;
`;

const INSERT_NEW_ADMIN_QUERY = `
    INSERT INTO admins (username, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (username) DO NOTHING
    RETURNING admin_id, username;
`;

module.exports = {
    pool,
    query,
    UPDATE_CANDIDATE_STATE_QUERY,
    INSERT_BULK_CANDIDATES_QUERY,
    INSERT_SINGLE_CANDIDATE_QUERY,
    GET_CANDIDATE_ID_BY_EMAIL,
    GET_CANDIDATE_DETAILS_BY_ID,
    GET_CANDIDATE_AND_EVENT_BY_TOKEN,
    UPSERT_INVITATION_QUERY,
    GET_ALL_INSTITUTES_QUERY,
    GET_INSTITUTE_BY_TOKEN_QUERY,
    INSERT_SINGLE_CANDIDATE_WITH_INSTITUTE_QUERY,
    INSERT_NEW_INSTITUTE_QUERY,
    DELETE_CANDIDATE_QUERY,
    DELETE_INSTITUTE_QUERY,
    GET_ADMIN_BY_USERNAME_QUERY,
    INSERT_NEW_ADMIN_QUERY

};