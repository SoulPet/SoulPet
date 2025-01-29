import { Button } from '@/components/ui/button'
import { WalletSignInData } from '@/types/auth'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useCallback } from 'react'

interface WalletSignInProps {
    onSignIn: (data: WalletSignInData) => Promise<void>
    isLoading?: boolean
}

export function WalletSignIn({ onSignIn, isLoading }: WalletSignInProps) {
    const { publicKey, signMessage } = useWallet()

    const handleSignIn = useCallback(async () => {
        if (!publicKey || !signMessage) return

        try {
            // Create message to sign
            const message = new TextEncoder().encode(
                `Sign this message to authenticate with SoulPet\nTimestamp: ${Date.now()}`
            )

            // Request signature from wallet
            const signature = await signMessage(message)

            // Send signature to backend
            await onSignIn({
                address: publicKey.toBase58(),
                signature: Buffer.from(signature).toString('hex'),
                message: Buffer.from(message).toString(),
            })
        } catch (error) {
            console.error('Error signing message:', error)
        }
    }, [publicKey, signMessage, onSignIn])

    return (
        <div className="space-y-4">
            <WalletMultiButton className="w-full" />
            {publicKey && (
                <Button
                    onClick={handleSignIn}
                    className="w-full"
                    disabled={isLoading || !publicKey}
                >
                    {isLoading ? 'Signing in...' : 'Sign in with wallet'}
                </Button>
            )}
        </div>
    )
} 