import {
  Program as AnchorProgram,
  Provider as AnchorProvider,
  Idl as AnchorIdl,
} from '@project-serum/anchor/dist/cjs';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';

/**
 * Interface for pet data
 */
export interface PetData {
  /** Pet name */
  readonly name: string;
  /** Pet description */
  readonly description: string;
  /** Pet image URL */
  readonly imageUrl: string;
  /** Pet attributes */
  readonly attributes: Record<string, string | number>;
}

/**
 * Pet Contract Service
 * Handles on-chain operations related to pets
 */
export class PetContractService {
  public readonly programId: PublicKey;
  private readonly program: AnchorProgram<AnchorIdl>;
  private readonly connection: Connection;

  constructor(connection: Connection, programId: PublicKey) {
    this.programId = programId;
    this.connection = connection;
    
    // Initialize Anchor program
    const provider = new AnchorProvider(
      connection,
      window.solana,
      AnchorProvider.defaultOptions()
    );
    // Import actual IDL here
    // this.program = new AnchorProgram(IDL, programId, provider);
  }

  /**
   * Derives pet account address
   * @param owner - Owner's public key
   * @returns Pet account address and bump seed
   */
  private async derivePetAddress(
    owner: PublicKey
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('pet'), owner.toBuffer()],
      this.programId
    );
  }

  /**
   * Creates a new pet
   * @param owner - Owner's public key
   * @param petData - Pet data
   * @returns Transaction signature
   */
  public async createPet(owner: PublicKey, petData: PetData): Promise<string> {
    const [petAccount] = await this.derivePetAddress(owner);

    const tx = await this.program.methods
      .initializePet(petData)
      .accounts({
        owner,
        petAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }
}
