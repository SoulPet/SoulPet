import { PublicKey } from '@solana/web3.js';

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const isValidPublicKey = (key: string): boolean => {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}; 