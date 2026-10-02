/**
 * RFC 9285 Base45 Encoding and Decoding
 * Used for compact QR code payloads and NFC data exchanges in constrained environments.
 */

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) {
  DECODE_MAP[CHARSET[i]] = i;
}

export function encodeBase45(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const val = (bytes[i] << 8) | bytes[i + 1];
      const c = val % 45;
      const d = Math.floor(val / 45) % 45;
      const e = Math.floor(val / (45 * 45)) % 45;
      result += CHARSET[c] + CHARSET[d] + CHARSET[e];
    } else {
      const val = bytes[i];
      const c = val % 45;
      const d = Math.floor(val / 45) % 45;
      result += CHARSET[c] + CHARSET[d];
    }
  }
  return result;
}

export function decodeBase45(str: string): Uint8Array {
  const result: number[] = [];
  for (let i = 0; i < str.length; i += 3) {
    if (i + 2 < str.length) {
      const c = DECODE_MAP[str[i]];
      const d = DECODE_MAP[str[i + 1]];
      const e = DECODE_MAP[str[i + 2]];
      if (c === undefined || d === undefined || e === undefined) {
        throw new Error(`Invalid Base45 character in string: ${str.slice(i, i + 3)}`);
      }
      const val = c + d * 45 + e * 45 * 45;
      if (val > 65535) {
        throw new Error(`Base45 value overflow: ${val}`);
      }
      result.push((val >> 8) & 0xff);
      result.push(val & 0xff);
    } else if (i + 1 < str.length) {
      const c = DECODE_MAP[str[i]];
      const d = DECODE_MAP[str[i + 1]];
      if (c === undefined || d === undefined) {
        throw new Error(`Invalid Base45 character in string: ${str.slice(i, i + 2)}`);
      }
      const val = c + d * 45;
      if (val > 255) {
        throw new Error(`Base45 single-byte value overflow: ${val}`);
      }
      result.push(val);
    } else {
      throw new Error('Invalid Base45 string length: leftover single character');
    }
  }
  return new Uint8Array(result);
}
