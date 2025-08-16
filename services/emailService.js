// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../.env' });

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Use true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendInvitationEmails(recipients, subject, htmlBody) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipients.join(', '), // Nodemailer can take an array or a comma-separated string
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Emails sent successfully: %s", info.messageId);
        return { status: 'SUCCESS', message: 'Emails sent successfully.', info: info };
    } catch (error) {
        console.error("Error sending emails:", error);
        return { status: 'ERROR', message: 'Failed to send emails.' };
    }
}

// NEW: Function to send a single, personalized email
async function sendPersonalizedEmail(recipient, subject, htmlBody) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Personalized email sent to ${recipient}: %s`, info.messageId);
        return { status: 'SUCCESS', message: 'Email sent successfully.', info: info };
    } catch (error) {
        console.error(`Error sending personalized email to ${recipient}:`, error);
        return { status: 'ERROR', message: 'Failed to send personalized email.' };
    }
}


module.exports = {
    sendInvitationEmails,
    sendPersonalizedEmail // Export the new function
};