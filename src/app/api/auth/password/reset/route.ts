import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json()

        // Find user with valid reset token
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await hashPassword(password)

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        })

        return NextResponse.json({
            message: 'Password successfully reset',
        })
    } catch (error) {
        console.error('Password reset error:', error)
        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        )
    }
} 