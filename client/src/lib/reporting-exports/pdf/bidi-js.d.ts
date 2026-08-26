declare module "bidi-js" {
  type EmbeddingLevels = unknown;

  type BidiApi = {
    getEmbeddingLevels(text: string, defaultDir?: string): EmbeddingLevels;
    getReorderedString(text: string, levels: EmbeddingLevels): string;
  };

  export default function bidiFactory(): BidiApi;
}
