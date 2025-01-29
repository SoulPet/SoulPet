import { signUpWithEmail } from '@/lib/auth'
import { EmailSignUpData } from '@/types/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const data: EmailSignUpData = await request.json()
        const result = await signUpWithEmail(data)
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Something went wrong' },
            { status: 400 }
        )
    }
} 