import { describe, it, expect } from 'vitest';
import { encodeBase45, decodeBase45 } from '../src/base45';
import { generateKeyPair, sign, verify, toHexString } from '../src/ed25519';

describe('Base45 Encoding & Decoding', () => {
  it('correctly round-trips ASCII strings and arbitrary binary', () => {
    const testCases = [
      'Hello!!',
      'GridCommand-Mazowsze-2026',
      JSON.stringify({ o: 'bunker_01', m: 'match_99', v: 1 }),
      '',
    ];

    for (const tc of testCases) {
      const bytes = new TextEncoder().encode(tc);
      const encoded = encodeBase45(bytes);
      const decoded = decodeBase45(encoded);
      expect(new TextDecoder().decode(decoded)).toBe(tc);
    }
  });

  it('correctly encodes known RFC 9285 test vectors', () => {
    // RFC 9285: "Hello!!" -> "%69 VD92EX0"
    const input = new TextEncoder().encode('Hello!!');
    const encoded = encodeBase45(input);
    expect(encoded).toBe('%69 VD92EX0');
    expect(new TextDecoder().decode(decodeBase45(encoded))).toBe('Hello!!');
  });
});

describe('Ed25519 Cryptographic Signatures', () => {
  it('generates keys and validates signatures properly', () => {
    const keyPair = generateKeyPair();
    const payload = JSON.stringify({ o: 'bunker_01', m: 'm_99', v: 1 });

    const signature = sign(payload, keyPair.privateKey);
    const isValid = verify(signature, payload, keyPair.publicKey);
    expect(isValid).toBe(true);

    // Tampered payload fails validation
    const tampered = JSON.stringify({ o: 'bunker_02', m: 'm_99', v: 1 });
    expect(verify(signature, tampered, keyPair.publicKey)).toBe(false);

    // Hex string verification works
    const sigHex = toHexString(signature);
    const pubHex = toHexString(keyPair.publicKey);
    expect(verify(sigHex, payload, pubHex)).toBe(true);
  });
});
