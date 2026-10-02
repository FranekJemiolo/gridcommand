/**
 * GridCommand BLE Binary Chunking Protocol
 * Splits arbitrary binary updates (such as Y.encodeStateAsUpdate) into 128-byte MTU frames
 * (6-byte header + 122-byte payload) for reliable transmission over Bluetooth Low Energy.
 */

export interface BLEFrameHeader {
  batchId: number;
  chunkIndex: number;
  totalChunks: number;
}

export function chunkPayload(batchId: number, data: Uint8Array, chunkSize = 122): Uint8Array[] {
  const totalChunks = Math.ceil(data.length / chunkSize) || 1;
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const slice = data.subarray(i * chunkSize, (i + 1) * chunkSize);
    const frame = new Uint8Array(6 + slice.length);
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);

    view.setUint16(0, batchId, false);
    view.setUint16(2, i, false);
    view.setUint16(4, totalChunks, false);
    frame.set(slice, 6);
    chunks.push(frame);
  }
  return chunks;
}

export function parseFrameHeader(frame: Uint8Array): { header: BLEFrameHeader; payload: Uint8Array } {
  if (frame.length < 6) {
    throw new Error('Invalid BLE frame: length is less than header size (6 bytes)');
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const batchId = view.getUint16(0, false);
  const chunkIndex = view.getUint16(2, false);
  const totalChunks = view.getUint16(4, false);
  const payload = frame.subarray(6);

  return {
    header: { batchId, chunkIndex, totalChunks },
    payload,
  };
}

export class BLEChunkAssembler {
  private batches: Map<number, { total: number; chunks: Map<number, Uint8Array> }> = new Map();

  /**
   * Adds a received frame. Returns the reassembled Uint8Array if all chunks
   * for this batchId have been received, or null if still pending.
   */
  public addFrame(frame: Uint8Array): { batchId: number; data: Uint8Array } | null {
    const { header, payload } = parseFrameHeader(frame);
    const { batchId, chunkIndex, totalChunks } = header;

    if (!this.batches.has(batchId)) {
      this.batches.set(batchId, {
        total: totalChunks,
        chunks: new Map(),
      });
    }

    const batch = this.batches.get(batchId)!;
    batch.chunks.set(chunkIndex, payload);

    if (batch.chunks.size === batch.total) {
      // Reassemble in order
      let totalLength = 0;
      for (let i = 0; i < batch.total; i++) {
        const c = batch.chunks.get(i);
        if (!c) return null; // Missing chunk
        totalLength += c.length;
      }

      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (let i = 0; i < batch.total; i++) {
        const c = batch.chunks.get(i)!;
        merged.set(c, offset);
        offset += c.length;
      }

      this.batches.delete(batchId);
      return { batchId, data: merged };
    }

    return null;
  }

  public clearBatch(batchId: number): void {
    this.batches.delete(batchId);
  }
}
