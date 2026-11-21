import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number; // 0.0 to 1.0
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManagerLike>;
}

export interface BatteryStatus {
  supported: boolean;
  levelPct: number | null;
  charging: boolean;
  dischargingMinutes: number | null;
}

interface PowerSaverContextValue {
  ultraPowerSaver: boolean;
  autoTriggered: boolean;
  nightVision: boolean;
  battery: BatteryStatus;
  toggleUltraPowerSaver: () => void;
  setUltraPowerSaver: (enabled: boolean) => void;
  toggleNightVision: () => void;
}

const POWER_SAVER_KEY = 'apex_ultra_power_saver_v1';
const NIGHT_VISION_KEY = 'z_survival_night_vision_v1';
const LOW_BATTERY_THRESHOLD_PCT = 20;

const PowerSaverContext = createContext<PowerSaverContextValue>({
  ultraPowerSaver: false,
  autoTriggered: false,
  nightVision: false,
  battery: {
    supported: false,
    levelPct: null,
    charging: false,
    dischargingMinutes: null,
  },
  toggleUltraPowerSaver: () => {},
  setUltraPowerSaver: () => {},
  toggleNightVision: () => {},
});

export const PowerSaverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ultraPowerSaver, setUltraPowerSaverState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(POWER_SAVER_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [nightVision, setNightVision] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NIGHT_VISION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [autoTriggered, setAutoTriggered] = useState(false);
  const manualOverrideRef = useRef(false);

  const [battery, setBattery] = useState<BatteryStatus>({
    supported: false,
    levelPct: null,
    charging: false,
    dischargingMinutes: null,
  });

  // Sync HTML attribute for global AMOLED Pitch-Black & Zero-Animation CSS rules
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (ultraPowerSaver) {
      document.documentElement.setAttribute('data-power-saver', 'true');
    } else {
      document.documentElement.removeAttribute('data-power-saver');
    }
    try {
      localStorage.setItem(POWER_SAVER_KEY, ultraPowerSaver ? 'true' : 'false');
    } catch {
      // Ignore storage error
    }
  }, [ultraPowerSaver]);

  // Sync HTML & body attributes for Night-Vision Red Mode (#FF3B30 / #FF8A80 on pure #000000)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (nightVision) {
      document.documentElement.setAttribute('data-night-vision', 'true');
      document.body?.setAttribute('data-night-vision', 'true');
    } else {
      document.documentElement.removeAttribute('data-night-vision');
      document.body?.removeAttribute('data-night-vision');
    }
    try {
      localStorage.setItem(NIGHT_VISION_KEY, nightVision ? 'true' : 'false');
    } catch {
      // Ignore storage error
    }
  }, [nightVision]);

  // Monitor live Battery Status API (navigator.getBattery)
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery !== 'function') return;

    let active = true;
    let batteryManager: BatteryManagerLike | null = null;

    const updateFromManager = (bm: BatteryManagerLike) => {
      if (!active) return;
      const pct = Math.round(bm.level * 100);
      const dischargingMin =
        !bm.charging &&
        Number.isFinite(bm.dischargingTime) &&
        bm.dischargingTime > 0
          ? Math.round(bm.dischargingTime / 60)
          : null;

      setBattery({
        supported: true,
        levelPct: pct,
        charging: bm.charging,
        dischargingMinutes: dischargingMin,
      });

      if (pct < LOW_BATTERY_THRESHOLD_PCT && !bm.charging) {
        if (!manualOverrideRef.current) {
          setUltraPowerSaverState(true);
          setAutoTriggered(true);
        }
      } else if (bm.charging || pct >= LOW_BATTERY_THRESHOLD_PCT + 5) {
        manualOverrideRef.current = false;
        setAutoTriggered(false);
      }
    };

    nav
      .getBattery()
      .then((bm) => {
        if (!active) return;
        batteryManager = bm;
        updateFromManager(bm);

        const onChange = () => updateFromManager(bm);
        bm.addEventListener('levelchange', onChange);
        bm.addEventListener('chargingchange', onChange);
        bm.addEventListener('dischargingtimechange', onChange);

        return () => {
          bm.removeEventListener('levelchange', onChange);
          bm.removeEventListener('chargingchange', onChange);
          bm.removeEventListener('dischargingtimechange', onChange);
        };
      })
      .catch(() => {
        // Battery API blocked or unsupported
      });

    return () => {
      active = false;
      if (batteryManager) {
        batteryManager = null;
      }
    };
  }, []);

  const setUltraPowerSaver = useCallback((enabled: boolean) => {
    manualOverrideRef.current = !enabled;
    if (!enabled) {
      setAutoTriggered(false);
    }
    setUltraPowerSaverState(enabled);
  }, []);

  const toggleUltraPowerSaver = useCallback(() => {
    setUltraPowerSaverState((prev) => {
      const next = !prev;
      manualOverrideRef.current = !next;
      if (!next) {
        setAutoTriggered(false);
      }
      return next;
    });
  }, []);

  const toggleNightVision = useCallback(() => {
    setNightVision((prev) => !prev);
  }, []);

  return (
    <PowerSaverContext.Provider
      value={{
        ultraPowerSaver,
        autoTriggered,
        nightVision,
        battery,
        toggleUltraPowerSaver,
        setUltraPowerSaver,
        toggleNightVision,
      }}
    >
      {children}
    </PowerSaverContext.Provider>
  );
};

export function usePowerSaver(): PowerSaverContextValue {
  return useContext(PowerSaverContext);
}
