// Authentication Types
export interface EmailSignInData {
    email: string
    password: string
}

export interface EmailSignUpData extends EmailSignInData {
    username: string
    nickname?: string
}

export interface WalletSignInData {
    address: string
    signature: string
    message: string
}

export interface AuthResponse {
    user: {
        id: string
        email?: string
        walletAddress?: string
        username: string
        nickname?: string
        avatar?: string
    }
    token?: string
}

// Error Types
export interface AuthError {
    code: string
    message: string
}

// Session Types
export interface Session {
    user: {
        id: string
        email?: string
        walletAddress?: string
        username: string
    }
    expires: string
} 