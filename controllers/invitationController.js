// controllers/invitationController.js
const emailService = require('../services/emailService');
const db = require('../db/database');
const QRCode = require('qrcode');
require('dotenv').config();

// New function to handle displaying the QR code page
async function handleShowQrCode(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('<h1>خطأ: توكن الدعوة مفقود.</h1>');
    }

    try {
        // Query to find the invitation details by token
        const query = `
            SELECT invitation_id FROM event_invitations
            WHERE invitation_token = $1 AND state = 'Accepted';
        `;
        const result = await db.query(query, [token]);

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>خطأ: دعوة غير صالحة أو لم يتم تأكيدها بعد.</h1>');
        }

        const invitationId = result.rows[0].invitation_id;
        const qrCodeData = invitationId;
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData);

        // Build the HTML page with the QR code and download button
        const htmlPage = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>رمز الاستجابة السريعة</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; text-align: center; background-color: #f1f2f2; margin: 0; padding: 2rem; }
                    .container { max-width: 600px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    h1 { color: #1b2a39; margin-bottom: 1rem; }
                    p { color: #414042; margin-bottom: 1rem; }
                    img { border-radius: 8px; border: 2px solid #15a9b2; padding: 10px; margin: 1rem 0; background: #fff; }
                    .download-btn {
                        display: inline-block;
                        background-color: #15a9b2;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        transition: background-color 0.3s;
                    }
                    .download-btn:hover { background-color: #0f7a81; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>رمز الاستجابة السريعة الخاص بك</h1>
                    <p>هذا هو رمز الاستجابة السريعة الخاص بالدعوة رقم: ${invitationId}. يرجى حفظه لاستخدامه عند الدخول للحدث.</p>
                    <img src="${qrCodeDataUrl}" alt="QR Code">
                    <br/>
                    <a href="${qrCodeDataUrl}" download="rams-qrcode-${invitationId}.png" class="download-btn">
                        تحميل رمز الاستجابة السريعة
                    </a>
                </div>
            </body>
            </html>
        `;
        return res.status(200).send(htmlPage);
    } catch (error) {
        console.error("Error serving QR code page:", error);
        return res.status(500).send('<h1>خطأ في الخادم. يرجى المحاولة لاحقاً.</h1>');
    }
}

async function sendInvitations(req, res) {
    const { candidateIds, eventId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0 || !eventId) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required fields: candidateIds (array of UUIDs) and eventId (UUID).' });
    }

    const successfulRecipients = [];
    const failedRecipients = [];
    // NEW: Use the BACKEND_BASE_URL environment variable to construct dynamic links
    const backendBaseUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/api/invitations`;

    try {
        const sendPromises = candidateIds.map(async (candidateId) => {
            try {
                const candidateResult = await db.query(db.GET_CANDIDATE_DETAILS_BY_ID, [candidateId]);
                const candidate = candidateResult.rows[0];

                // **NEW: Check if the candidate has a valid email before proceeding**
                if (!candidate || !candidate.email) {
                    throw new Error(`Candidate with ID ${candidateId} does not have a valid email address.`);
                }

                // 2. Upsert invitation and get the new unique token
                const upsertResult = await db.query(db.UPSERT_INVITATION_QUERY, [candidateId, eventId]);
                const invitationToken = upsertResult.rows[0].invitation_token;

                // 3. Construct personalized links
                const confirmUrl = `${backendBaseUrl}/confirm?token=${invitationToken}`;
                const declineUrl = `${backendBaseUrl}/decline?token=${invitationToken}`;

                // 4. Build the initial invitation email body
                const htmlBody = `
                    <div style="text-align: center; font-family: 'Cairo', sans-serif;">
                        <h1>مرحباً ${candidate.first_name}!</h1>
                        <p>لقد تلقيت دعوة لحضور حدثنا. يرجى تسجيل استجابتك.</p>
                        <p>
                            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px;">قبول الدعوة</a>
                            <a href="${declineUrl}" style="display: inline-block; padding: 12px 24px; background-color: #e53e3e; color: white; text-decoration: none; border-radius: 8px; margin-right: 10px;">رفض الدعوة</a>
                        </p>
                    </div>
                `;

                const emailSubject = 'دعوة للانضمام إلى الحدث';
                await emailService.sendPersonalizedEmail(candidate.email, emailSubject, htmlBody);

                successfulRecipients.push(candidate.email);
            } catch (error) {
                console.error(`Failed to send invitation to candidate ID ${candidateId}:`, error.message);
                failedRecipients.push(candidateId);
            }
        });

        await Promise.all(sendPromises);

        if (successfulRecipients.length > 0) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: `Sent ${successfulRecipients.length} invitation(s).`,
                excluded_recipients: failedRecipients
            });
        } else {
            return res.status(500).json({
                status: 'ERROR',
                message: 'Failed to send any invitations.',
                excluded_recipients: failedRecipients
            });
        }
    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

async function handleConfirmInvitation(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('<h1>خطأ: توكن الدعوة مفقود.</h1>');
    }

    try {
        const updateQuery = `
            UPDATE event_invitations
            SET state = 'Accepted', responded_at = NOW()
            WHERE invitation_token = $1
            RETURNING *;
        `;
        const result = await db.query(updateQuery, [token]);

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>خطأ: دعوة غير صالحة أو تم الرد عليها بالفعل.</h1>');
        }

        const invitation = result.rows[0];
        const candidateDetails = await db.query(db.GET_CANDIDATE_DETAILS_BY_ID, [invitation.candidate_id]);
        const candidate = candidateDetails.rows[0];

        // NEW LOGIC: Construct the link to the QR code page
        const backendBaseUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/api/invitations`;
        const qrCodeLink = `${backendBaseUrl}/show-qrcode?token=${token}`;

        // Build the confirmation email body with the QR code link
        const confirmationEmailHtml = `
            <div style="text-align: center; font-family: 'Cairo', sans-serif;">
                <h1>تم تأكيد حضورك بنجاح!</h1>
                <p>شكراً لتأكيد حضورك. نراك قريباً في الحدث.</p>
                <p>اضغط على الزر أدناه لإظهار رمز الاستجابة السريعة الخاص بالدعوة:</p>
                <p>
                    <a href="${qrCodeLink}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        إظهار رمز الاستجابة السريعة
                    </a>
                </p>
            </div>
        `;

        await emailService.sendPersonalizedEmail(candidate.email, 'تأكيد حضورك للحدث', confirmationEmailHtml);

        // Respond to the user's browser with a simple confirmation page
        const responseHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تم تأكيد الحضور</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; text-align: center; background-color: #f1f2f2; margin: 0; padding: 2rem; }
                    .container { max-width: 600px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    h1 { color: #1b2a39; margin-bottom: 1rem; }
                    p { color: #414042; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>تم تأكيد حضورك بنجاح!</h1>
                    <p>تم إرسال رمز الاستجابة السريعة الخاص بك في بريد إلكتروني منفصل.</p>
                </div>
            </body>
            </html>
        `;

        return res.status(200).send(responseHtml);
    } catch (error) {
        console.error("Error confirming invitation:", error);
        return res.status(500).send('<h1>خطأ في الخادم. يرجى المحاولة لاحقاً.</h1>');
    }
}

async function handleDeclineInvitation(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('<h1>خطأ: توكن الدعوة مفقود.</h1>');
    }

    try {
        const updateQuery = `
            UPDATE event_invitations
            SET state = 'Rejected', responded_at = NOW()
            WHERE invitation_token = $1
            RETURNING *;
        `;
        const result = await db.query(updateQuery, [token]);

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>خطأ: دعوة غير صالحة أو تم الرد عليها بالفعل.</h1>');
        }

        const invitation = result.rows[0];
        const candidateDetails = await db.query(db.GET_CANDIDATE_DETAILS_BY_ID, [invitation.candidate_id]);
        const candidate = candidateDetails.rows[0];

        const declineHtml = `
            <div style="text-align: center; font-family: 'Cairo', sans-serif;">
                <h1>تم تسجيل رفضك.</h1>
                <p>شكراً لإعلامنا. نأمل أن نراك في أحداثنا المستقبلية.</p>
            </div>
        `;
        await emailService.sendPersonalizedEmail(candidate.email, 'تسجيل رفض الدعوة', declineHtml);

        return res.status(200).send(`
            <div style="text-align: center; font-family: 'Cairo', sans-serif;">
                <h1>تم تسجيل رفضك.</h1>
                <p>شكراً لإعلامنا. نأمل أن نراك في أحداثنا المستقبلية.</p>
            </div>
        `);
    } catch (error) {
        console.error("Error declining invitation:", error);
        return res.status(500).send('<h1>خطأ في الخادم. يرجى المحاولة لاحقاً.</h1>');
    }
}

module.exports = {
    sendInvitations,
    handleConfirmInvitation,
    handleDeclineInvitation,
    handleShowQrCode
};
