'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface WalletGuideProps {
    trigger?: React.ReactNode
}

export function WalletGuide({ trigger }: WalletGuideProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Need Help?
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Wallet Connection Guide</DialogTitle>
                    <DialogDescription>
                        Learn how to connect your wallet and start using SoulPet
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="phantom" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="phantom">Phantom Wallet</TabsTrigger>
                        <TabsTrigger value="solflare">Solflare Wallet</TabsTrigger>
                    </TabsList>

                    <TabsContent value="phantom">
                        <div className="space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">1. Install Phantom Wallet</h3>
                                <p className="text-gray-600 mb-4">
                                    First, install the Phantom wallet extension from the official website
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open('https://phantom.app', '_blank')}
                                >
                                    Download Phantom
                                </Button>
                            </Card>

                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">2. Create or Import a Wallet</h3>
                                <p className="text-gray-600">
                                    After installation, create a new wallet or import an existing one
                                    by following Phantom's setup process
                                </p>
                            </Card>

                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">3. Connect to SoulPet</h3>
                                <p className="text-gray-600 mb-4">
                                    Click the "Connect Wallet" button and select Phantom from the list.
                                    Approve the connection request in your wallet.
                                </p>
                                <div className="text-sm text-gray-500">
                                    <p>Make sure:</p>
                                    <ul className="list-disc list-inside mt-2">
                                        <li>You're on the Solana network</li>
                                        <li>You have some SOL for transaction fees</li>
                                        <li>Your wallet is unlocked</li>
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="solflare">
                        <div className="space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">1. Install Solflare Wallet</h3>
                                <p className="text-gray-600 mb-4">
                                    First, install the Solflare wallet extension from the official website
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open('https://solflare.com', '_blank')}
                                >
                                    Download Solflare
                                </Button>
                            </Card>

                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">2. Create or Import a Wallet</h3>
                                <p className="text-gray-600">
                                    After installation, create a new wallet or import an existing one
                                    by following Solflare's setup process
                                </p>
                            </Card>

                            <Card className="p-4">
                                <h3 className="font-semibold mb-2">3. Connect to SoulPet</h3>
                                <p className="text-gray-600 mb-4">
                                    Click the "Connect Wallet" button and select Solflare from the list.
                                    Approve the connection request in your wallet.
                                </p>
                                <div className="text-sm text-gray-500">
                                    <p>Make sure:</p>
                                    <ul className="list-disc list-inside mt-2">
                                        <li>You're on the Solana network</li>
                                        <li>You have some SOL for transaction fees</li>
                                        <li>Your wallet is unlocked</li>
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Need Help?</h3>
                    <p className="text-sm text-gray-600">
                        If you're having trouble connecting your wallet or using SoulPet,
                        please check our FAQ or contact support.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
} 