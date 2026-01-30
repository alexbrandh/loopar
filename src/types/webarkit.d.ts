declare module '@webarkit/nft-marker-creator-app' {
  export function generateNFT(buffer: Buffer): Promise<{
    iset: Buffer;
    fset: Buffer;
    fset3: Buffer;
  }>;
  
  const _default: {
    generateNFT: typeof generateNFT;
  };
  export default _default;
}