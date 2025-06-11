export type FileInput =
  | {
      url: string;
    }
  | {
      filepath: string;
    }
  | {
      base64: string;
    };
