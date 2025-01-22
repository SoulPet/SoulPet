import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js';

export class NFTService {
    private metaplex: Metaplex;

    constructor(connection: Connection) {
        this.metaplex = new Metaplex(connection);
    }

    async createNFT(
        name: string,
        symbol: string,
        uri: string
    ): Promise<PublicKey> {
        const { nft } = await this.metaplex
            .nfts()
            .create({
                uri,
                name,
                sellerFeeBasisPoints: 0,
                symbol,
            });

        return nft.address;
    }
} 