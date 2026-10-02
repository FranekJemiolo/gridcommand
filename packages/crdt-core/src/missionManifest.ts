import { MissionManifest, MissionGraph, OperatorRosterEntry } from './types';
import {
  sign,
  verify,
  toHexString,
  fromHexString,
  encodeBase45,
  decodeBase45,
} from '@gridcommand/crypto';

/**
 * Returns canonical JSON string representation of a manifest payload (excluding signature).
 * Keys are sorted recursively to guarantee deterministic cryptographic hashing.
 */
export function canonicalizeManifest(manifest: Omit<MissionManifest, 'signature'>): string {
  const sortObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (key === 'signature') continue; // Do not include signature in canonical hash
      result[key] = sortObject(obj[key]);
    }
    return result;
  };

  return JSON.stringify(sortObject(manifest));
}

/**
 * Creates and cryptographically signs a MissionManifest using an author's Ed25519 private key.
 */
export function createSignedMissionManifest(
  payload: {
    missionId: string;
    title: string;
    description: string;
    createdAt?: number;
    authorPublicKey: string; // Hex string
    graph: MissionGraph;
    roster: OperatorRosterEntry[];
  },
  authorPrivateKey: Uint8Array | string
): MissionManifest {
  const manifestData: Omit<MissionManifest, 'signature'> = {
    manifestVersion: '1.0',
    missionId: payload.missionId,
    title: payload.title,
    description: payload.description,
    createdAt: payload.createdAt || Date.now(),
    authorPublicKey: payload.authorPublicKey.replace(/^0x/, '').toLowerCase(),
    graph: payload.graph,
    roster: payload.roster,
  };

  const canonicalJSON = canonicalizeManifest(manifestData);
  const privKeyBytes =
    typeof authorPrivateKey === 'string' ? fromHexString(authorPrivateKey) : authorPrivateKey;

  const signatureBytes = sign(canonicalJSON, privKeyBytes);
  const signatureHex = toHexString(signatureBytes);

  return {
    ...manifestData,
    signature: signatureHex,
  };
}

/**
 * Verifies the cryptographic integrity and Ed25519 signature of a MissionManifest.
 */
export function verifyMissionManifest(manifest: MissionManifest): {
  valid: boolean;
  reason?: string;
} {
  if (!manifest.signature) {
    return { valid: false, reason: 'Manifest is missing cryptographic signature.' };
  }

  if (manifest.manifestVersion !== '1.0') {
    return { valid: false, reason: `Unsupported manifest version: ${manifest.manifestVersion}` };
  }

  if (!manifest.authorPublicKey) {
    return { valid: false, reason: 'Manifest is missing author public key.' };
  }

  const { signature, ...unsignedManifest } = manifest;
  const canonicalJSON = canonicalizeManifest(unsignedManifest);

  const isValid = verify(signature, canonicalJSON, manifest.authorPublicKey);
  if (!isValid) {
    return { valid: false, reason: 'Cryptographic signature mismatch or tampered payload.' };
  }

  return { valid: true };
}

/**
 * Serializes a signed mission manifest into a compact Base45 string suitable for high-density QR codes.
 */
export function exportManifestToBase45(manifest: MissionManifest): string {
  const json = JSON.stringify(manifest);
  const bytes = new TextEncoder().encode(json);
  return encodeBase45(bytes);
}

/**
 * Decodes and parses a mission manifest from a Base45 QR string.
 */
export function importManifestFromBase45(base45Str: string): {
  valid: boolean;
  manifest?: MissionManifest;
  error?: string;
} {
  try {
    const bytes = decodeBase45(base45Str.trim());
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as MissionManifest;

    const verification = verifyMissionManifest(parsed);
    if (!verification.valid) {
      return { valid: false, error: verification.reason };
    }

    return { valid: true, manifest: parsed };
  } catch (err: any) {
    return { valid: false, error: `Base45 decoding failed: ${err.message || String(err)}` };
  }
}

/**
 * Serializes a signed mission manifest into formatted JSON.
 */
export function exportManifestToJSON(manifest: MissionManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Parses and verifies a mission manifest from JSON.
 */
export function importManifestFromJSON(jsonStr: string): {
  valid: boolean;
  manifest?: MissionManifest;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr) as MissionManifest;
    const verification = verifyMissionManifest(parsed);
    if (!verification.valid) {
      return { valid: false, error: verification.reason };
    }
    return { valid: true, manifest: parsed };
  } catch (err: any) {
    return { valid: false, error: `Invalid manifest JSON: ${err.message || String(err)}` };
  }
}
