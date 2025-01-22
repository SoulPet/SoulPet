declare module '@project-serum/anchor/dist/cjs' {
    export class Program<T = any> {
        constructor(idl: any, programId: any, provider: any);
        // 添加其他必要的类型定义
    }

    export class Provider {
        static defaultOptions(): any;
        constructor(connection: any, wallet: any, opts: any);
    }

    export interface Idl {
        // 添加必要的接口定义
    }
}

declare module '@metaplex-foundation/js/dist/cjs' {
    export class Metaplex {
        constructor(connection: any);
        use(plugin: any): this;
        nfts(): {
            create(input: any): Promise<any>;
        };
    }

    export function bundlrStorage(): any;
    export function walletAdapterIdentity(wallet: any): any;
} 