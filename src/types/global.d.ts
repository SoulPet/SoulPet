import { Wallet } from '@solana/wallet-adapter-react';

declare global {
  interface Window {
    solana?: Wallet;
  }
}

export {}; 