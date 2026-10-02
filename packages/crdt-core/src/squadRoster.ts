import { OperatorRosterEntry, BlueForceRole } from './types';
import { generateKeyPair, toHexString } from '@gridcommand/crypto';

export interface CreateOperatorOptions {
  id?: string;
  callsign: string;
  squad: 'squad_alpha' | 'squad_bravo';
  role: BlueForceRole;
  publicKey?: string;
}

/**
 * Creates a new tactical operator entry for the squad roster.
 * Generates an Ed25519 keypair if no public key is supplied.
 */
export function createOperator(options: CreateOperatorOptions): {
  operator: OperatorRosterEntry;
  generatedPrivateKeyHex?: string;
} {
  let publicKeyHex = options.publicKey;
  let generatedPrivateKeyHex: string | undefined;

  if (!publicKeyHex) {
    const keyPair = generateKeyPair();
    publicKeyHex = toHexString(keyPair.publicKey);
    generatedPrivateKeyHex = toHexString(keyPair.privateKey);
  }

  const id = options.id || `op_${options.squad}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const operator: OperatorRosterEntry = {
    id,
    callsign: options.callsign,
    squad: options.squad,
    role: options.role,
    publicKey: publicKeyHex,
    revoked: false,
    assignedAt: Date.now(),
  };

  return { operator, generatedPrivateKeyHex };
}

/**
 * Revokes an operator's public key from the active roster.
 * Revoked operators cannot sign or submit authenticated CRDT events.
 */
export function revokeOperator(
  roster: OperatorRosterEntry[],
  operatorId: string
): OperatorRosterEntry[] {
  return roster.map((op) => {
    if (op.id === operatorId) {
      return { ...op, revoked: true };
    }
    return op;
  });
}

/**
 * Reinstates a previously revoked operator.
 */
export function reinstateOperator(
  roster: OperatorRosterEntry[],
  operatorId: string
): OperatorRosterEntry[] {
  return roster.map((op) => {
    if (op.id === operatorId) {
      return { ...op, revoked: false };
    }
    return op;
  });
}

/**
 * Look up an active operator by their public key.
 */
export function findOperatorByPublicKey(
  roster: OperatorRosterEntry[],
  publicKeyHex: string
): OperatorRosterEntry | undefined {
  const cleanKey = publicKeyHex.replace(/^0x/, '').toLowerCase();
  return roster.find(
    (op) => !op.revoked && op.publicKey.replace(/^0x/, '').toLowerCase() === cleanKey
  );
}

/**
 * Returns pre-configured default tactical roster for simulation exercises.
 */
export function getDefaultRoster(): OperatorRosterEntry[] {
  return [
    {
      id: 'op_alpha_1',
      callsign: 'Viper Actual',
      squad: 'squad_alpha',
      role: 'LEADER',
      publicKey: '0000000000000000000000000000000000000000000000000000000000000001',
      revoked: false,
      assignedAt: 1727884800000,
    },
    {
      id: 'op_alpha_2',
      callsign: 'Viper-2 (Doc)',
      squad: 'squad_alpha',
      role: 'MEDIC',
      publicKey: '0000000000000000000000000000000000000000000000000000000000000002',
      revoked: false,
      assignedAt: 1727884800000,
    },
    {
      id: 'op_bravo_1',
      callsign: 'Coyote-1',
      squad: 'squad_bravo',
      role: 'POINTMAN',
      publicKey: '0000000000000000000000000000000000000000000000000000000000000003',
      revoked: false,
      assignedAt: 1727884800000,
    },
    {
      id: 'op_bravo_2',
      callsign: 'Coyote-2 (RTO)',
      squad: 'squad_bravo',
      role: 'RTO',
      publicKey: '0000000000000000000000000000000000000000000000000000000000000004',
      revoked: false,
      assignedAt: 1727884800000,
    },
  ];
}
