'use client'

import '@/app/globals.css'
import { BlockchainProvider } from '@/components/providers/blockchain-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ToastProvider } from '@/components/toast-provider'
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'
import { WalletProvider } from '@/components/wallet/wallet-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <WalletProvider>
            <BlockchainProvider>
              <header className="flex items-center justify-between border-b px-4 py-3">
                <h1 className="text-xl font-semibold">SoulPet</h1>
                <WalletConnectButton />
              </header>
              <main className="container py-6">{children}</main>
              <ToastProvider />
            </BlockchainProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
