/**
 * LoRa / Meshtastic SX1262 Hardware Bridge & Fragmentation Engine
 * Implements 237-byte MTU chunking, CRC16 error detection, and RF link budget modeling.
 */

export const LORA_MAX_PAYLOAD_BYTES = 237;
export const LORA_HEADER_BYTES = 8;
export const LORA_MAX_CHUNK_DATA_BYTES = LORA_MAX_PAYLOAD_BYTES - LORA_HEADER_BYTES; // 229 bytes

export interface LoraChunk {
  magic: number; // 0x4C52 ('LR')
  packetId: number; // uint16
  totalChunks: number; // uint8
  chunkIndex: number; // uint8
  crc16: number; // uint16 checksum of chunk data
  data: Uint8Array; // up to 229 bytes
  rawBytes: Uint8Array; // 237 bytes max complete frame
}

export interface LoraRadioConfig {
  frequencyMhz: number; // e.g. 868.1 for EU868, 915.0 for US915
  spreadingFactor: 7 | 8 | 9 | 10 | 11 | 12; // SF7 (fast) to SF12 (long range)
  bandwidthKhz: 125 | 250 | 500;
  codingRate: '4/5' | '4/6' | '4/7' | '4/8';
  txPowerDbm: number; // 2 to 22 dBm
}

export interface LoraLinkBudgetResult {
  frequencyMhz: number;
  distanceMeters: number;
  freeSpacePathLossDb: number;
  canopyLossDb: number;
  totalPathLossDb: number;
  receivedSignalPowerDbm: number; // RSSI
  snrEstimateDb: number;
  receiverSensitivityDbm: number;
  linkMarginDb: number;
  isLinkViable: boolean;
}

/**
 * Calculates standard CCITT-FALSE 16-bit CRC for packet data integrity.
 */
export function crc16Ccitt(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/**
 * Fragments arbitrary binary payloads (e.g. Base45 CRDT deltas) into 237-byte LoRa packets.
 */
export function fragmentLoraPayload(payload: Uint8Array, packetId = Math.floor(Math.random() * 65535)): LoraChunk[] {
  if (payload.length === 0) {
    const emptyChunkData = new Uint8Array(0);
    const crc = crc16Ccitt(emptyChunkData);
    const raw = new Uint8Array(LORA_HEADER_BYTES);
    const view = new DataView(raw.buffer);
    view.setUint16(0, 0x4c52, false);
    view.setUint16(2, packetId, false);
    view.setUint8(4, 1);
    view.setUint8(5, 0);
    view.setUint16(6, crc, false);
    return [{ magic: 0x4c52, packetId, totalChunks: 1, chunkIndex: 0, crc16: crc, data: emptyChunkData, rawBytes: raw }];
  }

  const totalChunks = Math.ceil(payload.length / LORA_MAX_CHUNK_DATA_BYTES);
  if (totalChunks > 255) {
    throw new Error(`Payload too large for single LoRa packet session: ${payload.length} bytes requires ${totalChunks} chunks (max 255).`);
  }

  const chunks: LoraChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * LORA_MAX_CHUNK_DATA_BYTES;
    const end = Math.min(start + LORA_MAX_CHUNK_DATA_BYTES, payload.length);
    const slice = payload.slice(start, end);
    const crc = crc16Ccitt(slice);

    const raw = new Uint8Array(LORA_HEADER_BYTES + slice.length);
    const view = new DataView(raw.buffer);
    view.setUint16(0, 0x4c52, false); // Magic 'LR'
    view.setUint16(2, packetId, false);
    view.setUint8(4, totalChunks);
    view.setUint8(5, i);
    view.setUint16(6, crc, false);
    raw.set(slice, LORA_HEADER_BYTES);

    chunks.push({
      magic: 0x4c52,
      packetId,
      totalChunks,
      chunkIndex: i,
      crc16: crc,
      data: slice,
      rawBytes: raw,
    });
  }

  return chunks;
}

/**
 * Deserializes a raw received LoRa byte buffer into a structured LoraChunk with CRC validation.
 */
export function parseLoraChunk(rawBytes: Uint8Array): { success: boolean; chunk?: LoraChunk; error?: string } {
  if (rawBytes.length < LORA_HEADER_BYTES) {
    return { success: false, error: 'Raw packet shorter than minimum LoRa header (8 bytes).' };
  }
  const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
  const magic = view.getUint16(0, false);
  if (magic !== 0x4c52) {
    return { success: false, error: `Invalid LoRa frame magic: expected 0x4C52, got 0x${magic.toString(16)}.` };
  }

  const packetId = view.getUint16(2, false);
  const totalChunks = view.getUint8(4);
  const chunkIndex = view.getUint8(5);
  const expectedCrc = view.getUint16(6, false);

  const data = rawBytes.slice(LORA_HEADER_BYTES);
  const calculatedCrc = crc16Ccitt(data);

  if (calculatedCrc !== expectedCrc) {
    return { success: false, error: `CRC mismatch in LoRa chunk ${chunkIndex + 1}/${totalChunks}: expected 0x${expectedCrc.toString(16)}, got 0x${calculatedCrc.toString(16)}.` };
  }

  return {
    success: true,
    chunk: {
      magic,
      packetId,
      totalChunks,
      chunkIndex,
      crc16: expectedCrc,
      data,
      rawBytes,
    },
  };
}

/**
 * Session Assembler tracking multi-chunk LoRa transmissions across out-of-order reception.
 */
export class LoraPacketAssembler {
  private sessions = new Map<number, { totalChunks: number; chunks: Map<number, Uint8Array>; createdAt: number }>();
  private sessionTimeoutMs: number;

  constructor(sessionTimeoutMs = 15000) {
    this.sessionTimeoutMs = sessionTimeoutMs;
  }

  /**
   * Ingests a raw LoRa byte frame. Returns the reassembled payload if this frame completed a packet.
   */
  public ingestRawChunk(rawBytes: Uint8Array): { complete: boolean; payload?: Uint8Array; packetId?: number; error?: string } {
    const parsed = parseLoraChunk(rawBytes);
    if (!parsed.success || !parsed.chunk) {
      return { complete: false, error: parsed.error };
    }
    return this.ingestChunk(parsed.chunk);
  }

  public ingestChunk(chunk: LoraChunk): { complete: boolean; payload?: Uint8Array; packetId?: number; error?: string } {
    this.evictExpiredSessions();

    const { packetId, totalChunks, chunkIndex, data } = chunk;

    let session = this.sessions.get(packetId);
    if (!session) {
      session = {
        totalChunks,
        chunks: new Map<number, Uint8Array>(),
        createdAt: Date.now(),
      };
      this.sessions.set(packetId, session);
    }

    session.chunks.set(chunkIndex, data);

    if (session.chunks.size === totalChunks) {
      // Reassemble in sorted order
      let totalLength = 0;
      for (let i = 0; i < totalChunks; i++) {
        const cData = session.chunks.get(i);
        if (!cData) {
          return { complete: false, error: `Missing chunk ${i} in assembly session.` };
        }
        totalLength += cData.length;
      }

      const fullPayload = new Uint8Array(totalLength);
      let offset = 0;
      for (let i = 0; i < totalChunks; i++) {
        const cData = session.chunks.get(i)!;
        fullPayload.set(cData, offset);
        offset += cData.length;
      }

      this.sessions.delete(packetId);
      return { complete: true, payload: fullPayload, packetId };
    }

    return { complete: false, packetId };
  }

  private evictExpiredSessions() {
    const now = Date.now();
    for (const [packetId, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.sessionTimeoutMs) {
        this.sessions.delete(packetId);
      }
    }
  }

  public getActiveSessionCount(): number {
    this.evictExpiredSessions();
    return this.sessions.size;
  }
}

/**
 * Calculates theoretical RF link budget in decibels (dB) for Sub-GHz LoRa (868MHz / 915MHz)
 * through dense forest canopy.
 *
 * Uses Free Space Path Loss (FSPL) combined with the ITU-R P.833 vegetation attenuation model.
 */
export function calculateLoraLinkMargin(options: {
  distanceMeters: number;
  frequencyMhz?: number;
  txPowerDbm?: number;
  spreadingFactor?: 7 | 8 | 9 | 10 | 11 | 12;
  bandwidthKhz?: 125 | 250 | 500;
  canopyDepthMeters?: number;
  canopyLossDbPerMeter?: number; // approx 0.15 to 0.35 dB/m for wet pine
}): LoraLinkBudgetResult {
  const {
    distanceMeters,
    frequencyMhz = 868.1,
    txPowerDbm = 22, // Max legal for LilyGO T-Echo EU868
    spreadingFactor = 10, // Meshtastic LongFast default
    bandwidthKhz = 125,
    canopyDepthMeters = Math.min(distanceMeters, 250), // up to 250m dense canopy
    canopyLossDbPerMeter = 0.08,
  } = options;

  // Free Space Path Loss: FSPL = 20*log10(d_km) + 20*log10(f_MHz) + 32.44
  const distanceKm = Math.max(distanceMeters / 1000, 0.001);
  const freeSpacePathLossDb = 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMhz) + 32.44;

  // Wet pine canopy absorption
  const canopyLossDb = canopyDepthMeters * canopyLossDbPerMeter;
  const totalPathLossDb = freeSpacePathLossDb + canopyLossDb;

  // Receiver sensitivity table based on SX1262 datasheet (for BW=125kHz)
  // SF7: -123 dBm, SF8: -126 dBm, SF9: -129 dBm, SF10: -132 dBm, SF11: -134.5 dBm, SF12: -137 dBm
  const sensitivityMap: Record<number, number> = {
    7: -123,
    8: -126,
    9: -129,
    10: -132,
    11: -134.5,
    12: -137,
  };
  const receiverSensitivityDbm = sensitivityMap[spreadingFactor] || -132;

  // Received power (RSSI) = TxPower + TxAntennaGain - PathLoss + RxAntennaGain
  const antennaGainTotalDb = 4.0; // 2 dBi whip antenna on each side
  const receivedSignalPowerDbm = txPowerDbm + antennaGainTotalDb - totalPathLossDb;

  const linkMarginDb = receivedSignalPowerDbm - receiverSensitivityDbm;
  const isLinkViable = linkMarginDb >= 0;

  // Theoretical SNR estimate: at sensitivity limit, SNR is approx -15dB for SF10
  const snrEstimateDb = Math.min(15, Math.max(-20, linkMarginDb - 15));

  return {
    frequencyMhz,
    distanceMeters,
    freeSpacePathLossDb: parseFloat(freeSpacePathLossDb.toFixed(2)),
    canopyLossDb: parseFloat(canopyLossDb.toFixed(2)),
    totalPathLossDb: parseFloat(totalPathLossDb.toFixed(2)),
    receivedSignalPowerDbm: parseFloat(receivedSignalPowerDbm.toFixed(2)),
    snrEstimateDb: parseFloat(snrEstimateDb.toFixed(2)),
    receiverSensitivityDbm,
    linkMarginDb: parseFloat(linkMarginDb.toFixed(2)),
    isLinkViable,
  };
}
