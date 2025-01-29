import { generateResetToken } from '@/lib/auth'
import { sendResetPasswordEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'No user found with this email' },
                { status: 404 }
            )
        }

        // Generate reset token and expiry
        const { token, expires } = generateResetToken()

        // Update user with reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        })

        // Send reset password email
        await sendResetPasswordEmail(user.email!, token)

        return NextResponse.json({
            message: 'Password reset email sent',
        })
    } catch (error) {
        console.error('Password reset error:', error)
        return NextResponse.json(
            { error: 'Failed to process password reset' },
            { status: 500 }
        )
    }
} 