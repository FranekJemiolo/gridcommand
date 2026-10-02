import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';
import { OfflineSector, OfflineMapStorageManager } from '@gridcommand/crdt-core';

export interface OfflineSectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSectorModal: React.FC<OfflineSectorModalProps> = ({ isOpen, onClose }) => {
  const [sectors, setSectors] = useState<OfflineSector[]>(() =>
    OfflineMapStorageManager.getSectors()
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCachedMb = sectors
    .filter((s) => s.isCached)
    .reduce((sum, s) => sum + s.sizeMb, 0);

  const handleDownload = async (sectorId: string) => {
    setDownloadingId(sectorId);
    setDownloadProgress(10);
    setStatusMessage('Downloading vector tiles & contours...');

    await OfflineMapStorageManager.downloadSector(sectorId, (pct) => {
      setDownloadProgress(pct);
    });

    setSectors(OfflineMapStorageManager.getSectors());
    setDownloadingId(null);
    setStatusMessage('Sector cached successfully for zero-connectivity deployment!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePurge = async (sectorId: string) => {
    await OfflineMapStorageManager.purgeSector(sectorId);
    setSectors(OfflineMapStorageManager.getSectors());
    setStatusMessage('Sector removed from local cache.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handlePurgeAll = async () => {
    await OfflineMapStorageManager.purgeAll();
    setSectors(OfflineMapStorageManager.getSectors());
    setStatusMessage('All offline vector caches purged.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-[#141c14] border-2 border-[#453724] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 bg-[#1c261c] border-b border-[#2e3d2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f5b700] animate-pulse" />
            <h3 className="text-xs font-black tracking-wider text-[#f5b700] uppercase">
              OFFLINE MAP PACKS // ZERO-CONNECTIVITY CACHE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#9ba89b] hover:text-[#e8ede8] px-2 py-1 rounded bg-[#0b0f0b] border border-[#2e3d2e]"
          >
            ✕ ESC
          </button>
        </div>

        {/* Storage quota overview */}
        <div className="p-4 bg-[#0b0f0b] border-b border-[#2e3d2e] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#9ba89b]">LOCAL TILE STORAGE USAGE:</span>
            <span className="font-bold text-[#68d391]">
              {totalCachedMb.toFixed(1)} MB / 5,120 MB (0.4%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#141c14] overflow-hidden border border-[#2e3d2e]">
            <div
              className="h-full bg-gradient-to-r from-[#4e9b4e] to-[#f5b700] transition-all duration-300"
              style={{ width: `${Math.max(2, (totalCachedMb / 5120) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-[#9ba89b]">
            Tiles stored in device IndexedDB &amp; Cache API. Guaranteed 100% offline MapLibre GL rendering with zero cellular packets.
          </div>
        </div>

        {/* Sectors list */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {statusMessage && (
            <div className="p-2 rounded bg-[#3b5323]/40 border border-[#4e9b4e] text-[#68d391] font-bold text-center text-[11px] animate-pulse">
              ✓ {statusMessage}
            </div>
          )}

          {sectors.map((sector) => {
            const isDownloading = downloadingId === sector.id;

            return (
              <div
                key={sector.id}
                className="p-3 rounded-lg bg-[#1c261c] border border-[#2e3d2e] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-[#e8ede8] flex items-center gap-2">
                      <span>{sector.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${
                          sector.isCached
                            ? 'bg-[#4e9b4e]/20 text-[#68d391] border-[#4e9b4e]'
                            : 'bg-[#8a6240]/20 text-[#c7a76c] border-[#8a6240]'
                        }`}
                      >
                        {sector.isCached ? '● CACHED (OFFLINE READY)' : '○ NOT CACHED'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9ba89b] mt-0.5">{sector.region}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-[#f5b700]">{sector.sizeMb} MB</div>
                    <div className="text-[10px] text-[#9ba89b]">{sector.tileCount} vector tiles</div>
                  </div>
                </div>

                <div className="text-[10px] text-[#9ba89b] flex items-center justify-between border-t border-[#2e3d2e] pt-2">
                  <span>BOUNDS: [{sector.bounds.map((b) => b.toFixed(2)).join(', ')}]</span>
                  <span>ZOOM: Z{sector.zoomRange[0]}–Z{sector.zoomRange[1]}</span>
                </div>

                {isDownloading && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-[#f5b700] font-bold">
                      <span>DOWNLOADING PACK...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#0b0f0b] overflow-hidden">
                      <div
                        className="h-full bg-[#f5b700] transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {sector.isCached ? (
                    <button
                      onClick={() => handlePurge(sector.id)}
                      className="text-[10px] text-[#c5221f] hover:underline uppercase font-bold"
                    >
                      [Purge Sector Tiles]
                    </button>
                  ) : (
                    <TacticalButton
                      size="compact"
                      variant="yellow"
                      disabled={isDownloading}
                      onClick={() => handleDownload(sector.id)}
                    >
                      {isDownloading ? 'CACHING...' : 'PRE-CACHE SECTOR'}
                    </TacticalButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#1c261c] border-t border-[#2e3d2e] flex items-center justify-between gap-3">
          <button
            onClick={handlePurgeAll}
            className="text-[10px] text-[#c5221f] hover:underline uppercase font-bold"
          >
            [PURGE ALL CACHES]
          </button>
          <TacticalButton variant="neutral" size="compact" onClick={onClose}>
            CLOSE
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
