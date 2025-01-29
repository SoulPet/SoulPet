import { signInWithWallet } from '@/lib/auth'
import { WalletSignInData } from '@/types/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const data: WalletSignInData = await request.json()
        const result = await signInWithWallet(data)
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Something went wrong' },
            { status: 400 }
        )
    }
} 