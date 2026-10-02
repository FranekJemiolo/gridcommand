import { ed25519 } from '@noble/curves/ed25519';

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function toUint8Array(input: Uint8Array | string): Uint8Array {
  if (typeof input === 'string') {
    return new TextEncoder().encode(input);
  }
  return input;
}

export function fromHexString(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function sign(message: Uint8Array | string, privateKey: Uint8Array): Uint8Array {
  const msgBytes = toUint8Array(message);
  return ed25519.sign(msgBytes, privateKey);
}

export function verify(
  signature: Uint8Array | string,
  message: Uint8Array | string,
  publicKey: Uint8Array | string
): boolean {
  try {
    const sigBytes = typeof signature === 'string' ? fromHexString(signature) : signature;
    const msgBytes = toUint8Array(message);
    const pubBytes = typeof publicKey === 'string' ? fromHexString(publicKey) : publicKey;
    return ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}
