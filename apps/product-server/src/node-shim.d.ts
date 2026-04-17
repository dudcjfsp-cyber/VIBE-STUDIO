declare module "node:http" {
  export type IncomingMessage = AsyncIterable<Uint8Array> & {
    method?: string;
    url?: string;
  };

  export type ServerResponse = {
    setHeader(name: string, value: string): void;
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(chunk?: string): void;
  };

  export function createServer(
    listener: (
      request: IncomingMessage,
      response: ServerResponse,
    ) => void | Promise<void>,
  ): {
    listen(port: number, host: string, callback?: () => void): void;
  };
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare class Buffer extends Uint8Array {
  static from(data: ArrayLike<number> | string): Buffer;
  static concat(chunks: readonly Buffer[]): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  toString(encoding?: string): string;
}
