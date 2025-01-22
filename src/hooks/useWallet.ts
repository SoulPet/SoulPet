import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
    PhantomWalletAdapter,
    SolflareWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// 导入钱包适配器样式
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletContextProviderProps {
    children: ReactNode;
    endpoint?: string;
}

/**
 * 钱包上下文提供者组件
 * @param props - 组件属性
 * @returns React组件
 */
const WalletContextProvider: FC<WalletContextProviderProps> = ({ 
    children,
    endpoint = clusterApiUrl('devnet') 
}) => {
    // 初始化钱包适配器
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default WalletContextProvider; 