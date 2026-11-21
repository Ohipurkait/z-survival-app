import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Crosshair,
  Download,
  Droplets,
  MapPin,
  Moon,
  Navigation,
  Plus,
  Scan,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  MAP_REGIONS,
  MAP_TILE_CACHE_NAME,
  calculateBearing,
  clearCachedMapTiles,
  computeCurrentViewTiles,
  computeRegionTiles,
  countCachedMapTiles,
  createOfflineGridTile,
  downloadRegionTilesToCache,
  downloadTileListToCache,
  getTileCacheKey,
  getTileRemoteUrl,
  haversineDistanceKm,
  headingToCardinal,
  purgeLegacyTileCache,
  type MapRegion,
} from '../../data/mapRegions';
import { notifyOfflineReadinessChanged } from '../../hooks/useOfflineReadiness';
import { usePowerSaver } from '../../hooks/usePowerSaver';
import {
  calculateMoonInfo,
  calculateSunSchedule,
} from '../../utils/astronomy';
import { FieldEnvironmentDrawer } from '../FieldEnvironmentDrawer';
import { TacticalCompassHUD } from '../TacticalCompassHUD';

type WaypointType = 'safe' | 'water' | 'danger';

interface Waypoint {
  id: string;
  name: string;
  type: WaypointType;
  lat: number;
  lon: number;
  createdAt: string;
}

const WAYPOINTS_KEY = 'apex_gps_waypoints_v1';
const DOWNLOADED_REGIONS_KEY = 'apex_downloaded_map_regions_v1';

let offlineProtocolRegistered = false;

function ensureOfflineTileProtocol() {
  if (offlineProtocolRegistered) return;
  offlineProtocolRegistered = true;

  maplibregl.setWorkerUrl(
    new URL('/maplibre-gl-worker.js', window.location.origin).href
  );

  maplibregl.addProtocol(
    'offline-tile',
    async (
      params: maplibregl.RequestParameters,
      abortController: AbortController
    ) => {
      const parts = params.url.replace('offline-tile://basemap/', '').split('/');
      const z = Number(parts[0]);
      const x = Number(parts[1]);
      const y = Number(parts[2]);

      const cacheKey = getTileCacheKey(z, x, y);

      try {
        if (typeof caches !== 'undefined') {
          const cache = await caches.open(MAP_TILE_CACHE_NAME);
          const cached = await cache.match(cacheKey);
          if (cached) {
            return { data: await cached.arrayBuffer() };
          }

          if (navigator.onLine) {
            const remoteUrl = getTileRemoteUrl(z, x, y);
            const response = await fetch(remoteUrl, {
              mode: 'cors',
              referrerPolicy: 'origin',
              signal: abortController.signal,
            });
            if (response.ok) {
              await cache.put(cacheKey, response.clone());
              return { data: await response.arrayBuffer() };
            }
          }
        }
      } catch {
        // Offline or aborted — fall through to procedural dark tactical grid tile
      }

      const fallbackData = await createOfflineGridTile(z, x, y);
      return { data: fallbackData };
    }
  );
}

const WAYPOINT_META: Record<
  WaypointType,
  { label: string; color: string; bg: string }
> = {
  safe: { label: 'Safe Zone', color: '#00E676', bg: '#052E16' },
  water: { label: 'Water', color: '#38BDF8', bg: '#082F49' },
  danger: { label: 'Danger', color: '#FF3B30', bg: '#2A0706' },
};

type GpsPowerMode = 'continuous' | 'interval30' | 'manual';

interface OfflineMapTabProps {
  isTabActive?: boolean;
}

export const OfflineMapTab: React.FC<OfflineMapTabProps> = ({
  isTabActive = true,
}) => {
  const { ultraPowerSaver } = usePowerSaver();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    MAP_REGIONS[1].id // Delhi NCR default
  );
  const selectedRegion: MapRegion = useMemo(
    () => MAP_REGIONS.find((r) => r.id === selectedRegionId) || MAP_REGIONS[0],
    [selectedRegionId]
  );

  const regionTileCount = useMemo(
    () => computeRegionTiles(selectedRegion).length,
    [selectedRegion]
  );

  const [downloadedRegionIds, setDownloadedRegionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(DOWNLOADED_REGIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cachedTileCount, setCachedTileCount] = useState<number>(0);

  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

  // GPS state
  const [gps, setGps] = useState<{
    lat: number;
    lon: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPowerMode, setGpsPowerMode] = useState<GpsPowerMode>(() =>
    ultraPowerSaver ? 'manual' : 'continuous'
  );
  const [fetchingFix, setFetchingFix] = useState(false);

  // Automatically throttle GPS to Battery-Saver Manual 1-Tap Fix when Ultra Power Saver engages
  useEffect(() => {
    if (ultraPowerSaver) {
      setGpsPowerMode((prev) => (prev === 'continuous' ? 'manual' : prev));
    }
  }, [ultraPowerSaver]);

  // Waypoints state + active target waypoint for Compass Rose Bearing Arrow
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    try {
      const saved = localStorage.getItem(WAYPOINTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [targetWaypointId, setTargetWaypointId] = useState<string | null>(null);

  const [showWaypointForm, setShowWaypointForm] = useState(false);
  const [wpName, setWpName] = useState('');
  const [wpType, setWpType] = useState<WaypointType>('safe');
  const [nightMapMode, setNightMapMode] = useState(true);
  const [envDrawerOpen, setEnvDrawerOpen] = useState(false);

  const envLat = gps ? gps.lat : selectedRegion.center[1];
  const envLon = gps ? gps.lon : selectedRegion.center[0];
  const envLocationLabel = gps ? 'Live GPS Fix' : selectedRegion.name;

  const quickMoon = useMemo(() => calculateMoonInfo(new Date()), []);
  const quickSun = useMemo(
    () => calculateSunSchedule(envLat, envLon, new Date()),
    [envLat, envLon]
  );

  useEffect(() => {
    purgeLegacyTileCache().then(() =>
      countCachedMapTiles().then((count) => {
        setCachedTileCount(count);
        notifyOfflineReadinessChanged();
      })
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WAYPOINTS_KEY, JSON.stringify(waypoints));
    } catch {
      // Ignore storage error
    }
  }, [waypoints]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DOWNLOADED_REGIONS_KEY,
        JSON.stringify(downloadedRegionIds)
      );
    } catch {
      // Ignore storage error
    }
  }, [downloadedRegionIds]);

  // Initialize MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    ensureOfflineTileProtocol();

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'offline-osm-basemap': {
            type: 'raster',
            tiles: ['offline-tile://basemap/{z}/{x}/{y}'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#000000' },
          },
          {
            id: 'offline-basemap-layer',
            type: 'raster',
            source: 'offline-osm-basemap',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: selectedRegion.center,
      zoom: selectedRegion.defaultZoom,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'top-right'
    );
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const requestSingleGpsFix = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }
    setFetchingFix(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFetchingFix(false);
        setGpsError(null);
        setGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          altitude: pos.coords.altitude ?? null,
          speed: pos.coords.speed ?? null,
        });
      },
      (err) => {
        setFetchingFix(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'GPS permission denied. Enable Location access for tracking.'
          );
        } else {
          setGpsError('Could not lock GPS fix — move to open sky and tap Fix.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 8000,
        timeout: 15000,
      }
    );
  };

  // Power-Managed GPS Watcher (pauses automatically when user leaves Map tab or switches to Manual mode)
  useEffect(() => {
    if (!isTabActive) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }

    if (gpsPowerMode === 'manual') {
      return;
    }

    if (gpsPowerMode === 'interval30') {
      requestSingleGpsFix();
      const id = window.setInterval(requestSingleGpsFix, 30000);
      return () => window.clearInterval(id);
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        setGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          altitude: pos.coords.altitude ?? null,
          speed: pos.coords.speed ?? null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'GPS permission denied. Enable Location access for live tracking.'
          );
        } else {
          setGpsError('Acquiring GPS satellite fix...');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsPowerMode, isTabActive]);

  // Update user GPS marker on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !gps) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '9999px';
      el.style.backgroundColor = '#FFB300';
      el.style.border = '3px solid #000000';
      el.style.boxShadow = '0 0 0 4px rgba(255, 179, 0, 0.35)';

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([gps.lon, gps.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([gps.lon, gps.lat]);
    }
  }, [gps]);

  // Render saved waypoints on MapLibre map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    waypoints.forEach((wp) => {
      const meta = WAYPOINT_META[wp.type];
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '4px';
      el.style.transform = 'rotate(45deg)';
      el.style.backgroundColor = meta.color;
      el.style.border = '2px solid #000000';
      el.style.cursor = 'pointer';
      el.title = `${meta.label}: ${wp.name}`;

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 150px;">
          <div style="font-size: 11px; color: ${meta.color}; font-weight: 700;">${meta.label}</div>
          <div style="font-size: 13px; font-weight: 600; color: #F5F5F5; margin-top: 2px;">${wp.name.replace(/</g, '&lt;')}</div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #A3A3A3; margin-top: 4px;">
            ${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wp.lon, wp.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml))
        .addTo(map);

      waypointMarkersRef.current.push(marker);
    });
  }, [waypoints]);

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    const region = MAP_REGIONS.find((r) => r.id === regionId);
    if (region && mapRef.current) {
      mapRef.current.fitBounds(
        [
          [region.bounds[0], region.bounds[1]],
          [region.bounds[2], region.bounds[3]],
        ],
        { padding: 24, duration: 700 }
      );
    }
  };

  const handleDownloadRegion = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadPct(1);
    setDownloadStatus(
      `Caching ${selectedRegion.name} (${regionTileCount} tiles)...`
    );
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await downloadRegionTilesToCache(
        selectedRegion,
        (completed, total) => {
          const pct = Math.max(1, Math.round((completed / total) * 100));
          setDownloadPct(pct);
          setDownloadStatus(
            `${selectedRegion.name}: ${completed} / ${total} tiles cached`
          );
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        setDownloadedRegionIds((prev) =>
          prev.includes(selectedRegion.id) ? prev : [...prev, selectedRegion.id]
        );
        setDownloadStatus(
          result.failed > 0
            ? `${selectedRegion.name}: ${result.cached} cached (${result.failed} skipped)`
            : `${selectedRegion.name} saved offline (${result.cached} tiles)`
        );
      } else {
        setDownloadStatus('Download canceled.');
      }
      const totalCached = await countCachedMapTiles();
      setCachedTileCount(totalCached);
      notifyOfflineReadinessChanged();
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  const handleDownloadCurrentView = async () => {
    if (downloading || !mapRef.current) return;
    const b = mapRef.current.getBounds();
    const c = mapRef.current.getCenter();
    const bounds: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];

    const { tiles, clamped } = computeCurrentViewTiles(
      bounds,
      [c.lng, c.lat],
      10,
      15,
      360
    );

    if (tiles.length === 0) {
      setDownloadStatus('Pan or zoom onto a map area first.');
      return;
    }

    setDownloading(true);
    setDownloadPct(1);
    setDownloadStatus(
      clamped
        ? `Caching Z10–Z15 center corridor (${tiles.length} tiles)...`
        : `Caching current view Z10–Z15 (${tiles.length} tiles)...`
    );
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await downloadTileListToCache(
        tiles,
        (completed, total) => {
          const pct = Math.max(1, Math.round((completed / total) * 100));
          setDownloadPct(pct);
          setDownloadStatus(
            `Current View (Z10–15): ${completed} / ${total} tiles cached`
          );
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        setDownloadStatus(
          clamped
            ? `Cached ${result.cached} Z10–Z15 tiles around center (${c.lat.toFixed(3)}, ${c.lng.toFixed(3)})`
            : `Current view saved offline (${result.cached} Z10–Z15 tiles)`
        );
      } else {
        setDownloadStatus('View download canceled.');
      }
      const totalCached = await countCachedMapTiles();
      setCachedTileCount(totalCached);
      notifyOfflineReadinessChanged();
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    abortRef.current?.abort();
  };

  const handleClearTileCache = async () => {
    await clearCachedMapTiles();
    setDownloadedRegionIds([]);
    setCachedTileCount(0);
    setDownloadStatus('Offline tile cache cleared.');
    notifyOfflineReadinessChanged();
  };

  const handleCenterOnGPS = () => {
    if (gps && mapRef.current) {
      mapRef.current.flyTo({
        center: [gps.lon, gps.lat],
        zoom: 13.5,
        duration: 600,
      });
    }
  };

  const handleSaveWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    const mapCenter = mapRef.current?.getCenter();
    const targetLat = gps
      ? gps.lat
      : mapCenter
        ? mapCenter.lat
        : selectedRegion.center[1];
    const targetLon = gps
      ? gps.lon
      : mapCenter
        ? mapCenter.lng
        : selectedRegion.center[0];

    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name:
        wpName.trim() ||
        `${WAYPOINT_META[wpType].label} #${waypoints.length + 1}`,
      type: wpType,
      lat: targetLat,
      lon: targetLon,
      createdAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setWaypoints((prev) => [newWp, ...prev]);
    setTargetWaypointId(newWp.id);
    setWpName('');
    setShowWaypointForm(false);

    mapRef.current?.flyTo({
      center: [targetLon, targetLat],
      zoom: Math.max(mapRef.current.getZoom(), 12),
      duration: 500,
    });
  };

  const handleDeleteWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    if (targetWaypointId === id) setTargetWaypointId(null);
  };

  const handleFocusWaypoint = (wp: Waypoint) => {
    setTargetWaypointId(wp.id);
    mapRef.current?.flyTo({
      center: [wp.lon, wp.lat],
      zoom: 13.5,
      duration: 600,
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left/Top: Interactive Offline Map + Live GPS + Tactical Compass Rose HUD */}
      <div className="lg:col-span-8 space-y-4">
        <div className="rounded-2xl bg-[#0A0A0A] border border-[#222222] overflow-hidden">
          {/* Map Viewport */}
          <div className="relative w-full h-[44dvh] min-h-[300px] lg:h-[460px] bg-black">
            <div
              ref={mapContainerRef}
              className={`w-full h-full ${nightMapMode ? 'apex-osm-night' : ''}`}
            />

            {/* Bottom-right quick map actions */}
            <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setNightMapMode((v) => !v)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-black/90 border border-[#2A2A2A] text-[#F5F5F5] flex items-center justify-center hover:border-[#FFB300] hover:text-[#FFB300] transition cursor-pointer"
                aria-label={
                  nightMapMode
                    ? 'Switch to daylight map'
                    : 'Switch to tactical night map'
                }
                title={nightMapMode ? 'Daylight OSM view' : 'Tactical Night view'}
              >
                {nightMapMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCenterOnGPS}
                disabled={!gps}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-black/90 border border-[#2A2A2A] text-[#FFB300] flex items-center justify-center hover:border-[#FFB300] disabled:opacity-40 transition cursor-pointer"
                aria-label="Recenter on live GPS position"
                title="Center on my GPS location"
              >
                <Crosshair className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowWaypointForm(true)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#FFB300] text-black flex items-center justify-center hover:bg-[#FFC433] transition cursor-pointer"
                aria-label="Save GPS Waypoint"
                title="Save Waypoint"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live GPS Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1F1F1F] border-t border-[#222222] bg-[#070707]">
            <div className="p-3">
              <div className="text-[11px] text-[#737373]">Latitude</div>
              <div className="font-mono text-sm font-semibold text-[#F5F5F5] tabular-nums mt-0.5">
                {gps ? gps.lat.toFixed(5) : '--.-----'}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[11px] text-[#737373]">Longitude</div>
              <div className="font-mono text-sm font-semibold text-[#F5F5F5] tabular-nums mt-0.5">
                {gps ? gps.lon.toFixed(5) : '--.-----'}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[11px] text-[#737373]">Accuracy</div>
              <div className="font-mono text-sm font-semibold text-[#FFB300] tabular-nums mt-0.5">
                {gps?.accuracy ? `±${Math.round(gps.accuracy)} m` : 'No fix'}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[11px] text-[#737373]">Cached Tiles</div>
              <div className="font-mono text-sm font-semibold text-[#F5F5F5] tabular-nums mt-0.5">
                {cachedTileCount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Battery-Saver GPS Mode Selector & 1-Tap GPS Fix */}
          <div className="px-3.5 py-2.5 border-t border-[#222222] bg-[#080808] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#A3A3A3]">
              <Zap className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
              <span>GPS Power:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black border border-[#222222]">
                {(
                  [
                    { id: 'manual', label: '1-Tap Fix' },
                    { id: 'interval30', label: '30s Pulse' },
                    { id: 'continuous', label: 'Live' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGpsPowerMode(mode.id)}
                    className={`min-h-[32px] px-2.5 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition ${
                      gpsPowerMode === mode.id
                        ? 'bg-[#FFB300] text-black'
                        : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {gpsPowerMode !== 'continuous' && (
                <button
                  type="button"
                  onClick={requestSingleGpsFix}
                  disabled={fetchingFix}
                  className="min-h-[34px] px-3 rounded-lg bg-[#171200] border border-[#FFB300] text-[11px] font-bold text-[#FFB300] hover:bg-[#FFB300] hover:text-black inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5 shrink-0" />
                  <span>{fetchingFix ? 'Fixing...' : 'Get GPS Fix'}</span>
                </button>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="px-4 py-2 text-xs text-[#FFB300] bg-[#140E00] border-t border-[#2A2000]">
              {gpsError}
            </div>
          )}

          {/* Compact Field Environment Drawer Trigger (Moon Phase + Solar + Star Guide) */}
          <button
            type="button"
            onClick={() => setEnvDrawerOpen(true)}
            className="w-full px-4 py-2.5 border-t border-[#222222] bg-[#0B0B0B] hover:bg-[#121212] flex flex-wrap items-center justify-between gap-2 text-left transition cursor-pointer group"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#FFB300]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Field Environment</span>
              </span>
              <span className="font-mono text-[11px] text-[#E5E5E5] tabular-nums">
                Moon {quickMoon.illuminationPct}% ({quickMoon.phaseName})
              </span>
              <span className="text-[#404040]" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-[11px] text-[#A3A3A3] tabular-nums">
                Sun {quickSun.sunriseStr}–{quickSun.sunsetStr}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#FFB300] group-hover:underline whitespace-nowrap">
              Star & Weather Guide
            </span>
          </button>
        </div>

        {/* Upgraded Tactical Compass Rose HUD (Android True North + Waypoint Arrow + Figure-8 + Solar Backup) */}
        <TacticalCompassHUD
          gps={gps}
          waypoints={waypoints}
          targetWaypointId={targetWaypointId}
          onSelectTargetWaypoint={setTargetWaypointId}
          isTabActive={isTabActive}
        />
      </div>

      {/* Right Column: Region Downloader + Cache Current View + Waypoint Manager */}
      <div className="lg:col-span-4 space-y-4">
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
              Offline Region Maps
            </h1>
            {cachedTileCount > 0 && (
              <button
                type="button"
                onClick={handleClearTileCache}
                disabled={downloading}
                className="text-xs text-[#737373] hover:text-[#FF3B30] transition cursor-pointer"
              >
                Clear cache
              </button>
            )}
          </div>

          <label
            htmlFor="region-select"
            className="block mt-3 text-xs text-[#A3A3A3]"
          >
            Select & Download Region Map
          </label>
          <select
            id="region-select"
            value={selectedRegionId}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={downloading}
            className="mt-1.5 w-full min-h-[46px] px-3 rounded-xl bg-black border border-[#2A2A2A] text-sm font-medium text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
          >
            {MAP_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
                {downloadedRegionIds.includes(region.id) ? ' (Cached)' : ''}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-[#737373]">
            {selectedRegion.description} ·{' '}
            <span className="font-mono tabular-nums text-[#A3A3A3]">
              {regionTileCount} tiles (~
              {Math.max(1, Math.round((regionTileCount * 16) / 1024))} MB)
            </span>
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadRegion}
                disabled={downloading}
                className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#FFB300] text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#FFC433] active:scale-[0.98] disabled:opacity-60 transition cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {downloading
                    ? `Caching (${downloadPct}%)`
                    : downloadedRegionIds.includes(selectedRegion.id)
                      ? `Re-cache ${selectedRegion.name}`
                      : `Download ${selectedRegion.name}`}
                </span>
              </button>
              {downloading && (
                <button
                  type="button"
                  onClick={handleCancelDownload}
                  className="min-h-[46px] px-3 rounded-xl bg-[#1A1A1A] border border-[#333333] text-xs font-semibold text-[#FF3B30] hover:bg-[#242424] cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadCurrentView}
              disabled={downloading}
              className="w-full min-h-[44px] px-4 rounded-xl bg-black border border-[#2C2C2C] text-xs font-semibold text-[#F5F5F5] hover:border-[#FFB300] hover:text-[#FFB300] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
            >
              <Scan className="w-4 h-4 text-[#FFB300] shrink-0" />
              <span>Download Current Map View (Z10–Z15)</span>
            </button>
          </div>

          {(downloading || downloadStatus) && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3] truncate">{downloadStatus}</span>
                {downloading && (
                  <span className="font-mono text-[#FFB300] tabular-nums shrink-0 ml-2">
                    {downloadPct}%
                  </span>
                )}
              </div>
              {downloading && (
                <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-full bg-[#FFB300] transition-all duration-150"
                    style={{ width: `${downloadPct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* GPS Waypoints Manager */}
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                GPS Waypoints
              </h2>
              <p className="text-xs text-[#737373]">
                Tap any pin to lock compass arrow · {waypoints.length} saved
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWaypointForm((v) => !v)}
              className="min-h-[40px] px-3 rounded-xl bg-[#151515] border border-[#2C2C2C] text-xs font-semibold text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 transition cursor-pointer"
            >
              {showWaypointForm ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Save Pin</span>
                </>
              )}
            </button>
          </div>

          {showWaypointForm && (
            <form
              onSubmit={handleSaveWaypoint}
              className="mt-4 pt-4 border-t border-[#1F1F1F] space-y-3"
            >
              <input
                type="text"
                value={wpName}
                onChange={(e) => setWpName(e.target.value)}
                placeholder="Label (e.g., Rooftop Cistern, Highway Blockade)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-black border border-[#2A2A2A] text-sm text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
              />
              <div className="grid grid-cols-3 gap-2">
                {(['safe', 'water', 'danger'] as WaypointType[]).map((t) => {
                  const active = wpType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWpType(t)}
                      className={`min-h-[42px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'border-[#FFB300] bg-[#171200] text-[#F5F5F5]'
                          : 'border-[#242424] bg-black text-[#A3A3A3]'
                      }`}
                    >
                      {t === 'safe' && (
                        <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
                      )}
                      {t === 'water' && (
                        <Droplets className="w-3.5 h-3.5 text-[#38BDF8]" />
                      )}
                      {t === 'danger' && (
                        <Skull className="w-3.5 h-3.5 text-[#FF3B30]" />
                      )}
                      <span>{WAYPOINT_META[t].label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#FFB300] text-black text-sm font-bold hover:bg-[#FFC433] transition cursor-pointer"
              >
                {gps ? 'Pin Current GPS Location' : 'Pin Current Map Center'}
              </button>
            </form>
          )}

          {/* Waypoint List */}
          <div className="mt-4 divide-y divide-[#1A1A1A] max-h-[300px] overflow-y-auto">
            {waypoints.length === 0 ? (
              <p className="py-4 text-xs text-[#737373] text-center">
                No waypoints saved yet. Pin a Safe Zone, Water source, or Danger
                area to track bearing on the compass rose.
              </p>
            ) : (
              waypoints.map((wp) => {
                const meta = WAYPOINT_META[wp.type];
                const distKm = gps
                  ? haversineDistanceKm(gps.lat, gps.lon, wp.lat, wp.lon)
                  : null;
                const bearing = gps
                  ? Math.round(calculateBearing(gps.lat, gps.lon, wp.lat, wp.lon))
                  : null;
                const isLocked = targetWaypointId === wp.id;
                return (
                  <div
                    key={wp.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleFocusWaypoint(wp)}
                      className="flex-1 text-left min-w-0 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="font-semibold"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[#525252]">·</span>
                        <span className="font-mono text-[11px] text-[#737373] tabular-nums">
                          {wp.createdAt}
                        </span>
                        {isLocked && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#22C55E]">
                            <Navigation className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-[#F5F5F5] truncate group-hover:text-[#FFB300] transition">
                        {wp.name}
                      </div>
                      <div className="font-mono text-[11px] text-[#737373] tabular-nums">
                        {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                        {distKm !== null && bearing !== null && (
                          <span className="text-[#FFB300]">
                            {' '}
                            ·{' '}
                            {distKm < 1
                              ? `${Math.round(distKm * 1000)}m`
                              : `${distKm.toFixed(1)}km`}{' '}
                            @ {bearing}° {headingToCardinal(bearing)}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWaypoint(wp.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#737373] hover:text-[#FF3B30] hover:bg-[#171717] transition cursor-pointer shrink-0"
                      aria-label={`Delete waypoint ${wp.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <FieldEnvironmentDrawer
        open={envDrawerOpen}
        onClose={() => setEnvDrawerOpen(false)}
        lat={envLat}
        lon={envLon}
        locationLabel={envLocationLabel}
      />
    </div>
  );
};
