import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '../common';

export const WalletButton: FC = () => {
  const { connected, connect, disconnect } = useWallet();

  return (
    <Button onClick={connected ? disconnect : connect}>
      {connected ? 'Disconnect' : 'Connect Wallet'}
    </Button>
  );
}; 