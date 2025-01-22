import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    type Adapter 
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, type Cluster } from '@solana/web3.js';

// 导入钱包适配器样式
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * 钱包上下文提供者组件的属性接口
 * @interface WalletContextProviderProps
 */
interface WalletContextProviderProps {
    /** 子组件 */
    children: ReactNode;
    /** RPC节点地址，默认为 devnet */
    endpoint?: string;
    /** Solana网络类型，默认为 devnet */
    network?: Cluster;
}

/**
 * 钱包上下文提供者组件
 * 提供Solana钱包连接和管理功能，支持多个钱包适配器
 *
 * @component
 * @example
 * ```tsx
 * <WalletContextProvider>
 *   <App />
 * </WalletContextProvider>
 * ```
 */
const WalletContextProvider: FC<WalletContextProviderProps> = ({ 
    children,
    endpoint = clusterApiUrl('devnet'),
    network = 'devnet'
}): JSX.Element => {
    // 初始化钱包适配器列表
    const wallets = useMemo<Adapter[]>(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

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