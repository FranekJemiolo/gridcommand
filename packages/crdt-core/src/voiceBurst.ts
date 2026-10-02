/**
 * Tactical Acoustic Voice Burst & Push-To-Talk (PTT) Protocol
 * Implements low-bitrate acoustic packetization and predefined military quick-shouts
 * optimized for multi-hop BLE and Sub-GHz LoRa mesh distribution.
 */

export const VOICE_BURST_MAGIC = 0x5642; // 'VB'

export type QuickShoutCode =
  | 'CONTACT_FRONT'
  | 'FALL_BACK'
  | 'RALLY_OBJECTIVE'
  | 'CALL_MEDIC'
  | 'HOLD_FIRE'
  | 'RADIO_SILENCE'
  | 'OBJECTIVE_SECURED';

export const QUICK_SHOUT_DEFINITIONS: Record<QuickShoutCode, { id: number; text: string; priority: 'HIGH' | 'CRITICAL' | 'NORMAL' }> = {
  CONTACT_FRONT: { id: 1, text: 'CONTACT FRONT // SUPPRESSING FIRE', priority: 'CRITICAL' },
  FALL_BACK: { id: 2, text: 'FALL BACK TO RALLY POINT', priority: 'CRITICAL' },
  RALLY_OBJECTIVE: { id: 3, text: 'RALLY ON OBJECTIVE', priority: 'HIGH' },
  CALL_MEDIC: { id: 4, text: 'MEDIC NEEDED // CASUALTY REPORTED', priority: 'CRITICAL' },
  HOLD_FIRE: { id: 5, text: 'CEASE FIRE // CONFIRM IDENTIFICATION', priority: 'HIGH' },
  RADIO_SILENCE: { id: 6, text: 'RADIO SILENCE IN EFFECT', priority: 'NORMAL' },
  OBJECTIVE_SECURED: { id: 7, text: 'OBJECTIVE FULLY SECURED', priority: 'HIGH' },
};

export interface VoiceBurstPacket {
  magic: number;
  sequenceId: number;
  codecType: 'QUICK_SHOUT' | 'TONE_BURST' | 'AUDIO_BURST';
  operatorId: string;
  callsign: string;
  squad: string;
  quickShout?: QuickShoutCode;
  textMessage: string;
  durationMs: number;
  timestamp: number;
  rawBytes: Uint8Array;
}

/**
 * Creates a compact binary Voice Burst frame for a tactical Quick-Shout.
 * Fits into a single BLE or LoRa packet (<64 bytes).
 */
export function createQuickShoutFrame(
  operatorId: string,
  callsign: string,
  squad: string,
  quickShout: QuickShoutCode,
  sequenceId = Math.floor(Math.random() * 65535)
): VoiceBurstPacket {
  const shoutDef = QUICK_SHOUT_DEFINITIONS[quickShout];
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(operatorId);
  const callsignBytes = encoder.encode(callsign);
  const squadBytes = encoder.encode(squad);

  // Frame structure:
  // [0..1] Magic 0x5642
  // [2..3] sequenceId (uint16)
  // [4]    codecType (0 = QUICK_SHOUT)
  // [5]    quickShoutId (uint8)
  // [6]    idLen
  // [7]    callsignLen
  // [8]    squadLen
  // [9..]  strings
  const headerLen = 9;
  const raw = new Uint8Array(headerLen + idBytes.length + callsignBytes.length + squadBytes.length);
  const view = new DataView(raw.buffer);

  view.setUint16(0, VOICE_BURST_MAGIC, false);
  view.setUint16(2, sequenceId, false);
  view.setUint8(4, 0); // QUICK_SHOUT
  view.setUint8(5, shoutDef.id);
  view.setUint8(6, idBytes.length);
  view.setUint8(7, callsignBytes.length);
  view.setUint8(8, squadBytes.length);

  let offset = headerLen;
  raw.set(idBytes, offset);
  offset += idBytes.length;
  raw.set(callsignBytes, offset);
  offset += callsignBytes.length;
  raw.set(squadBytes, offset);

  return {
    magic: VOICE_BURST_MAGIC,
    sequenceId,
    codecType: 'QUICK_SHOUT',
    operatorId,
    callsign,
    squad,
    quickShout,
    textMessage: shoutDef.text,
    durationMs: 750,
    timestamp: Date.now(),
    rawBytes: raw,
  };
}

/**
 * Deserializes an incoming binary Voice Burst frame.
 */
export function parseVoiceBurstFrame(raw: Uint8Array): VoiceBurstPacket | null {
  if (raw.length < 9) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const magic = view.getUint16(0, false);
  if (magic !== VOICE_BURST_MAGIC) return null;

  const sequenceId = view.getUint16(2, false);
  const codecCode = view.getUint8(4);
  const shoutId = view.getUint8(5);
  const idLen = view.getUint8(6);
  const callsignLen = view.getUint8(7);
  const squadLen = view.getUint8(8);

  const totalExpected = 9 + idLen + callsignLen + squadLen;
  if (raw.length < totalExpected) return null;

  const decoder = new TextDecoder();
  let offset = 9;
  const operatorId = decoder.decode(raw.slice(offset, offset + idLen));
  offset += idLen;
  const callsign = decoder.decode(raw.slice(offset, offset + callsignLen));
  offset += callsignLen;
  const squad = decoder.decode(raw.slice(offset, offset + squadLen));

  let quickShout: QuickShoutCode | undefined;
  for (const [key, val] of Object.entries(QUICK_SHOUT_DEFINITIONS)) {
    if (val.id === shoutId) {
      quickShout = key as QuickShoutCode;
      break;
    }
  }

  const textMessage = quickShout ? QUICK_SHOUT_DEFINITIONS[quickShout].text : 'ACOUSTIC VOICE TRANSMISSION';

  return {
    magic,
    sequenceId,
    codecType: codecCode === 0 ? 'QUICK_SHOUT' : 'AUDIO_BURST',
    operatorId,
    callsign,
    squad,
    quickShout,
    textMessage,
    durationMs: 750,
    timestamp: Date.now(),
    rawBytes: raw,
  };
}
