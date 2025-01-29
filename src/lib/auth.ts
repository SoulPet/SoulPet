import { AuthError, EmailSignInData, EmailSignUpData, WalletSignInData } from '@/types/auth'
import { compare, hash } from 'bcryptjs'
import { SigningKey } from 'ethers'
import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import { sendVerificationEmail } from './email'
import { prisma } from './prisma'

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SALT_ROUNDS = 10
const TOKEN_EXPIRY = '7d'
const RESET_TOKEN_EXPIRY = '1h'

// Helper Functions
export const hashPassword = async (password: string): Promise<string> => {
    return hash(password, SALT_ROUNDS)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return compare(password, hashedPassword)
}

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export const verifyToken = (token: string): { userId: string } => {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch (error) {
        throw new Error('Invalid token')
    }
}

export const generateResetToken = () => {
    const token = authenticator.generateSecret()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    return { token, expires }
}

export const generate2FASecret = () => {
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri('user', 'SoulPet', secret)

    return { secret, otpauth }
}

export const verify2FAToken = (token: string, secret: string): boolean => {
    return authenticator.verify({ token, secret })
}

// Session Management
export const createSession = async (userId: string, deviceInfo?: string, ipAddress?: string) => {
    const token = generateToken(userId)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const session = await prisma.session.create({
        data: {
            userId,
            token,
            deviceInfo,
            ipAddress,
            expiresAt,
        },
    })

    return session
}

export const invalidateSession = async (token: string) => {
    await prisma.session.update({
        where: { token },
        data: { isValid: false },
    })
}

export const validateSession = async (token: string) => {
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    })

    if (!session || !session.isValid || session.expiresAt < new Date()) {
        return null
    }

    return session
}

// Authentication Functions
export const signUpWithEmail = async (data: EmailSignUpData) => {
    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        })

        if (existingUser) {
            throw {
                code: 'AUTH_DUPLICATE_USER',
                message: 'Email or username already exists'
            } as AuthError
        }

        const hashedPassword = await hashPassword(data.password)
        const verifyToken = authenticator.generateSecret()

        const user = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                nickname: data.nickname,
                password: hashedPassword,
                emailVerifyToken: verifyToken,
            },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true
            }
        })

        // Send verification email
        await sendVerificationEmail(data.email, verifyToken)

        const session = await createSession(user.id)

        return {
            user,
            token: session.token
        }
    } catch (error) {
        throw error
    }
}

export const signInWithEmail = async (data: EmailSignInData) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: data.email }
        })

        if (!user) {
            throw {
                code: 'AUTH_USER_NOT_FOUND',
                message: 'User not found'
            } as AuthError
        }

        // Verify password (assuming password is stored in bio field temporarily)
        const isValid = await verifyPassword(data.password, user.bio || '')
        if (!isValid) {
            throw {
                code: 'AUTH_INVALID_CREDENTIALS',
                message: 'Invalid credentials'
            } as AuthError
        }

        const token = generateToken(user.id)

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar
            },
            token
        }
    } catch (error) {
        throw error
    }
}

export const signInWithWallet = async (data: WalletSignInData) => {
    try {
        // Verify signature
        const signingKey = new SigningKey(data.signature)
        const recoveredAddress = signingKey.recoverPublicKey(data.message)

        if (recoveredAddress.toLowerCase() !== data.address.toLowerCase()) {
            throw {
                code: 'AUTH_INVALID_SIGNATURE',
                message: 'Invalid signature'
            } as AuthError
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress: data.address }
        })

        if (!user) {
            // Create new user with wallet
            user = await prisma.user.create({
                data: {
                    walletAddress: data.address,
                    username: `user_${data.address.slice(2, 8)}`, // Generate username from address
                    isWalletVerified: true
                }
            })
        }

        const token = generateToken(user.id)

        return {
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar
            },
            token
        }
    } catch (error) {
        throw error
    }
} 