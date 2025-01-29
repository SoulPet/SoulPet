import {
    Metaplex,
    toMetaplexFile,
    TransferNftOutput,
} from '@metaplex-foundation/js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, createTransferInstruction, PublicKey, Transaction } from '@solana/web3.js';
import { NFTError, TransactionError, WalletError } from './error';

export interface NFTMetadata {
    name: string;
    description: string;
    image: string | File;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
}

export interface NFTDisplay extends NFTMetadata {
    mintAddress: string;
}

export class NFTService {
    private metaplex: Metaplex;
    private connection: Connection;

    constructor(connection: Connection) {
        this.metaplex = new Metaplex(connection);
        this.connection = connection;
    }

    setWallet(wallet: WalletContextState) {
        if (!wallet.publicKey) {
            throw new WalletError('Wallet not connected', 'not-connected');
        }

        try {
            this.metaplex.identity().setDriver({
                publicKey: wallet.publicKey,
                signMessage: wallet.signMessage!,
                signTransaction: wallet.signTransaction!,
                signAllTransactions: wallet.signAllTransactions!,
            });
        } catch (error) {
            throw new WalletError(
                'Failed to set wallet adapter',
                'connection-failed'
            );
        }
    }

    async uploadMetadata(metadata: NFTMetadata) {
        try {
            // Convert image file to Metaplex file
            let imageUri: string;
            if (metadata.image instanceof File) {
                const imageBuffer = await metadata.image.arrayBuffer();
                const metaplexImage = toMetaplexFile(
                    Buffer.from(imageBuffer),
                    metadata.image.name
                );
                // Upload image
                imageUri = await this.metaplex.storage().upload(metaplexImage);
            } else {
                imageUri = metadata.image;
            }

            // Upload metadata
            const { uri } = await this.metaplex.nfts().uploadMetadata({
                name: metadata.name,
                description: metadata.description,
                image: imageUri,
                attributes: metadata.attributes.map((attr) => ({
                    trait_type: attr.trait_type,
                    value: attr.value.toString(),
                })),
                properties: {
                    files: [
                        {
                            type:
                                metadata.image instanceof File
                                    ? metadata.image.type
                                    : 'image/*',
                            uri: imageUri,
                        },
                    ],
                },
            });

            return uri;
        } catch (error: any) {
            throw new NFTError(
                `Failed to upload metadata: ${error.message}`,
                'metadata-failed'
            );
        }
    }

    async mintNFT(
        metadataUri: string,
        options?: {
            maxSupply?: number;
            isMutable?: boolean;
        }
    ) {
        try {
            const { nft } = await this.metaplex.nfts().create({
                uri: metadataUri,
                name: '', // Name will be loaded from metadata
                sellerFeeBasisPoints: 0,
                maxSupply: options?.maxSupply,
                isMutable: options?.isMutable ?? true,
            });

            return nft;
        } catch (error: any) {
            throw new NFTError(`Failed to mint NFT: ${error.message}`, 'mint-failed');
        }
    }

    async getNFT(mintAddress: string) {
        try {
            const nft = await this.metaplex
                .nfts()
                .findByMint({ mintAddress: new PublicKey(mintAddress) });

            return nft;
        } catch (error: any) {
            throw new NFTError(`Failed to get NFT: ${error.message}`, 'not-found');
        }
    }

    async getNFTsByOwner(owner: PublicKey) {
        try {
            const nfts = await this.metaplex.nfts().findAllByOwner({ owner });

            return nfts;
        } catch (error: any) {
            throw new NFTError(
                `Failed to get NFTs: ${error.message}`,
                'fetch-failed'
            );
        }
    }

    /**
     * Transfer an NFT to another wallet address
     * @param wallet Connected wallet instance
     * @param mintAddress NFT mint address
     * @param toAddress Recipient wallet address
     * @returns Transaction signature
     */
    async transferNFT(
        wallet: WalletContextState,
        mintAddress: string,
        toAddress: string
    ): Promise<string> {
        try {
            if (!wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            // Get the token account
            const fromTokenAccount = await this.getTokenAccount(
                wallet.publicKey.toString(),
                mintAddress
            );

            if (!fromTokenAccount) {
                throw new Error('Token account not found');
            }

            // Create transfer instruction
            const transferInstruction = createTransferInstruction(
                fromTokenAccount.address,
                new PublicKey(toAddress),
                wallet.publicKey,
                1, // NFTs have amount of 1
                []
            );

            // Create and sign transaction
            const transaction = new Transaction().add(transferInstruction);
            const signature = await wallet.sendTransaction(
                transaction,
                this.connection
            );

            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');

            return signature;
        } catch (error) {
            console.error('Failed to transfer NFT:', error);
            throw error;
        }
    }

    /**
     * Get token account for a specific mint and owner
     * @param ownerAddress Owner's wallet address
     * @param mintAddress NFT mint address
     * @returns Token account info
     */
    private async getTokenAccount(
        ownerAddress: string,
        mintAddress: string
    ): Promise<{ address: PublicKey; amount: number } | null> {
        try {
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                new PublicKey(ownerAddress),
                { mint: new PublicKey(mintAddress) }
            );

            if (tokenAccounts.value.length === 0) {
                return null;
            }

            const tokenAccount = tokenAccounts.value[0];
            return {
                address: tokenAccount.pubkey,
                amount: Number(
                    tokenAccount.account.data.parsed.info.tokenAmount.amount
                ),
            };
        } catch (error) {
            console.error('Failed to get token account:', error);
            throw error;
        }
    }

    async burnNFT(mintAddress: string) {
        try {
            const nft = await this.getNFT(mintAddress);

            await this.metaplex.nfts().delete({
                mintAddress: nft.address,
            });
        } catch (error: any) {
            throw new NFTError(`Failed to burn NFT: ${error.message}`, 'burn-failed');
        }
    }

    async batchTransferNFTs(
        transfers: Array<{ mintAddress: string; toAddress: string }>
    ): Promise<Array<{ mintAddress: string; result: TransferNftOutput }>> {
        const results: Array<{ mintAddress: string; result: TransferNftOutput }> =
            [];
        const errors: Array<{ mintAddress: string; error: Error }> = [];

        for (const transfer of transfers) {
            try {
                const result = await this.transferNFT(
                    transfer.mintAddress,
                    transfer.toAddress
                );
                results.push({ mintAddress: transfer.mintAddress, result });
            } catch (error: any) {
                errors.push({
                    mintAddress: transfer.mintAddress,
                    error: new NFTError(
                        `Failed to transfer NFT ${transfer.mintAddress}: ${error.message}`,
                        'transfer-failed'
                    ),
                });
            }
        }

        if (errors.length > 0) {
            throw new TransactionError(
                `Failed to transfer ${errors.length} NFTs`,
                'batch-transfer-failed',
                JSON.stringify(errors)
            );
        }

        return results;
    }

    async batchBurnNFTs(
        mintAddresses: string[]
    ): Promise<Array<{ mintAddress: string; success: boolean }>> {
        const results: Array<{ mintAddress: string; success: boolean }> = [];
        const errors: Array<{ mintAddress: string; error: Error }> = [];

        for (const mintAddress of mintAddresses) {
            try {
                await this.burnNFT(mintAddress);
                results.push({ mintAddress, success: true });
            } catch (error: any) {
                errors.push({
                    mintAddress,
                    error: new NFTError(
                        `Failed to burn NFT ${mintAddress}: ${error.message}`,
                        'burn-failed'
                    ),
                });
                results.push({ mintAddress, success: false });
            }
        }

        if (errors.length > 0) {
            throw new TransactionError(
                `Failed to burn ${errors.length} NFTs`,
                'batch-burn-failed',
                JSON.stringify(errors)
            );
        }

        return results;
    }

    async batchMintNFTs(
        metadataUris: string[],
        options?: {
            maxSupply?: number;
            isMutable?: boolean;
        }
    ) {
        const results = [];
        const errors = [];

        for (const uri of metadataUris) {
            try {
                const nft = await this.mintNFT(uri, options);
                results.push(nft);
            } catch (error: any) {
                errors.push({
                    uri,
                    error: new NFTError(
                        `Failed to mint NFT from ${uri}: ${error.message}`,
                        'mint-failed'
                    ),
                });
            }
        }

        if (errors.length > 0) {
            throw new TransactionError(
                `Failed to mint ${errors.length} NFTs`,
                'batch-mint-failed',
                JSON.stringify(errors)
            );
        }

        return results;
    }
}

export async function uploadToIPFS(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_NFT_STORAGE_KEY}`,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload file to IPFS');
    }

    const data = await response.json();
    return `ipfs://${data.value.cid}`;
}

export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
    if (!(metadata.image instanceof File)) {
        throw new Error('Image must be a File object');
    }

    const imageUrl = await uploadToIPFS(metadata.image);

    const metadataObject = {
        name: metadata.name,
        description: metadata.description,
        image: imageUrl,
        attributes: metadata.attributes,
    };

    const metadataBlob = new Blob([JSON.stringify(metadataObject)], {
        type: 'application/json',
    });
    const metadataFile = new File([metadataBlob], 'metadata.json');

    return uploadToIPFS(metadataFile);
}

export async function mintNFT(
    connection: Connection,
    payer: PublicKey,
    uri: string,
    name: string
) {
    const metaplex = new Metaplex(connection);
    metaplex.identity().setDriver({
        publicKey: payer,
        signMessage: async (message: Uint8Array) => {
            // This will be handled by the wallet adapter
            return new Uint8Array();
        },
        signTransaction: async (transaction: Transaction) => {
            // This will be handled by the wallet adapter
            return transaction;
        },
        signAllTransactions: async (transactions: Transaction[]) => {
            // This will be handled by the wallet adapter
            return transactions;
        },
    });

    const { nft } = await metaplex.nfts().create({
        uri,
        name,
        sellerFeeBasisPoints: 0,
    });

    return nft;
}
