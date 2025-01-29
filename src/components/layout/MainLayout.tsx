import { FC, ReactNode } from 'react';
import { WalletButton } from '@/components/wallet';
import { Logo } from '@/components/common';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo size={40} />
            <h1 className="text-xl font-bold text-gray-900">SoulPet</h1>
          </div>
          <WalletButton />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}; 