'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWallet } from '@/hooks/use-wallet'
import { formatError } from '@/lib/utils'
import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface WalletSelectProps {
    trigger?: React.ReactNode
}

const WALLETS = [
    {
        name: 'Phantom',
        url: 'https://phantom.app',
    },
    {
        name: 'Solflare',
        url: 'https://solflare.com',
    },
]

export function WalletSelect({ trigger }: WalletSelectProps) {
    const { connect } = useWallet()
    const [isOpen, setIsOpen] = useState(false)

    const handleConnect = async (name: string) => {
        try {
            await connect(name)
            toast.success('Wallet connected')
        } catch (error) {
            toast.error(formatError(error))
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect wallet
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {WALLETS.map((wallet) => (
                    <DropdownMenuItem
                        key={wallet.name}
                        onClick={() => handleConnect(wallet.name)}
                    >
                        {wallet.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 