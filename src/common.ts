import fs from "fs";
import fetch from "node-fetch";
import { FileInput } from "./types";

export function loadImageBase64(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log(`Loading image: ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");

  return base64;
}

export const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

export async function loadFileInput(input: FileInput): Promise<Buffer> {
  if ("url" in input) {
    return fetch(input.url)
      .then((res) => res.arrayBuffer())
      .then((ab) => Buffer.from(ab));
  } else if ("filepath" in input) {
    return fs.readFileSync(input.filepath);
  } else if ("base64" in input) {
    return Buffer.from(input.base64, "base64");
  }
  throw new Error(`Invalid FileInput: ${JSON.stringify(input)}`);
}
