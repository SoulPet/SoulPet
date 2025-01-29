'use client'

import { useWallet } from '@/components/providers/wallet-provider'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WalletGuide } from '@/components/wallet/wallet-guide'
import { useState } from 'react'

export function ConnectButton() {
    const { wallet, walletType, isConnecting, connect, disconnect } = useWallet()
    const [isOpen, setIsOpen] = useState(false)

    if (wallet && walletType) {
        return (
            <Button
                variant="outline"
                onClick={disconnect}
                disabled={isConnecting}
            >
                {isConnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
        )
    }

    return (
        <div className="flex items-center space-x-2">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="default" disabled={isConnecting}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => {
                            connect('phantom')
                            setIsOpen(false)
                        }}
                    >
                        Phantom
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            connect('solflare')
                            setIsOpen(false)
                        }}
                    >
                        Solflare
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <WalletGuide />
        </div>
    )
} 