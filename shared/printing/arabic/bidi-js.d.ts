declare module "bidi-js" {
  type BaseDirection = "ltr" | "rtl";

  type EmbeddingLevelsResult = {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  };

  interface Bidi {
    getEmbeddingLevels(string: string, baseDirection?: BaseDirection): EmbeddingLevelsResult;
    getReorderedString(string: string, embeddingLevels: EmbeddingLevelsResult): string;
    getReorderedIndices(
      string: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number
    ): number[];
  }

  export default function bidiFactory(): Bidi;
}
