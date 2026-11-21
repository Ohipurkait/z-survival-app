export const MAP_TILE_CACHE_NAME = 'apex-osm-tiles-v2';
const LEGACY_TILE_CACHE_NAME = 'apex-map-tiles-v1';

export interface MapRegion {
  id: string;
  name: string;
  description: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
  center: [number, number]; // [lon, lat]
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
}

export const MAP_REGIONS: MapRegion[] = [
  {
    id: 'india-all',
    name: 'India - All',
    description: 'National overview & highway corridors (Z4–Z7)',
    bounds: [68.0, 6.5, 97.5, 35.5],
    center: [78.9629, 20.5937],
    defaultZoom: 4.6,
    minZoom: 4,
    maxZoom: 7,
  },
  {
    id: 'delhi-ncr',
    name: 'Delhi NCR',
    description: 'New Delhi, Noida, Gurgaon & Yamuna crossings (Z9–Z13)',
    bounds: [76.88, 28.40, 77.45, 28.82],
    center: [77.209, 28.6139],
    defaultZoom: 11,
    minZoom: 9,
    maxZoom: 13,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    description: 'Mumbai peninsula, Navi Mumbai & Thane (Z9–Z13)',
    bounds: [72.76, 18.88, 73.12, 19.30],
    center: [72.8777, 19.076],
    defaultZoom: 11,
    minZoom: 9,
    maxZoom: 13,
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    description: 'Kolkata Metro, Howrah & Hooghly bridges (Z9–Z13)',
    bounds: [88.20, 22.42, 88.52, 22.72],
    center: [88.3639, 22.5726],
    defaultZoom: 11,
    minZoom: 9,
    maxZoom: 13,
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    description: 'Bengaluru urban basin & ring highways (Z9–Z13)',
    bounds: [77.42, 12.82, 77.78, 13.14],
    center: [77.5946, 12.9716],
    defaultZoom: 11,
    minZoom: 9,
    maxZoom: 13,
  },
  {
    id: 'himalayas',
    name: 'Himalayas',
    description: 'Northern mountain passes, Uttarakhand, HP & Ladakh (Z6–Z9)',
    bounds: [74.5, 28.5, 86.5, 34.5],
    center: [78.4, 31.6],
    defaultZoom: 7,
    minZoom: 6,
    maxZoom: 9,
  },
];

export function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

export function getTileRemoteUrl(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export function getTileCacheKey(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export async function purgeLegacyTileCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(LEGACY_TILE_CACHE_NAME);
    }
  } catch {
    // Ignore storage error
  }
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export function computeBoundsTiles(
  bounds: [number, number, number, number],
  minZoom: number,
  maxZoom: number
): TileCoord[] {
  const [west, south, east, north] = bounds;
  const tiles: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const maxIndex = Math.pow(2, z) - 1;
    const minX = Math.max(0, Math.min(maxIndex, lonToTileX(west, z)));
    const maxX = Math.max(0, Math.min(maxIndex, lonToTileX(east, z)));
    const minY = Math.max(0, Math.min(maxIndex, latToTileY(north, z)));
    const maxY = Math.max(0, Math.min(maxIndex, latToTileY(south, z)));
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}

export function computeRegionTiles(region: MapRegion): TileCoord[] {
  return computeBoundsTiles(region.bounds, region.minZoom, region.maxZoom);
}

/**
 * Computes zoom 10-15 tiles for the currently visible map viewport.
 * If the user is zoomed far out (> 360 tiles), automatically narrows to a tactical
 * ~4.5 km corridor centered on the current viewport so browser storage & downloads stay fast.
 */
export function computeCurrentViewTiles(
  bounds: [number, number, number, number],
  center: [number, number],
  minZoom = 10,
  maxZoom = 15,
  maxTileCap = 360
): { tiles: TileCoord[]; clamped: boolean } {
  const full = computeBoundsTiles(bounds, minZoom, maxZoom);
  if (full.length <= maxTileCap) {
    return { tiles: full, clamped: false };
  }

  // Clamp around viewport center (~0.022 deg lat/lon radius ≈ 2.4km each way)
  const [cLon, cLat] = center;
  const delta = 0.022;
  const clampedBounds: [number, number, number, number] = [
    Math.max(-179.9, cLon - delta),
    Math.max(-85, cLat - delta),
    Math.min(179.9, cLon + delta),
    Math.min(85, cLat + delta),
  ];
  const narrowed = computeBoundsTiles(clampedBounds, minZoom, maxZoom);
  return { tiles: narrowed.slice(0, maxTileCap), clamped: true };
}

export async function downloadTileListToCache(
  tiles: TileCoord[],
  onProgress: (completed: number, total: number, failed: number) => void,
  signal: AbortSignal
): Promise<{ cached: number; failed: number; total: number }> {
  const total = tiles.length;
  const cache = await caches.open(MAP_TILE_CACHE_NAME);

  let completed = 0;
  let failed = 0;
  const concurrency = 4;

  const worker = async (queue: TileCoord[]) => {
    while (queue.length > 0 && !signal.aborted) {
      const tile = queue.shift();
      if (!tile) break;
      const cacheKey = getTileCacheKey(tile.z, tile.x, tile.y);
      try {
        const existing = await cache.match(cacheKey);
        if (!existing) {
          const remoteUrl = getTileRemoteUrl(tile.z, tile.x, tile.y);
          const response = await fetch(remoteUrl, {
            mode: 'cors',
            referrerPolicy: 'origin',
            signal,
          });
          if (response.ok) {
            await cache.put(cacheKey, response.clone());
          } else {
            failed++;
          }
        }
      } catch {
        if (!signal.aborted) {
          failed++;
        }
      } finally {
        completed++;
        onProgress(completed, total, failed);
      }
    }
  };

  const queue = [...tiles];
  const workers = Array.from({ length: concurrency }, () => worker(queue));
  await Promise.all(workers);

  return { cached: completed - failed, failed, total };
}

export async function downloadRegionTilesToCache(
  region: MapRegion,
  onProgress: (completed: number, total: number, failed: number) => void,
  signal: AbortSignal
): Promise<{ cached: number; failed: number; total: number }> {
  const tiles = computeRegionTiles(region);
  return downloadTileListToCache(tiles, onProgress, signal);
}

export async function countCachedMapTiles(): Promise<number> {
  try {
    if (typeof caches === 'undefined') return 0;
    const cache = await caches.open(MAP_TILE_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

export async function clearCachedMapTiles(): Promise<void> {
  if (typeof caches !== 'undefined') {
    await caches.delete(MAP_TILE_CACHE_NAME);
  }
}

/**
 * Generates a crisp tactical AMOLED grid PNG tile when offline outside cached areas
 * so MapLibre never crashes or displays empty broken errors in Airplane Mode.
 */
export async function createOfflineGridTile(
  z: number,
  x: number,
  y: number
): Promise<ArrayBuffer> {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, size, size);

    // Subtle tactical grid
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Tile boundary tick
    ctx.strokeStyle = '#241B00';
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Subtle coordinate stamp
    ctx.fillStyle = '#332800';
    ctx.font = '10px monospace';
    ctx.fillText(`UNCACHED ${z}/${x}/${y}`, 10, 20);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return new ArrayBuffer(0);
  return await blob.arrayBuffer();
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function headingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
