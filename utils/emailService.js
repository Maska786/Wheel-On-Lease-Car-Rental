const nodemailer = require("nodemailer");

// Initialize transporter utilizing .env environmental controls
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL || "your-email@gmail.com",
        pass: process.env.SMTP_PASSWORD || "your-app-password"
    }
});

/**
 * Dispatches an HTML embedded OTP message directly to the registered admin.
 * @param {string} email - Destination address
 * @param {string} otp - 6 digit security code
 * @returns {boolean} - Delivery status indicator
 */
const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"Wheels On Lease Security Configurator" <${process.env.SMTP_EMAIL || 'security@wheelsonlease.com'}>`,
            to: email,
            subject: "MANDATORY: Authentication Security Code (OTP)",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #d4af37; border-radius: 12px; background-color: #0d0d0d; color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #d4af37; margin: 0; letter-spacing: 2px;">WHEELS ON LEASE</h2>
                        <span style="color: #888; font-size: 12px; letter-spacing: 1px;">SECURITY PROTOCOL</span>
                    </div>
                    <hr style="border: 0; border-top: 1px solid rgba(212, 175, 55, 0.3); margin-bottom: 20px;">

                    <p style="font-size: 16px; font-weight: normal; line-height: 1.6;">Identity Authentication Check Triggered,</p>
                    <p style="font-size: 16px; font-weight: normal; line-height: 1.6;">You have initiated a critical system action requiring dynamic verification. Please insert the generated security code below back into the administrative portal terminal:</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <span style="display: inline-block; padding: 15px 40px; font-size: 32px; font-weight: bold; background-color: rgba(212, 175, 55, 0.1); border: 2px dashed #d4af37; letter-spacing: 8px; color: #d4af37; border-radius: 8px;">
                            ${otp}
                        </span>
                    </div>

                    <p style="font-size: 14px; color: #aaaaaa; line-height: 1.5;">This transmission will self-invalidate in precisely 10 minutes. If this request was not manually initiated by you, please audit your administrative console immediately.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Transmission securely routed! Message ID:", info.messageId);
        return true;
    } catch (error) {
        console.error("Nodemailer delivery failure. Ensure .env SMTP credentials are fully aligned.", error.message);
        return false;
    }
};

module.exports = { sendOTP };
