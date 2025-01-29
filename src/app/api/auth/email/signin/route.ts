import { signInWithEmail } from '@/lib/auth'
import { EmailSignInData } from '@/types/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const data: EmailSignInData = await request.json()
        const result = await signInWithEmail(data)
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Something went wrong' },
            { status: 400 }
        )
    }
} 