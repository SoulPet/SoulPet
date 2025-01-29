export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID as string;
export const NFT_STORAGE_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY as string;

export const NETWORKS = {
  MAINNET: 'mainnet-beta',
  DEVNET: 'devnet',
  TESTNET: 'testnet',
} as const; 