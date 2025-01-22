import { ReactNode } from 'react';
import WalletContextProvider from '@/hooks/useWallet';

export const metadata = {
  title: 'SoulPet',
  description: 'Your Digital Pet on Solana',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="zh">
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
