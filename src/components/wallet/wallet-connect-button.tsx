'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WalletSelect } from '@/components/wallet/wallet-select'
import { useWallet } from '@/hooks/use-wallet'
import { formatError } from '@/lib/utils'
import { ChevronDown, Copy, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function WalletConnectButton() {
    const { connected, publicKey, disconnect } = useWallet()

    const handleDisconnect = async () => {
        try {
            await disconnect()
            toast.success('Wallet disconnected')
        } catch (error) {
            toast.error(formatError(error))
        }
    }

    if (!connected || !publicKey) {
        return <WalletSelect />
    }

    const address = publicKey.toBase58()
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    {shortAddress}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(address)
                        toast.success('Address copied to clipboard')
                    }}
                >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDisconnect}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 