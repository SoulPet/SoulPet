import nodemailer from 'nodemailer'

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Send password reset email
export async function sendResetPasswordEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Reset Your SoulPet Password',
        html: `
      <h1>Reset Your Password</h1>
      <p>You have requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `,
    }

    await transporter.sendMail(mailOptions)
}

// Send email verification
export async function sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Verify Your SoulPet Email',
        html: `
      <h1>Verify Your Email</h1>
      <p>Thank you for registering with SoulPet. Please click the link below to verify your email:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>If you did not create an account, please ignore this email.</p>
    `,
    }

    await transporter.sendMail(mailOptions)
}

// Send 2FA setup instructions
export async function send2FASetupEmail(email: string, secret: string, qrCode: string) {
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Set Up Two-Factor Authentication for SoulPet',
        html: `
      <h1>Set Up Two-Factor Authentication</h1>
      <p>Scan the QR code below with your authenticator app:</p>
      <img src="${qrCode}" alt="2FA QR Code" />
      <p>Or enter this code manually: ${secret}</p>
      <p>If you did not request this, please contact support immediately.</p>
    `,
    }

    await transporter.sendMail(mailOptions)
} 