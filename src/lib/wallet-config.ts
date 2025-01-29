import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
    BackpackWalletAdapter,
    BraveWalletAdapter,
    CoinbaseWalletAdapter,
    ExodusWalletAdapter,
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'

export function getWallets(network: WalletAdapterNetwork = WalletAdapterNetwork.Devnet) {
    return [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new BackpackWalletAdapter(),
        new CoinbaseWalletAdapter(),
        new BraveWalletAdapter(),
        new ExodusWalletAdapter(),
        new TorusWalletAdapter(),
    ]
}

export const SUPPORTED_WALLETS = [
    {
        name: 'Phantom',
        icon: '/wallets/phantom.svg',
        url: 'https://phantom.app/',
    },
    {
        name: 'Solflare',
        icon: '/wallets/solflare.svg',
        url: 'https://solflare.com/',
    },
    {
        name: 'Backpack',
        icon: '/wallets/backpack.svg',
        url: 'https://backpack.app/',
    },
    {
        name: 'Coinbase',
        icon: '/wallets/coinbase.svg',
        url: 'https://www.coinbase.com/wallet',
    },
    {
        name: 'Brave',
        icon: '/wallets/brave.svg',
        url: 'https://brave.com/wallet/',
    },
    {
        name: 'Exodus',
        icon: '/wallets/exodus.svg',
        url: 'https://www.exodus.com/',
    },
    {
        name: 'Torus',
        icon: '/wallets/torus.svg',
        url: 'https://tor.us/',
    },
] 