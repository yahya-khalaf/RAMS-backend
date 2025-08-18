// controllers/invitationController.js
const emailService = require('../services/emailService');
const db = require('../db/database');
const QRCode = require('qrcode');
require('dotenv').config();

// Centralized translations for all user-facing pages
const translations = {
    ar: {
        confirmTitle: "تم تأكيد الحضور",
        confirmHeader: "تم تأكيد حضورك بنجاح!",
        confirmMessage: "تم إرسال تفاصيل دعوتك ورمز الاستجابة السريعة في بريد إلكتروني منفصل.",
        declineTitle: "تم تسجيل الرفض",
        declineHeader: "تم تسجيل رفضك.",
        declineMessage: "شكراً لإعلامنا. نأمل أن نراك في أحداثنا المستقبلية.",
        qrTitle: "رمز الاستجابة السريعة",
        qrHeader: "رمز الاستجابة السريعة الخاص بك",
        qrMessage: "هذا هو رمز الاستجابة السريعة الخاص بالدعوة رقم: {invitationId}. يرجى حفظه لاستخدامه عند الدخول إلى 'حفل الاستقبال السنوي للغرفة الإسلامية'.",
        qrDownloadButton: "تحميل رمز الاستجابة السريعة",
        errorHeader: "خطأ",
        errorMissingToken: "توكن الدعوة مفقود.",
        errorInvalidToken: "دعوة غير صالحة أو تم الرد عليها بالفعل.",
        errorInvalidQrToken: "دعوة غير صالحة أو لم يتم تأكيدها بعد.",
        errorServer: "خطأ في الخادم. يرجى المحاولة لاحقاً."
    },
    en: {
        confirmTitle: "Attendance Confirmed",
        confirmHeader: "Your attendance has been confirmed successfully!",
        confirmMessage: "Your invitation details and QR code have been sent in a separate email.",
        declineTitle: "Declined",
        declineHeader: "Your refusal has been registered.",
        declineMessage: "Thank you for letting us know. We hope to see you at our future events.",
        qrTitle: "QR Code",
        qrHeader: "Your QR Code",
        qrMessage: "This is the QR code for invitation ID: {invitationId}. Please save it for entry to the 'ICCD Annual Reception'.",
        qrDownloadButton: "Download QR Code",
        errorHeader: "Error",
        errorMissingToken: "Invitation token is missing.",
        errorInvalidToken: "Invalid invitation or already responded.",
        errorInvalidQrToken: "Invalid invitation or not yet confirmed.",
        errorServer: "Server error. Please try again later."
    },
    fr: {
        confirmTitle: "Présence confirmée",
        confirmHeader: "Votre présence a été confirmée avec succès !",
        confirmMessage: "Les détails de votre invitation et votre code QR ont été envoyés dans un e-mail séparé.",
        declineTitle: "Refusé",
        declineHeader: "Votre refus a été enregistré.",
        declineMessage: "Merci de nous en avoir informé. Nous espérons vous voir lors de nos prochains événements.",
        qrTitle: "Code QR",
        qrHeader: "Votre Code QR",
        qrMessage: "Ceci est le code QR pour l'invitation ID : {invitationId}. Veuillez le conserver pour l'entrée à « la Réception Annuelle de la CICD ».",
        qrDownloadButton: "Télécharger le code QR",
        errorHeader: "Erreur",
        errorMissingToken: "Le jeton d'invitation est manquant.",
        errorInvalidToken: "Invitation invalide ou déjà répondue.",
        errorInvalidQrToken: "Invitation invalide ou non encore confirmée.",
        errorServer: "Erreur du serveur. Veuillez réessayer plus tard."
    }
};

// Query to get candidate's language using the invitation token
const GET_CANDIDATE_AND_INVITATION_DETAILS_BY_TOKEN = `
    SELECT i.invitation_id, c.candidate_id, c.email, c.first_name, c.language
    FROM event_invitations i
    JOIN candidates c ON i.candidate_id = c.candidate_id
    WHERE i.invitation_token = $1;
`;

// Helper function to generate the HTML for browser pages
const generateHtmlPage = (lang, title, bodyContent, token) => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const textAlign = lang === 'ar' ? 'right' : 'left';
    const otherLangs = ['ar', 'en', 'fr'].filter(l => l !== lang);
    const langLinks = otherLangs.map(l => `<a href="?token=${token}&lang=${l}" class="lang-link">${l.toUpperCase()}</a>`).join(' | ');
    return `
        <!DOCTYPE html>
        <html lang="${lang}" dir="${dir}">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; text-align: ${textAlign}; background-color: #f1f2f2; margin: 0; padding: 2rem; }
                .container { max-width: 600px; margin: 1rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                h1 { color: #1b2a39; margin-bottom: 1rem; } p { color: #414042; margin-bottom: 1rem; }
                img { border-radius: 8px; border: 2px solid #15a9b2; padding: 10px; margin: 1rem 0; background: #fff; max-width: 80%; height: auto; }
                .download-btn { display: inline-block; background-color: #15a9b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; transition: background-color 0.3s; }
                .download-btn:hover { background-color: #0f7a81; } .lang-switcher { position: absolute; top: 15px; ${lang === 'ar' ? 'left: 15px;' : 'right: 15px;'} font-size: 14px; }
                .lang-link { color: #414042; text-decoration: none; font-weight: bold; } .lang-link:hover { text-decoration: underline; }
            </style>
        </head>
        <body><div class="lang-switcher">${langLinks}</div><div class="container">${bodyContent}</div></body>
        </html>`;
};

async function handleConfirmInvitation(req, res) {
    const { token, lang: langOverride } = req.query;
    const t = (key, lang) => translations[lang]?.[key] || translations['en'][key];
    if (!token) {
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorMissingToken', 'en')}</p>`, token);
        return res.status(400).send(errorHtml);
    }

    const finalConfirmationEmail = {
        ar: {
            subject: "تأكيد حضورك: حفل الاستقبال السنوي للغرفة الإسلامية",
            html: (qrLink) => `<div style="text-align: right; font-family: 'Cairo', sans-serif; direction: rtl; white-space: pre-wrap;">شكرًا للتسجيل!
نتطلع إلى لقائكم في "حفل الاستقبال السنوي للغرفة الإسلامية" يوم الأحد الموافق 14 سبتمبر 2025، في تمام الساعة 5 مساءً، بقاعة ماجنيتا - فندق فيرمونت نايل سيتي - القاهرة.

الدخول متاح حصرياً عبر رمز الاستجابة السريعة.
<a href="${qrLink}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">إظهار رمز الاستجابة السريعة</a>

للمزيد من التفاصيل، يُرجى التواصل عبر:
ت: ‪(+2) 01148601759‬
  ‪(+2) 01004816779</div>`
        },
        en: {
            subject: "Attendance Confirmed: ICCD Annual Reception",
            html: (qrLink) => `<div style="text-align: left; font-family: 'Cairo', sans-serif; white-space: pre-wrap;">Thank you for your registration. We look forward to welcoming you to "ICCD Annual Reception" on Sunday, September 14, 2025, at 5:00 PM, at the Magenta Ballroom, Fairmont Nile City Hotel, Cairo.

Entry is available exclusively via QR code.
<a href="${qrLink}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Show My QR Code</a>

For more details, please contact:
Tel: ‪(+2) 01148601759‬ 
      ‪(+2) 01004816779</div>`
        },
        fr: {
            subject: "Présence confirmée : Réception Annuelle de la CICD",
            html: (qrLink) => `<div style="text-align: left; font-family: 'Cairo', sans-serif; white-space: pre-wrap;">Merci pour votre inscription. Nous nous réjouissons de vous accueillir à « la Réception Annuelle de la CICD », qui aura lieu le dimanche 14 septembre 2025 à 17h00, à la salle « Magenta Ballroom » de l’Hôtel de Fairmont Nile City, au Caire.

L'entrée est disponible exclusively via QR code.
<a href="${qrLink}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Afficher mon code QR</a>

Pour en savoir plus, veuillez contacter : 
Tél : ‪(+2) 01148601759‬ 
       ‪(+2) 01004816779</div>`
        }
    };

    try {
        const updateResult = await db.query(`UPDATE event_invitations SET state = 'Accepted', responded_at = NOW() WHERE invitation_token = $1 RETURNING candidate_id;`, [token]);
        if (updateResult.rowCount === 0) {
            const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorInvalidToken', 'en')}</p>`, token);
            return res.status(404).send(errorHtml);
        }

        const { candidate_id } = updateResult.rows[0];
        const candidateDetails = await db.query(`SELECT email, language FROM candidates WHERE candidate_id = $1`, [candidate_id]);
        const candidate = candidateDetails.rows[0];
        
        const lang = langOverride || candidate.language || 'en';
        
        const backendBaseUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/api/invitations`;
        const qrCodeLink = `${backendBaseUrl}/show-qrcode?token=${token}&lang=${lang}`;

        // **FIX:** Use the new, multilingual email template
        const emailTemplate = finalConfirmationEmail[lang];
        await emailService.sendPersonalizedEmail(candidate.email, emailTemplate.subject, emailTemplate.html(qrCodeLink));

        // Generate the multilingual browser page
        const bodyContent = `<h1>${t('confirmHeader', lang)}</h1><p>${t('confirmMessage', lang)}</p>`;
        const responseHtml = generateHtmlPage(lang, t('confirmTitle', lang), bodyContent, token);
        return res.status(200).send(responseHtml);

    } catch (error) {
        console.error("Error confirming invitation:", error);
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorServer', 'en')}</p>`, token);
        return res.status(500).send(errorHtml);
    }
}

async function handleDeclineInvitation(req, res) {
    const { token, lang: langOverride } = req.query;
    const t = (key, lang) => translations[lang]?.[key] || translations['en'][key];
    if (!token) {
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorMissingToken', 'en')}</p>`, token);
        return res.status(400).send(errorHtml);
    }
    try {
        const updateResult = await db.query(`UPDATE event_invitations SET state = 'Rejected', responded_at = NOW() WHERE invitation_token = $1 RETURNING candidate_id;`, [token]);
        if (updateResult.rowCount === 0) {
            const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorInvalidToken', 'en')}</p>`, token);
            return res.status(404).send(errorHtml);
        }
        
        const { candidate_id } = updateResult.rows[0];
        const candidateDetails = await db.query(`SELECT email, language FROM candidates WHERE candidate_id = $1`, [candidate_id]);
        const candidate = candidateDetails.rows[0];
        
        const lang = langOverride || candidate.language || 'en';
        
        const declineHtml = `<div style="text-align: center; font-family: 'Cairo', sans-serif;"><h1>تم تسجيل رفضك.</h1><p>شكراً لإعلامنا. نأمل أن نراك في أحداثنا المستقبلية.</p></div>`;
        await emailService.sendPersonalizedEmail(candidate.email, 'تسجيل رفض الدعوة', declineHtml);

        const bodyContent = `<h1>${t('declineHeader', lang)}</h1><p>${t('declineMessage', lang)}</p>`;
        const responseHtml = generateHtmlPage(lang, t('declineTitle', lang), bodyContent, token);
        return res.status(200).send(responseHtml);
    } catch (error) {
        console.error("Error declining invitation:", error);
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorServer', 'en')}</p>`, token);
        return res.status(500).send(errorHtml);
    }
}

async function handleShowQrCode(req, res) {
    const { token, lang: langOverride } = req.query;
    const t = (key, lang, replacements = {}) => {
        let text = translations[lang]?.[key] || translations['en'][key];
        Object.keys(replacements).forEach(r => { text = text.replace(`{${r}}`, replacements[r]); });
        return text;
    };
    if (!token) {
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorMissingToken', 'en')}</p>`, token);
        return res.status(400).send(errorHtml);
    }
    try {
        const result = await db.query(GET_CANDIDATE_AND_INVITATION_DETAILS_BY_TOKEN, [token]);
        if (result.rowCount === 0) {
            const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorInvalidQrToken', 'en')}</p>`, token);
            return res.status(404).send(errorHtml);
        }
        const { invitation_id, language } = result.rows[0];
        const lang = langOverride || language || 'en';
        const qrCodeDataUrl = await QRCode.toDataURL(invitation_id);
        const bodyContent = `
            <h1>${t('qrHeader', lang)}</h1>
            <p>${t('qrMessage', lang, { invitationId: invitation_id })}</p>
            <img src="${qrCodeDataUrl}" alt="QR Code"><br/>
            <a href="${qrCodeDataUrl}" download="rams-qrcode-${invitation_id}.png" class="download-btn">${t('qrDownloadButton', lang)}</a>`;
        const htmlPage = generateHtmlPage(lang, t('qrTitle', lang), bodyContent, token);
        return res.status(200).send(htmlPage);
    } catch (error) {
        console.error("Error serving QR code page:", error);
        const errorHtml = generateHtmlPage('en', 'Error', `<h1>${t('errorHeader', 'en')}</h1><p>${t('errorServer', 'en')}</p>`, token);
        return res.status(500).send(errorHtml);
    }
}

async function sendInvitations(req, res) {
    const { candidateIds, eventId } = req.body;
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0 || !eventId) {
        return res.status(400).json({ status: 'ERROR', message: 'Missing required fields.' });
    }

    const successfulRecipients = [];
    const failedRecipients = [];
    const backendBaseUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/api/invitations`;

    const invitationEmail = {
        ar: {
            subject: "دعوة إلى: حفل الاستقبال السنوي للغرفة الإسلامية",
            greeting: "مرحباً",
            body: "لقد تلقيت دعوة لحضور \"حفل الاستقبال السنوي للغرفة الإسلامية\" يوم الأحد، 14 سبتمبر 2025، الساعة 5:00 مساءً في فندق فيرمونت نايل سيتي، القاهرة. يرجى تسجيل استجابتك.",
            accept: "قبول الدعوة",
            decline: "رفض الدعوة"
        },
        en: {
            subject: "Invitation to: ICCD Annual Reception",
            greeting: "Hello",
            body: "You have received an invitation to attend the \"ICCD Annual Reception\" on Sunday, September 14, 2025, at 5:00 PM at the Fairmont Nile City Hotel, Cairo. Please register your response.",
            accept: "Accept Invitation",
            decline: "Decline Invitation"
        },
        fr: {
            subject: "Invitation à : la Réception Annuelle de la CICD",
            greeting: "Bonjour",
            body: "Vous avez reçu une invitation pour assister à « la Réception Annuelle de la CICD » le dimanche 14 septembre 2025, à 17h00 à l'Hôtel Fairmont Nile City, Le Caire. Veuillez enregistrer votre réponse.",
            accept: "Accepter l'invitation",
            decline: "Refuser l'invitation"
        }
    };

    try {
        const sendPromises = candidateIds.map(async (candidateId) => {
            try {
                const candidateResult = await db.query(db.GET_CANDIDATE_DETAILS_BY_ID, [candidateId]);
                const candidate = candidateResult.rows[0];
                if (!candidate || !candidate.email) { throw new Error(`Candidate ID ${candidateId} has no valid email.`); }

                const lang = ['ar', 'en', 'fr'].includes(candidate.language) ? candidate.language : 'en';
                const t = invitationEmail[lang];

                const upsertResult = await db.query(db.UPSERT_INVITATION_QUERY, [candidateId, eventId]);
                const invitationToken = upsertResult.rows[0].invitation_token;
                const confirmUrl = `${backendBaseUrl}/confirm?token=${invitationToken}`;
                const declineUrl = `${backendBaseUrl}/decline?token=${invitationToken}`;

                const htmlBody = `
                    <div style="text-align: center; font-family: 'Cairo', sans-serif;" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
                        <h1>${t.greeting} ${candidate.first_name}!</h1>
                        <p>${t.body}</p>
                        <p>
                            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #15a9b2; color: white; text-decoration: none; border-radius: 8px; margin: 5px;">${t.accept}</a>
                            <a href="${declineUrl}" style="display: inline-block; padding: 12px 24px; background-color: #e53e3e; color: white; text-decoration: none; border-radius: 8px; margin: 5px;">${t.decline}</a>
                        </p>
                    </div>`;

                await emailService.sendPersonalizedEmail(candidate.email, t.subject, htmlBody);
                successfulRecipients.push(candidate.email);
            } catch (error) {
                console.error(`Failed to send invitation to candidate ID ${candidateId}:`, error.message);
                failedRecipients.push(candidateId);
            }
        });

        await Promise.all(sendPromises);

        if (successfulRecipients.length > 0) {
            return res.status(200).json({ status: 'SUCCESS', message: `Sent ${successfulRecipients.length} invitation(s).`, excluded_recipients: failedRecipients });
        } else {
            return res.status(500).json({ status: 'ERROR', message: 'Failed to send any invitations.', excluded_recipients: failedRecipients });
        }
    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ status: 'ERROR', message: 'Internal server error.' });
    }
}

module.exports = {
    sendInvitations,
    handleConfirmInvitation,
    handleDeclineInvitation,
    handleShowQrCode
};