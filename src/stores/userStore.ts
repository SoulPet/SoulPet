import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

interface UserState {
  publicKey: PublicKey | null;
  balance: number;
  setPublicKey: (key: PublicKey | null) => void;
  setBalance: (amount: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  publicKey: null,
  balance: 0,
  setPublicKey: (key) => set({ publicKey: key }),
  setBalance: (amount) => set({ balance: amount }),
})); 