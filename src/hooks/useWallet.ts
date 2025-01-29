'use client';

import {
    WalletDisconnectedError, WalletNotConnectedError,
    WalletNotReadyError, type WalletAdapterNetwork, type WalletError
} from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import {
    clusterApiUrl,
    type Commitment,
    type ConnectionConfig
} from '@solana/web3.js';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Props interface for the WalletContextProvider component
 */
interface Props {
    /** Child components */
    readonly children: ReactNode;
    /** RPC endpoint URL, defaults to devnet */
    readonly endpoint?: string;
    /** Solana network cluster, defaults to devnet */
    readonly network?: WalletAdapterNetwork;
    /** Transaction commitment level, defaults to confirmed */
    readonly commitment?: Commitment;
    /** Connection configuration options */
    readonly connectionConfig?: ConnectionConfig;
    /** Whether to auto-connect to the wallet */
    readonly autoConnect?: boolean;
    /** Error callback handler */
    readonly onError?: (error: WalletError) => void;
}

/**
 * Wallet Context Provider Component
 * Provides Solana wallet connection and management functionality
 * Supports multiple wallet adapters
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <WalletContextProvider>
 *   <App />
 * </WalletContextProvider>
 * 
 * // Custom configuration
 * <WalletContextProvider
 *   endpoint="https://api.mainnet-beta.solana.com"
 *   network="mainnet-beta"
 *   commitment="finalized"
 *   onError={(error) => console.error(error)}
 *   connectionConfig={{ wsEndpoint: "wss://api.mainnet-beta.solana.com" }}
 * >
 *   <App />
 * </WalletContextProvider>
 * ```
 */
export default function WalletContextProvider({
    children,
    endpoint = clusterApiUrl('devnet'),
    network = 'devnet' as WalletAdapterNetwork,
    commitment = 'confirmed',
    connectionConfig,
    autoConnect = true,
    onError,
}: Props): JSX.Element {
    const handleError = useCallback(
        (error: WalletError) => {
            if (error instanceof WalletNotConnectedError) {
                console.warn('Wallet not connected');
            } else if (error instanceof WalletNotReadyError) {
                console.warn('Wallet not ready');
            } else if (error instanceof WalletDisconnectedError) {
                console.warn('Wallet disconnected');
            } else {
                console.error('Wallet error:', error);
            }
            onError?.(error);
        },
        [onError],
    );

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter({ network }),
            new SolflareWalletAdapter({ network }),
        ],
        [network],
    );

    useEffect(() => {
        const config = { commitment, ...connectionConfig };
        console.debug('Network config updated:', { network, config });
    }, [network, commitment, connectionConfig]);

    return (
        <ConnectionProvider
            endpoint= { endpoint }
    config = {{ commitment, ...connectionConfig }
}
        >
    <WalletProvider
                wallets={ wallets }
autoConnect = { autoConnect }
onError = { handleError }
    >
    <WalletModalProvider>{ children } < /WalletModalProvider>
    < /WalletProvider>
    < /ConnectionProvider>
    );
} 