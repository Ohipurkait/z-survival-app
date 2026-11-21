import { useCallback, useEffect, useState } from 'react';
import { countCachedMapTiles } from '../data/mapRegions';

const INSTALLED_MODEL_KEY = 'apex_installed_llm_model_v1';
const CACHED_PAIRS_KEY = 'apex_cached_translator_pairs_v1';

export const READINESS_EVENT = 'apex-readiness-changed';

export function notifyOfflineReadinessChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(READINESS_EVENT));
  }
}

export interface OfflineReadinessState {
  aiReady: boolean;
  mapReady: boolean;
  mapTileCount: number;
  translatorReady: boolean;
  translatorPackCount: number;
  readyCount: number;
  remainingBytes: number | null;
  usedBytes: number | null;
  quotaBytes: number | null;
}

export function formatStorageBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return '--';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Math.round(mb)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function useOfflineReadiness(): OfflineReadinessState {
  const [state, setState] = useState<OfflineReadinessState>({
    aiReady: false,
    mapReady: false,
    mapTileCount: 0,
    translatorReady: false,
    translatorPackCount: 0,
    readyCount: 0,
    remainingBytes: null,
    usedBytes: null,
    quotaBytes: null,
  });

  const refresh = useCallback(async () => {
    let aiReady = false;
    let translatorPackCount = 0;

    try {
      aiReady = Boolean(localStorage.getItem(INSTALLED_MODEL_KEY));
      const rawPairs = localStorage.getItem(CACHED_PAIRS_KEY);
      if (rawPairs) {
        const parsed = JSON.parse(rawPairs);
        if (Array.isArray(parsed)) translatorPackCount = parsed.length;
      }
    } catch {
      // Ignore storage access errors
    }

    const mapTileCount = await countCachedMapTiles();
    const mapReady = mapTileCount > 0;
    const translatorReady = translatorPackCount > 0;

    let remainingBytes: number | null = null;
    let usedBytes: number | null = null;
    let quotaBytes: number | null = null;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.estimate === 'function'
      ) {
        const est = await navigator.storage.estimate();
        if (typeof est.quota === 'number' && typeof est.usage === 'number') {
          quotaBytes = est.quota;
          usedBytes = est.usage;
          remainingBytes = Math.max(0, est.quota - est.usage);
        }
      }
    } catch {
      // StorageManager unavailable
    }

    const readyCount =
      (aiReady ? 1 : 0) + (mapReady ? 1 : 0) + (translatorReady ? 1 : 0);

    setState({
      aiReady,
      mapReady,
      mapTileCount,
      translatorReady,
      translatorPackCount,
      readyCount,
      remainingBytes,
      usedBytes,
      quotaBytes,
    });
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(READINESS_EVENT, onChange);
    window.addEventListener('storage', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener(READINESS_EVENT, onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [refresh]);

  return state;
}
