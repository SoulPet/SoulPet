import {
    Metaplex,
    MetaplexFile,
    Nft,
    toMetaplexFile,
    walletAdapterIdentity,
} from '@metaplex-foundation/js';
import {
    createAssociatedTokenAccountInstruction,
    createBurnInstruction,
    createMint,
    createMintToInstruction,
    createTransferInstruction,
    getAccount,
    getAssociatedTokenAddress,
    getMint,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
    Commitment,
    CompiledInstruction,
    Connection,
    LAMPORTS_PER_SOL,
    MessageV0,
    PartiallyDecodedInstruction,
    PublicKey,
    SystemProgram,
    Transaction,
    VersionedMessage,
} from '@solana/web3.js';
import { NFTDisplay, NFTMetadata } from './nft';

export interface BlockchainConfig {
    endpoint: string;
    commitment?: Commitment;
}

export interface TransactionOptions {
    commitment?: Commitment;
    maxRetries?: number;
}

export interface TokenInfo {
    address: string;
    decimals: number;
    supply: bigint;
    authority: string;
    frozenSupply: bigint;
}

export interface TokenBalance {
    mint: string;
    amount: bigint;
    decimals: number;
}

export interface TransactionDetails {
    signature: string;
    timestamp: number;
    type:
    | 'mint'
    | 'transfer'
    | 'burn'
    | 'unknown'
    | 'createToken'
    | 'mintToken'
    | 'burnToken'
    | 'transferToken';
    status: 'success' | 'failure';
    from?: string;
    to?: string;
    mintAddress?: string;
    amount?: string;
    error?: string;
    programId?: string;
    instructions?: Array<{
        programId: string;
        data: string;
    }>;
}

export class BlockchainService {
    private static instance: BlockchainService;
    private connection: Connection;
    private metaplex: Metaplex | null = null;

    private constructor(config: BlockchainConfig) {
        this.connection = new Connection(config.endpoint, config.commitment);
    }

    static getInstance(config: BlockchainConfig): BlockchainService {
        if (!BlockchainService.instance) {
            BlockchainService.instance = new BlockchainService(config);
        }
        return BlockchainService.instance;
    }

    // Set wallet
    setWallet(wallet: WalletContextState) {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        this.metaplex = Metaplex.make(this.connection).use(
            walletAdapterIdentity(wallet)
        );
    }

    // Get account balance
    async getBalance(address: string): Promise<number> {
        const publicKey = new PublicKey(address);
        const balance = await this.connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    }

    // Transfer SOL
    async transferSOL(
        wallet: WalletContextState,
        to: string,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(to),
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTx = await wallet.signTransaction!(transaction);
        const signature = await this.connection.sendRawTransaction(
            signedTx.serialize()
        );

        if (options?.commitment) {
            await this.connection.confirmTransaction(signature, options.commitment);
        }

        return signature;
    }

    // Create NFT
    async createNFT(metadata: NFTMetadata): Promise<string> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        // Process image file
        let imageFile: MetaplexFile | string;
        if (metadata.image instanceof File) {
            const buffer = await metadata.image.arrayBuffer();
            imageFile = toMetaplexFile(Buffer.from(buffer), metadata.image.name);
        } else {
            imageFile = metadata.image;
        }

        // Upload metadata to Arweave
        const { uri } = await this.metaplex.nfts().uploadMetadata({
            name: metadata.name,
            description: metadata.description,
            image: imageFile,
            attributes: metadata.attributes.map((attr) => ({
                trait_type: attr.trait_type,
                value: attr.value.toString(),
            })),
        });

        // Create NFT
        const { nft } = await this.metaplex.nfts().create({
            uri,
            name: metadata.name,
            sellerFeeBasisPoints: 0,
        });

        return nft.address.toBase58();
    }

    // Batch create NFTs
    async batchCreateNFTs(metadataList: NFTMetadata[]): Promise<string[]> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const results = await Promise.all(
            metadataList.map((metadata) => this.createNFT(metadata))
        );

        return results;
    }

    // Update NFT metadata
    async updateNFTMetadata(
        mintAddress: string,
        metadata: Partial<NFTMetadata>
    ): Promise<string> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const mint = new PublicKey(mintAddress);
        const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });

        // Process image file
        let imageFile: MetaplexFile | string | undefined;
        if (metadata.image instanceof File) {
            const buffer = await metadata.image.arrayBuffer();
            imageFile = toMetaplexFile(Buffer.from(buffer), metadata.image.name);
        } else {
            imageFile = metadata.image;
        }

        // Upload new metadata
        const { uri } = await this.metaplex.nfts().uploadMetadata({
            ...nft.json,
            name: metadata.name ?? nft.name,
            description: metadata.description ?? nft.json?.description,
            image: imageFile ?? nft.json?.image,
            attributes: metadata.attributes
                ? metadata.attributes.map((attr) => ({
                    trait_type: attr.trait_type,
                    value: attr.value.toString(),
                }))
                : nft.json?.attributes,
        });

        // Update NFT
        const { response } = await this.metaplex.nfts().update({
            nftOrSft: nft,
            uri,
        });

        return response.signature;
    }

    // Set NFT royalties
    async setNFTRoyalties(
        mintAddress: string,
        sellerFeeBasisPoints: number
    ): Promise<string> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const mint = new PublicKey(mintAddress);
        const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });

        const { response } = await this.metaplex.nfts().update({
            nftOrSft: nft,
            sellerFeeBasisPoints,
        });

        return response.signature;
    }

    // Batch transfer NFTs
    async batchTransferNFTs(
        transfers: Array<{
            mintAddress: string;
            toAddress: string;
        }>,
        options?: TransactionOptions
    ): Promise<string[]> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const results = await Promise.all(
            transfers.map(async ({ mintAddress, toAddress }) => {
                const mint = new PublicKey(mintAddress);
                const to = new PublicKey(toAddress);
                const nft = await this.metaplex
                    .nfts()
                    .findByMint({ mintAddress: mint });

                if (!nft) {
                    throw new Error(`NFT not found: ${mintAddress}`);
                }

                const { response } = await this.metaplex.nfts().transfer({
                    nftOrSft: nft as Nft,
                    toOwner: to,
                });

                if (options?.commitment) {
                    await this.connection.confirmTransaction(
                        response.signature,
                        options.commitment
                    );
                }

                return response.signature;
            })
        );

        return results;
    }

    // Batch burn NFTs
    async batchBurnNFTs(
        mintAddresses: string[],
        options?: TransactionOptions
    ): Promise<string[]> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const results = await Promise.all(
            mintAddresses.map(async (mintAddress) => {
                const mint = new PublicKey(mintAddress);
                const nft = await this.metaplex
                    .nfts()
                    .findByMint({ mintAddress: mint });

                if (!nft) {
                    throw new Error(`NFT not found: ${mintAddress}`);
                }

                const { response } = await this.metaplex.nfts().delete({
                    nftOrSft: nft as Nft,
                });

                if (options?.commitment) {
                    await this.connection.confirmTransaction(
                        response.signature,
                        options.commitment
                    );
                }

                return response.signature;
            })
        );

        return results;
    }

    // Get NFT details
    async getNFT(mintAddress: string): Promise<NFTDisplay | null> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        try {
            const mint = new PublicKey(mintAddress);
            const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });

            if (!nft.json) {
                return null;
            }

            return {
                mintAddress: nft.address.toBase58(),
                name: nft.name,
                description: nft.json.description || '',
                image: nft.json.image || '',
                attributes:
                    nft.json.attributes?.map((attr) => ({
                        trait_type: attr.trait_type || '',
                        value: attr.value || '',
                    })) || [],
            };
        } catch (error) {
            console.error('Failed to fetch NFT:', error);
            return null;
        }
    }

    // Get all NFTs for account
    async getNFTs(owner: string): Promise<NFTDisplay[]> {
        if (!this.metaplex) {
            throw new Error('Wallet not connected');
        }

        const ownerPublicKey = new PublicKey(owner);
        const nfts = await this.metaplex.nfts().findAllByOwner({
            owner: ownerPublicKey,
        });

        return nfts
            .filter((nft) => nft.json)
            .map((nft) => ({
                mintAddress: nft.address.toBase58(),
                name: nft.name,
                description: nft.json!.description || '',
                image: nft.json!.image || '',
                attributes:
                    nft.json!.attributes?.map((attr) => ({
                        trait_type: attr.trait_type || '',
                        value: attr.value || '',
                    })) || [],
            }));
    }

    // Create token
    async createToken(
        wallet: WalletContextState,
        decimals: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected');
        }

        // Create mint account
        const mint = await createMint(
            this.connection,
            {
                publicKey: wallet.publicKey,
                secretKey: new Uint8Array(32),
                sign: async (tx: Transaction) => {
                    tx = await wallet.signTransaction(tx);
                    return tx;
                },
            },
            wallet.publicKey,
            wallet.publicKey,
            decimals
        );

        if (options?.commitment) {
            await this.connection.confirmTransaction(
                mint.toString(),
                options.commitment
            );
        }

        return mint.toBase58();
    }

    // Get token info
    async getTokenInfo(mintAddress: string): Promise<TokenInfo> {
        const mint = new PublicKey(mintAddress);
        const info = await getMint(this.connection, mint);

        return {
            address: mintAddress,
            decimals: info.decimals,
            supply: info.supply,
            authority: info.mintAuthority?.toBase58() || '',
            frozenSupply: info.freezeAuthority ? BigInt(1) : BigInt(0),
        };
    }

    // Get token balance
    async getTokenBalance(
        owner: string,
        mintAddress: string
    ): Promise<TokenBalance> {
        const mint = new PublicKey(mintAddress);
        const ownerPubkey = new PublicKey(owner);

        const associatedToken = await getAssociatedTokenAddress(mint, ownerPubkey);
        const account = await getAccount(this.connection, associatedToken);
        const mintInfo = await getMint(this.connection, mint);

        return {
            mint: mintAddress,
            amount: account.amount,
            decimals: mintInfo.decimals,
        };
    }

    // Mint tokens
    async mintToken(
        wallet: WalletContextState,
        mintAddress: string,
        toAddress: string,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected');
        }

        const mint = new PublicKey(mintAddress);
        const destination = new PublicKey(toAddress);

        // Get token info
        const mintInfo = await getMint(this.connection, mint);
        const tokenAmount = amount * Math.pow(10, mintInfo.decimals);

        // Get or create associated account
        const associatedToken = await getAssociatedTokenAddress(mint, destination);
        let account;
        try {
            account = await getAccount(this.connection, associatedToken);
        } catch (error) {
            // If account does not exist, create a new associated account
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    destination,
                    mint
                )
            );

            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            await this.connection.sendRawTransaction(signedTx.serialize());
        }

        // Mint tokens
        const transaction = new Transaction().add(
            createMintToInstruction(
                mint,
                associatedToken,
                wallet.publicKey,
                BigInt(tokenAmount)
            )
        );

        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTx = await wallet.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(
            signedTx.serialize()
        );

        if (options?.commitment) {
            await this.connection.confirmTransaction(signature, options.commitment);
        }

        return signature;
    }

    // Transfer tokens
    async transferToken(
        wallet: WalletContextState,
        mintAddress: string,
        toAddress: string,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected');
        }

        const mint = new PublicKey(mintAddress);
        const destination = new PublicKey(toAddress);

        // Get token info
        const mintInfo = await getMint(this.connection, mint);
        const tokenAmount = amount * Math.pow(10, mintInfo.decimals);

        // Get source account and destination account associated account addresses
        const sourceAssociatedToken = await getAssociatedTokenAddress(
            mint,
            wallet.publicKey
        );
        const destinationAssociatedToken = await getAssociatedTokenAddress(
            mint,
            destination
        );

        // Check if destination account exists, if not create
        let account;
        try {
            account = await getAccount(this.connection, destinationAssociatedToken);
        } catch (error) {
            // If account does not exist, create a new associated account
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    destinationAssociatedToken,
                    destination,
                    mint
                )
            );

            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            await this.connection.sendRawTransaction(signedTx.serialize());
        }

        // Transfer tokens
        const transaction = new Transaction().add(
            createTransferInstruction(
                sourceAssociatedToken,
                destinationAssociatedToken,
                wallet.publicKey,
                BigInt(tokenAmount)
            )
        );

        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTx = await wallet.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(
            signedTx.serialize()
        );

        if (options?.commitment) {
            await this.connection.confirmTransaction(signature, options.commitment);
        }

        return signature;
    }

    // Burn tokens
    async burnToken(
        wallet: WalletContextState,
        mintAddress: string,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected');
        }

        const mint = new PublicKey(mintAddress);

        // Get token info
        const mintInfo = await getMint(this.connection, mint);
        const tokenAmount = amount * Math.pow(10, mintInfo.decimals);

        // Get associated account address
        const associatedToken = await getAssociatedTokenAddress(
            mint,
            wallet.publicKey
        );

        // Burn tokens
        const transaction = new Transaction().add(
            createBurnInstruction(
                associatedToken,
                mint,
                wallet.publicKey,
                BigInt(tokenAmount)
            )
        );

        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTx = await wallet.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(
            signedTx.serialize()
        );

        if (options?.commitment) {
            await this.connection.confirmTransaction(signature, options.commitment);
        }

        return signature;
    }

    // Get transaction history (enhanced version)
    async getTransactionHistory(
        address: string,
        limit = 10
    ): Promise<TransactionDetails[]> {
        const publicKey = new PublicKey(address);
        const signatures = await this.connection.getSignaturesForAddress(
            publicKey,
            { limit }
        );

        const transactions = await Promise.all(
            signatures.map(async (sig) => {
                try {
                    const tx = await this.connection.getTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0,
                    });

                    if (!tx) {
                        throw new Error('Transaction not found');
                    }

                    let type: TransactionDetails['type'] = 'unknown';
                    let from: string | undefined;
                    let to: string | undefined;
                    let mintAddress: string | undefined;
                    let amount: string | undefined;
                    let programId: string | undefined;

                    // Analyze transaction instructions
                    const message = tx.transaction.message;
                    const instructions = this.getInstructions(message);

                    const parsedInstructions = instructions.map((instruction) => ({
                        programId: this.getProgramId(instruction, message),
                        data: this.getInstructionData(instruction),
                    }));

                    // Analyze transaction type
                    for (const instruction of instructions) {
                        const program = this.getProgramId(instruction, message);
                        programId = program;

                        if (program === TOKEN_PROGRAM_ID.toBase58()) {
                            // Parse SPL Token instructions
                            const data = this.getInstructionData(instruction);

                            // Set transaction type based on instruction type
                            if (data[0] === 0) {
                                type = 'mintToken';
                            } else if (data[0] === 3) {
                                type = 'transferToken';
                            } else if (data[0] === 8) {
                                type = 'burnToken';
                            }

                            // Get account information
                            const accounts = this.getInstructionAccounts(
                                instruction,
                                message
                            );
                            if (accounts.length > 0) {
                                from = accounts[0];
                                to = accounts[1];
                                if (accounts[2]) {
                                    mintAddress = accounts[2];
                                }
                            }
                        } else if (program === SystemProgram.programId.toBase58()) {
                            // Parse system program instructions
                            type = 'transfer';
                            const accounts = this.getInstructionAccounts(
                                instruction,
                                message
                            );
                            if (accounts.length > 0) {
                                from = accounts[0];
                                to = accounts[1];
                            }
                        }
                    }

                    return {
                        signature: sig.signature,
                        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                        type,
                        status: tx.meta?.err ? 'failure' : 'success',
                        from,
                        to,
                        mintAddress,
                        amount,
                        programId,
                        instructions: parsedInstructions,
                        error: tx.meta?.err ? tx.meta.err.toString() : undefined,
                    };
                } catch (error) {
                    console.error('Failed to fetch transaction:', error);
                    return {
                        signature: sig.signature,
                        timestamp: Date.now(),
                        type: 'unknown',
                        status: 'failure',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            })
        );

        return transactions;
    }

    // Helper method: Get transaction instructions
    private getInstructions(
        message: VersionedMessage
    ): Array<PartiallyDecodedInstruction | CompiledInstruction> {
        if ('instructions' in message) {
            return message.instructions;
        }
        if (message instanceof MessageV0) {
            return message.compiledInstructions;
        }
        return [];
    }

    // Helper method: Get program ID
    private getProgramId(
        instruction: PartiallyDecodedInstruction | CompiledInstruction,
        message: VersionedMessage
    ): string {
        if ('programId' in instruction) {
            return instruction.programId.toBase58();
        }
        const programId = message.staticAccountKeys[instruction.programIdIndex];
        return programId.toBase58();
    }

    // Helper method: Get instruction data
    private getInstructionData(
        instruction: PartiallyDecodedInstruction | CompiledInstruction
    ): Buffer {
        if ('data' in instruction) {
            return instruction.data;
        }
        return Buffer.from(instruction.data);
    }

    // Helper method: Get instruction accounts
    private getInstructionAccounts(
        instruction: PartiallyDecodedInstruction | CompiledInstruction,
        message: VersionedMessage
    ): string[] {
        if ('accounts' in instruction) {
            return instruction.accounts.map((account) => account.toBase58());
        }
        return instruction.accountKeyIndexes.map((index) =>
            message.staticAccountKeys[index].toBase58()
        );
    }
}

// Export singleton instance
export const blockchain = BlockchainService.getInstance({
    endpoint:
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    commitment: 'confirmed',
});
