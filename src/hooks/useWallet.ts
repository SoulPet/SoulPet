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
export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children, endpoint, network = 'devnet' }) => {
    // 如果没有提供endpoint，则使用默认的devnet节点
    const rpcEndpoint = useMemo(() => endpoint || clusterApiUrl(network), [endpoint, network]);

    // 初始化钱包适配器列表
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter()
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={rpcEndpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default WalletContextProvider;