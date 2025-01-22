import { 
    Program as AnchorProgram,
    Provider as AnchorProvider,
    Idl as AnchorIdl 
} from '@project-serum/anchor/dist/cjs';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';

// 定义 PetData 接口
export interface PetData {
    name: string;
    description: string;
    imageUrl: string;
    attributes: Record<string, string | number>;
}

export class PetContractService {
    private program: AnchorProgram<AnchorIdl>;
    private connection: Connection;

    constructor(connection: Connection, programId: PublicKey) {
        this.connection = connection;
        // 初始化程序需要添加
        const provider = new AnchorProvider(
            connection,
            window.solana,
            AnchorProvider.defaultOptions()
        );
        // 这里需要导入实际的 IDL
        // this.program = new AnchorProgram(IDL, programId, provider);
    }

    private async derivePetAddress(owner: PublicKey): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [Buffer.from('pet'), owner.toBuffer()],
            this.program.programId
        );
    }

    async createPet(
        owner: PublicKey,
        petData: PetData
    ): Promise<string> {
        const [petAccount] = await this.derivePetAddress(owner);
        
        const tx = await this.program.methods
            .initializePet(petData)
            .accounts({
                owner: owner,
                petAccount: petAccount,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
            
        return tx;
    }
} 