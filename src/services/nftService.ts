import {
  Metaplex as MetaplexSDK,
  bundlrStorage,
  walletAdapterIdentity,
} from '@metaplex-foundation/js/dist/cjs';
import { Connection, PublicKey } from '@solana/web3.js';

export class NFTService {
  private metaplex: MetaplexSDK;

  constructor(connection: Connection, wallet: PublicKey) {
    this.metaplex = new MetaplexSDK(connection)
      .use(walletAdapterIdentity(wallet))
      .use(bundlrStorage());
  }

  async createNFT(
    name: string,
    symbol: string,
    uri: string
  ): Promise<PublicKey> {
    const { nft } = await this.metaplex.nfts().create({
      uri,
      name,
      sellerFeeBasisPoints: 0,
      symbol,
    });

    return nft.address;
  }
}
