import { FC, ReactNode } from 'react';
import { WalletButton } from '@/components/wallet';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <header className="p-4 flex justify-between items-center">
        <h1>SoulPet</h1>
        <WalletButton />
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default AuthLayout; 