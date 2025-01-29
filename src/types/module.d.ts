declare module '@project-serum/anchor/dist/cjs' {
  export class Program<T = any> {
    constructor(idl: any, programId: any, provider: any);
    // Add other necessary type definitions
  }

  export class Provider {
    static defaultOptions(): any;
    constructor(connection: any, wallet: any, opts: any);
  }

  export interface Idl {
    // Add necessary interface definitions
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

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
