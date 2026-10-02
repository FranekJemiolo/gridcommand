/**
 * Offline Map Pack & Sector Storage Manager
 * Controls client-side caching of PMTiles vector archives and OpenStreetMap tile packages.
 */

export interface OfflineSector {
  id: string;
  name: string;
  region: string;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  zoomRange: [number, number]; // e.g. [11, 16]
  sizeMb: number;
  tileCount: number;
  pmtilesFile: string;
  isCached: boolean;
  cachedAt?: number;
  downloadProgress?: number; // 0 to 100
}

export const PREDEFINED_SECTORS: OfflineSector[] = [
  {
    id: 'gdansk_oliwa_tactical',
    name: 'Gdańsk Oliwa & Pachołek AO',
    region: 'Trójmiejski Park Krajobrazowy, Poland',
    bounds: [18.515, 54.395, 18.565, 54.425],
    zoomRange: [11, 16],
    sizeMb: 18.4,
    tileCount: 1420,
    pmtilesFile: 'op_gdansk_oliwa_v1.pmtiles',
    isCached: true,
    cachedAt: 1760000000000,
  },
  {
    id: 'katowice_forest_grid',
    name: 'Katowice Murcki & Las Giszowiecki',
    region: 'Silesian Upland, Poland',
    bounds: [18.985, 50.185, 19.055, 50.235],
    zoomRange: [11, 16],
    sizeMb: 24.6,
    tileCount: 1890,
    pmtilesFile: 'op_katowice_murcki_v1.pmtiles',
    isCached: false,
  },
  {
    id: 'warsaw_kampinos_grid',
    name: 'Kampinos Forest Sector Delta',
    region: 'Kampinos National Park, Poland',
    bounds: [20.65, 52.28, 20.85, 52.38],
    zoomRange: [11, 16],
    sizeMb: 36.2,
    tileCount: 2650,
    pmtilesFile: 'op_kampinos_delta_v1.pmtiles',
    isCached: false,
  },
];

const STORAGE_KEY_SECTOR_PREFIX = 'gridcommand_sector_';

export class OfflineMapStorageManager {
  private static cachedSectors: Set<string> = new Set(['gdansk_oliwa_tactical']);

  public static async getStorageQuota(): Promise<{ usageMb: number; quotaMb: number; percentUsed: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMb = Math.round(((estimate.usage || 19293798) / (1024 * 1024)) * 10) / 10;
        const quotaMb = Math.round(((estimate.quota || 10737418240) / (1024 * 1024)) * 10) / 10;
        const percentUsed = Math.round((usageMb / quotaMb) * 1000) / 10;
        return { usageMb, quotaMb, percentUsed };
      } catch {
        // Fallback
      }
    }
    return { usageMb: 18.4, quotaMb: 5120.0, percentUsed: 0.36 };
  }

  public static getSectors(): OfflineSector[] {
    return PREDEFINED_SECTORS.map((s) => ({
      ...s,
      isCached: this.cachedSectors.has(s.id),
    }));
  }

  public static isSectorCached(sectorId: string): boolean {
    return this.cachedSectors.has(sectorId);
  }

  public static async downloadSector(
    sectorId: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const sector = PREDEFINED_SECTORS.find((s) => s.id === sectorId);
    if (!sector) return false;

    // Simulate chunked streaming fetch into Cache API / IndexedDB
    for (let pct = 10; pct <= 100; pct += 15) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      onProgress?.(pct);
    }

    this.cachedSectors.add(sectorId);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEY_SECTOR_PREFIX}${sectorId}`, Date.now().toString());
      } catch {
        // LocalStorage fallback
      }
    }
    return true;
  }

  public static async purgeSector(sectorId: string): Promise<boolean> {
    this.cachedSectors.delete(sectorId);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(`${STORAGE_KEY_SECTOR_PREFIX}${sectorId}`);
      } catch {
        // Ignore
      }
    }
    return true;
  }

  public static async purgeAll(): Promise<boolean> {
    this.cachedSectors.clear();
    return true;
  }
}
