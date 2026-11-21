import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Navigation,
  RefreshCw,
  Satellite,
  Sliders,
  Sun,
  X,
} from 'lucide-react';
import {
  calculateBearing,
  haversineDistanceKm,
  headingToCardinal,
} from '../data/mapRegions';

export interface CompassWaypointTarget {
  id: string;
  name: string;
  type: 'safe' | 'water' | 'danger';
  lat: number;
  lon: number;
}

interface TacticalCompassHUDProps {
  gps: { lat: number; lon: number } | null;
  waypoints: CompassWaypointTarget[];
  targetWaypointId: string | null;
  onSelectTargetWaypoint: (id: string | null) => void;
  isTabActive?: boolean;
}

// W3C Generic Sensor API typing (AbsoluteOrientationSensor)
interface AbsoluteOrientationSensorInstance extends EventTarget {
  readonly quaternion: readonly [number, number, number, number] | null;
  readonly activated: boolean;
  start: () => void;
  stop: () => void;
}

interface AbsoluteOrientationSensorConstructor {
  new (options?: {
    frequency?: number;
    referenceFrame?: 'device' | 'screen';
  }): AbsoluteOrientationSensorInstance;
}

type SensorSource =
  | 'idle'
  | 'tier1-absolute-sensor'
  | 'tier2-webkit'
  | 'tier2-absolute'
  | 'tier2-relative'
  | 'tier3-gps';

const CARDINAL_LABELS: Array<{ label: string; deg: number; major: boolean }> = [
  { label: 'N', deg: 0, major: true },
  { label: 'NE', deg: 45, major: false },
  { label: 'E', deg: 90, major: true },
  { label: 'SE', deg: 135, major: false },
  { label: 'S', deg: 180, major: true },
  { label: 'SW', deg: 225, major: false },
  { label: 'W', deg: 270, major: true },
  { label: 'NW', deg: 315, major: false },
];

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (
    window.screen?.orientation &&
    typeof window.screen.orientation.angle === 'number'
  ) {
    return window.screen.orientation.angle;
  }
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

function detectEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin iframe throws SecurityError on window.top access
    return true;
  }
}

/**
 * Circular low-pass exponential smoothing (`alpha` interpolation)
 * so 359° -> 0° transitions never whip backwards and sensor noise stays damped.
 */
function smoothAngle(prev: number | null, next: number, alpha = 0.15): number {
  const normNext = normalizeDeg(next);
  if (prev === null) return normNext;
  const diff = ((normNext - prev + 540) % 360) - 180;
  // Tiny 0.25° deadband suppresses stationary magnetometer micro-jitter
  if (Math.abs(diff) < 0.25) return prev;
  return normalizeDeg(prev + diff * alpha);
}

/**
 * Converts a W3C AbsoluteOrientationSensor quaternion [x, y, z, w]
 * (Device/Screen -> Earth ENU frame: +X East, +Y North, +Z Up)
 * into a clockwise compass heading (0° = North, 90° = East).
 * Handles both flat and upright phone positions.
 */
function quaternionToCompassHeading(
  q: readonly [number, number, number, number],
  screenAngleOffset = 0
): number {
  const [qx, qy, qz, qw] = q;

  // Device +Y axis (top of phone) projected onto Earth horizontal (East, North)
  const eastY = 2 * (qx * qy - qw * qz);
  const northY = 1 - 2 * (qx * qx + qz * qz);
  const horizMagY = Math.hypot(eastY, northY);

  let headingRad: number;
  if (horizMagY >= 0.35) {
    headingRad = Math.atan2(eastY, northY);
  } else {
    // Phone held nearly upright: use -Z axis (rear camera direction) projected onto (East, North)
    const eastNegZ = -2 * (qx * qz + qw * qy);
    const northNegZ = -2 * (qy * qz - qw * qx);
    headingRad = Math.atan2(eastNegZ, northNegZ);
  }

  const deg = (headingRad * 180) / Math.PI;
  return normalizeDeg(deg + screenAngleOffset);
}

export const TacticalCompassHUD: React.FC<TacticalCompassHUDProps> = ({
  gps,
  waypoints,
  targetWaypointId,
  onSelectTargetWaypoint,
  isTabActive = true,
}) => {
  const isInIframe = useMemo(() => detectEmbeddedIframe(), []);

  // 3-Tier sensor state
  const [sensorHeading, setSensorHeading] = useState<number | null>(null);
  const [sensorSource, setSensorSource] = useState<SensorSource>('idle');
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [gpsSpeedKmh, setGpsSpeedKmh] = useState<number | null>(null);
  const [sensorStatusNote, setSensorStatusNote] = useState<string | null>(null);

  // Manual dial & mode state
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [compassMode, setCompassMode] = useState<'auto' | 'manual'>('auto');
  const [showManualSlider, setShowManualSlider] = useState<boolean>(isInIframe);
  const [isDraggingDial, setIsDraggingDial] = useState(false);

  // Modals: Figure-8 Calibrate & Solar Compass Backup
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [showSolarModal, setShowSolarModal] = useState(false);

  // Solar Compass state
  const [solarHemisphere, setSolarHemisphere] = useState<'north' | 'south'>(
    () => (gps && gps.lat < 0 ? 'south' : 'north')
  );
  const [sunDirectionDeg, setSunDirectionDeg] = useState<number>(135);
  const [solarTimeMinutes, setSolarTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const smoothedRef = useRef<number | null>(null);
  const tier1ActiveRef = useRef(false);
  const tier2AbsoluteActiveRef = useRef(false);
  const lastGpsPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const dialSvgRef = useRef<SVGSVGElement | null>(null);
  const detachOrientationRef = useRef<(() => void) | null>(null);
  const absSensorRef = useRef<AbsoluteOrientationSensorInstance | null>(null);

  // Continuous unwrapped dial rotation angle (prevents 359° -> 0° snap-back & jitters)
  const [dialAngle, setDialAngle] = useState<number>(0);
  const dialAngleRef = useRef<number>(0);
  const targetHeadingRef = useRef<number>(0);

  useEffect(() => {
    if (gps) {
      setSolarHemisphere(gps.lat < 0 ? 'south' : 'north');
    }
  }, [gps?.lat]);

  // Helper to apply incoming magnetometer/orientation reading with low-pass alpha smoothing
  const pushOrientationReading = useCallback(
    (rawDeg: number, source: SensorSource) => {
      const smoothed = smoothAngle(smoothedRef.current, rawDeg, 0.15);
      smoothedRef.current = smoothed;
      setSensorHeading(smoothed);
      setSensorSource(source);
      setSensorStatusNote(null);
    },
    []
  );

  // Immediately attach deviceorientationabsolute + deviceorientation without waiting for AbsoluteOrientationSensor
  const attachImmediateOrientationListeners = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (detachOrientationRef.current) {
      detachOrientationRef.current();
      detachOrientationRef.current = null;
    }

    tier2AbsoluteActiveRef.current = false;

    // Tier 2A: deviceorientationabsolute (Android Chrome/Brave/Firefox true magnetic north)
    const handleAbsoluteOrientation = (e: Event) => {
      if (tier1ActiveRef.current) return;
      const evt = e as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };
      if (typeof evt.alpha === 'number' && !Number.isNaN(evt.alpha)) {
        tier2AbsoluteActiveRef.current = true;
        const screenAngle = getScreenOrientationAngle();
        const raw = normalizeDeg(360 - evt.alpha + screenAngle);
        pushOrientationReading(raw, 'tier2-absolute');
      }
    };

    // Tier 2B: standard deviceorientation (iOS webkitCompassHeading or 360 - event.alpha)
    const handleStandardOrientation = (e: DeviceOrientationEvent) => {
      if (tier1ActiveRef.current) return;
      const evt = e as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };

      // iOS Safari direct magnetic heading
      if (
        typeof evt.webkitCompassHeading === 'number' &&
        !Number.isNaN(evt.webkitCompassHeading)
      ) {
        tier2AbsoluteActiveRef.current = true;
        pushOrientationReading(evt.webkitCompassHeading, 'tier2-webkit');
        return;
      }

      // If deviceorientationabsolute is already streaming valid numbers, prefer it
      if (tier2AbsoluteActiveRef.current) return;

      if (typeof evt.alpha === 'number' && !Number.isNaN(evt.alpha)) {
        const screenAngle = getScreenOrientationAngle();
        const raw = normalizeDeg(360 - evt.alpha + screenAngle);
        pushOrientationReading(
          raw,
          evt.absolute ? 'tier2-absolute' : 'tier2-relative'
        );
      }
    };

    window.addEventListener(
      'deviceorientationabsolute',
      handleAbsoluteOrientation,
      true
    );
    window.addEventListener(
      'deviceorientation',
      handleStandardOrientation,
      true
    );

    detachOrientationRef.current = () => {
      window.removeEventListener(
        'deviceorientationabsolute',
        handleAbsoluteOrientation,
        true
      );
      window.removeEventListener(
        'deviceorientation',
        handleStandardOrientation,
        true
      );
    };
  }, [pushOrientationReading]);

  // Parallel non-blocking Tier 1 AbsoluteOrientationSensor starter
  const startAbsoluteOrientationSensor = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (absSensorRef.current) {
      try {
        absSensorRef.current.stop();
      } catch {
        // ignore
      }
      absSensorRef.current = null;
    }
    tier1ActiveRef.current = false;

    const SensorCtor = (
      window as unknown as {
        AbsoluteOrientationSensor?: AbsoluteOrientationSensorConstructor;
      }
    ).AbsoluteOrientationSensor;

    if (!SensorCtor) return;

    try {
      let usedScreenRef = true;
      let sensor: AbsoluteOrientationSensorInstance;
      try {
        sensor = new SensorCtor({
          frequency: 30,
          referenceFrame: 'screen',
        });
      } catch {
        usedScreenRef = false;
        sensor = new SensorCtor({
          frequency: 30,
          referenceFrame: 'device',
        });
      }

      const onReading = () => {
        if (!sensor.quaternion) return;
        tier1ActiveRef.current = true;
        const screenOffset = usedScreenRef ? 0 : getScreenOrientationAngle();
        const deg = quaternionToCompassHeading(sensor.quaternion, screenOffset);
        pushOrientationReading(deg, 'tier1-absolute-sensor');
      };

      const onError = () => {
        tier1ActiveRef.current = false;
        try {
          sensor.stop();
        } catch {
          // ignore
        }
        if (absSensorRef.current === sensor) {
          absSensorRef.current = null;
        }
      };

      sensor.addEventListener('reading', onReading);
      sensor.addEventListener('error', onError);
      absSensorRef.current = sensor;
      sensor.start();
    } catch {
      tier1ActiveRef.current = false;
      absSensorRef.current = null;
    }
  }, [pushOrientationReading]);

  // Attach Tier 2 orientation listeners immediately on mount/tab active + start Tier 1 in parallel
  useEffect(() => {
    if (!isTabActive || typeof window === 'undefined') return;

    attachImmediateOrientationListeners();
    startAbsoluteOrientationSensor();

    return () => {
      if (detachOrientationRef.current) {
        detachOrientationRef.current();
        detachOrientationRef.current = null;
      }
      if (absSensorRef.current) {
        try {
          absSensorRef.current.stop();
        } catch {
          // ignore
        }
        absSensorRef.current = null;
      }
      tier1ActiveRef.current = false;
    };
  }, [
    isTabActive,
    attachImmediateOrientationListeners,
    startAbsoluteOrientationSensor,
  ]);

  // TIER 3: Automatic GPS Movement Bearing fallback (navigator.geolocation coords.heading + COG)
  // Runs only when Tab is active and Tier 1 / Tier 2 haven't locked a live magnetometer reading
  const hasHardwareMagnetometer =
    sensorHeading !== null &&
    (sensorSource === 'tier1-absolute-sensor' ||
      sensorSource === 'tier2-webkit' ||
      sensorSource === 'tier2-absolute' ||
      sensorSource === 'tier2-relative');

  useEffect(() => {
    if (
      !isTabActive ||
      hasHardwareMagnetometer ||
      typeof navigator === 'undefined' ||
      !('geolocation' in navigator)
    ) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;

        if (typeof speed === 'number' && !Number.isNaN(speed)) {
          setGpsSpeedKmh(Math.round(speed * 3.6 * 10) / 10);
        }

        // Primary Tier 3: native GPS coords.heading while moving
        if (
          typeof heading === 'number' &&
          !Number.isNaN(heading) &&
          (speed === null || speed === undefined || speed >= 0.4)
        ) {
          const norm = Math.round(normalizeDeg(heading)) % 360;
          setGpsHeading(norm);
          lastGpsPosRef.current = { lat: latitude, lon: longitude };
          return;
        }

        // Secondary Tier 3: Course-Over-Ground computed between consecutive GPS positions (>= 6m moved)
        if (lastGpsPosRef.current) {
          const movedKm = haversineDistanceKm(
            lastGpsPosRef.current.lat,
            lastGpsPosRef.current.lon,
            latitude,
            longitude
          );
          if (movedKm >= 0.006) {
            const cog = Math.round(
              calculateBearing(
                lastGpsPosRef.current.lat,
                lastGpsPosRef.current.lon,
                latitude,
                longitude
              )
            );
            setGpsHeading(cog % 360);
            lastGpsPosRef.current = { lat: latitude, lon: longitude };
          }
        } else {
          lastGpsPosRef.current = { lat: latitude, lon: longitude };
        }
      },
      () => {
        // Silent fallback to manual/solar dial if GPS denied
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTabActive, hasHardwareMagnetometer]);

  // User tap activation: explicitly requests DeviceOrientationEvent.requestPermission()
  // and immediately attaches both deviceorientationabsolute and deviceorientation without waiting for AbsoluteOrientationSensor
  const handleTapEnableSensor = async () => {
    setCompassMode('auto');
    smoothedRef.current = null;

    const DOE = (
      typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined
    ) as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    } | null;

    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          setSensorStatusNote(
            'Motion/Orientation permission denied — using GPS Heading or manual dial.'
          );
          setShowManualSlider(true);
          return;
        }
      } catch {
        // Proceed to attach standard orientation listeners
      }
    }

    // Immediately attach deviceorientationabsolute + deviceorientation on user tap
    attachImmediateOrientationListeners();
    // Kick off AbsoluteOrientationSensor in parallel (non-blocking)
    startAbsoluteOrientationSensor();

    if (!hasHardwareMagnetometer) {
      if (isInIframe) {
        setSensorStatusNote(
          'Preview iframe blocks magnetometer sensors. Open deployed PWA or drag the compass dial below.'
        );
        setShowManualSlider(true);
      } else if (gpsHeading !== null) {
        setSensorStatusNote(
          'Listening for phone magnetometer — currently locked onto GPS Heading.'
        );
      } else {
        setSensorStatusNote(
          'Compass listeners active. Rotate your phone slowly or check Motion Sensors site permission if Mag Sensor stays grey.'
        );
      }
    } else {
      setSensorStatusNote(null);
    }
  };

  // Resolve active heading and active tier across the 3-tier pipeline
  const resolvedSource: SensorSource | 'manual' = useMemo(() => {
    if (compassMode === 'manual') return 'manual';
    if (hasHardwareMagnetometer) return sensorSource;
    if (gpsHeading !== null) return 'tier3-gps';
    return 'manual';
  }, [compassMode, hasHardwareMagnetometer, sensorSource, gpsHeading]);

  const activeHeadingFloat = useMemo(() => {
    if (resolvedSource === 'manual') return manualHeading;
    if (resolvedSource === 'tier3-gps' && gpsHeading !== null) return gpsHeading;
    if (sensorHeading !== null) return sensorHeading;
    return manualHeading;
  }, [resolvedSource, manualHeading, gpsHeading, sensorHeading]);

  const activeHeading = Math.round(normalizeDeg(activeHeadingFloat)) % 360;

  const isLiveSensorActive = resolvedSource !== 'manual';

  // Keep target heading ref synced for the low-pass rAF dial interpolator
  useEffect(() => {
    targetHeadingRef.current = activeHeadingFloat;
  }, [activeHeadingFloat]);

  // Smooth low-pass alpha interpolation for the compass dial rotation (zero jitter, zero 359°->0° spin)
  useEffect(() => {
    if (!isTabActive) return;

    let rafId = 0;
    const DIAL_ALPHA = 0.16;

    const animateDial = () => {
      const target = targetHeadingRef.current;
      const current = dialAngleRef.current;
      const currentMod = normalizeDeg(current);
      const shortestDelta = ((normalizeDeg(target) - currentMod + 540) % 360) - 180;

      if (Math.abs(shortestDelta) > 0.06) {
        const next = isDraggingDial
          ? current + shortestDelta
          : current + shortestDelta * DIAL_ALPHA;
        dialAngleRef.current = next;
        setDialAngle(next);
      }

      rafId = requestAnimationFrame(animateDial);
    };

    rafId = requestAnimationFrame(animateDial);
    return () => cancelAnimationFrame(rafId);
  }, [isTabActive, isDraggingDial]);

  // Interactive SVG compass dial drag handler (lets user spin the compass directly by touch/mouse)
  const updateHeadingFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = dialSvgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // Angle clockwise from top (North = 0°, East = 90°)
      const deg = Math.round(normalizeDeg((Math.atan2(dx, -dy) * 180) / Math.PI)) % 360;
      setCompassMode('manual');
      setManualHeading(deg);
    },
    []
  );

  const handleDialPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingDial(true);
    setShowManualSlider(true);
    updateHeadingFromPointer(e.clientX, e.clientY);
  };

  const handleDialPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingDial) return;
    updateHeadingFromPointer(e.clientX, e.clientY);
  };

  const handleDialPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingDial) {
      setIsDraggingDial(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const targetWaypoint = useMemo(
    () =>
      waypoints.find((w) => w.id === targetWaypointId) || waypoints[0] || null,
    [waypoints, targetWaypointId]
  );

  const targetMetrics = useMemo(() => {
    if (!gps || !targetWaypoint) return null;
    const bearing = Math.round(
      calculateBearing(gps.lat, gps.lon, targetWaypoint.lat, targetWaypoint.lon)
    );
    const distanceKm = haversineDistanceKm(
      gps.lat,
      gps.lon,
      targetWaypoint.lat,
      targetWaypoint.lon
    );
    return { bearing, distanceKm };
  }, [gps, targetWaypoint]);

  // Solar Compass True North math
  const solarCalc = useMemo(() => {
    const hours = solarTimeMinutes / 60;
    const hourOffsetFromNoon = hours - 12;
    const sunTrueAzimuth =
      solarHemisphere === 'north'
        ? normalizeDeg(180 + hourOffsetFromNoon * 15)
        : normalizeDeg(360 - hourOffsetFromNoon * 15);

    const trueNorthRelative = normalizeDeg(sunDirectionDeg - sunTrueAzimuth);
    const computedPhoneHeading = normalizeDeg(360 - trueNorthRelative);

    const hh = Math.floor(solarTimeMinutes / 60);
    const mm = solarTimeMinutes % 60;
    const formattedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    return {
      sunTrueAzimuth: Math.round(sunTrueAzimuth),
      trueNorthRelative: Math.round(trueNorthRelative),
      computedPhoneHeading: Math.round(computedPhoneHeading) % 360,
      formattedTime,
    };
  }, [solarTimeMinutes, solarHemisphere, sunDirectionDeg]);

  const sourceSubtitle = useMemo(() => {
    switch (resolvedSource) {
      case 'tier1-absolute-sensor':
        return 'Tier 1 · AbsoluteOrientationSensor (Live Magnetic North)';
      case 'tier2-webkit':
        return 'Tier 2 · Apple WebKit Magnetometer (Live Magnetic North)';
      case 'tier2-absolute':
        return 'Tier 2 · DeviceOrientationAbsolute (Live Magnetic North)';
      case 'tier2-relative':
        return 'Tier 2 · DeviceOrientation Gyro/Mag (Live Sensor)';
      case 'tier3-gps':
        return `Tier 3 · GPS Movement Bearing${
          gpsSpeedKmh !== null ? ` (${gpsSpeedKmh} km/h)` : ''
        }`;
      default:
        return 'Manual / Solar Dial · Drag compass rose or walk outdoors for GPS bearing';
    }
  }, [resolvedSource, gpsSpeedKmh]);

  const hasMagSensor =
    resolvedSource === 'tier1-absolute-sensor' ||
    resolvedSource === 'tier2-absolute' ||
    resolvedSource === 'tier2-webkit';

  const hasOrientationSensor =
    resolvedSource === 'tier2-relative' ||
    resolvedSource === 'tier2-absolute' ||
    resolvedSource === 'tier2-webkit';

  const hasGpsHeading = resolvedSource === 'tier3-gps' || gpsHeading !== null;

  const tierBadges = [
    {
      id: 'mag',
      label: 'Mag Sensor',
      active: hasMagSensor,
    },
    {
      id: 'orient',
      label: 'Orientation',
      active: hasOrientationSensor,
    },
    {
      id: 'gps',
      label: 'GPS Heading',
      active: hasGpsHeading,
    },
  ];

  return (
    <>
      <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
              Tactical Compass HUD
            </h2>
            <p
              className={`text-xs mt-0.5 ${
                isLiveSensorActive ? 'text-[#00E676]' : 'text-[#A3A3A3]'
              }`}
            >
              {sourceSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowCalibrateModal(true)}
              className="min-h-[36px] px-2.5 rounded-lg bg-black border border-[#262626] text-[11px] font-semibold text-[#A3A3A3] hover:text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Figure-8</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSolarTimeMinutes(now.getHours() * 60 + now.getMinutes());
                setShowSolarModal(true);
              }}
              className="min-h-[36px] px-2.5 rounded-lg bg-[#171200] border border-[#FFB300]/50 text-[11px] font-semibold text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Solar Backup</span>
            </button>
          </div>
        </div>

        {/* Embedded Preview iFrame Notice */}
        {isInIframe && !hasHardwareMagnetometer && (
          <div className="mt-3 rounded-xl bg-[#140F00] border border-[#FFB300]/45 px-3 py-2.5 flex items-start gap-2.5">
            <ExternalLink className="w-4 h-4 text-[#FFB300] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-xs leading-snug">
              <div className="font-bold text-[#FFB300]">
                Open deployed PWA for live magnetometer sensor
              </div>
              <p className="text-[11px] text-[#D4D4D4] mt-0.5">
                Embedded preview frames restrict phone orientation sensors. Drag
                the interactive compass dial or use Solar Backup here, or open
                the installed PWA directly on your phone for live 3-tier
                magnetometer tracking.
              </p>
            </div>
          </div>
        )}

        {/* Prominent Enable Phone Compass Sensor CTA */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTapEnableSensor}
            className={`flex-1 min-w-[200px] min-h-[46px] px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isLiveSensorActive
                ? 'bg-[#001A0D] border-[#00E676] text-[#00E676]'
                : 'bg-[#FFB300] border-[#FFB300] text-black hover:bg-[#FFC433]'
            }`}
          >
            {resolvedSource === 'tier3-gps' ? (
              <Satellite className="w-4 h-4 shrink-0" />
            ) : (
              <Compass className="w-4 h-4 shrink-0" />
            )}
            <span>
              {hasMagSensor
                ? 'Phone Compass Sensor Active'
                : resolvedSource === 'tier2-relative'
                  ? 'Orientation Sensor Active (Tap to Re-Sync)'
                  : resolvedSource === 'tier3-gps'
                    ? 'GPS Heading Active · Tap to Enable Mag Sensor'
                    : 'Enable Phone Compass Sensor'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowManualSlider((v) => !v);
              if (!showManualSlider) setCompassMode('manual');
            }}
            className={`min-h-[46px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
              showManualSlider || resolvedSource === 'manual'
                ? 'bg-[#141414] border-[#FFB300] text-[#FFB300]'
                : 'bg-black border-[#262626] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>

        {/* Clean Single Green Badge when Hardware Magnetic Fusion is Active; 3-Tier Diagnostic Pills otherwise */}
        {hasMagSensor ? (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#001A0D] border border-[#00E676] text-[#00E676] text-xs font-mono font-bold flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] shrink-0" />
            <span>Hardware Compass Active (Gyro + Mag Fusion)</span>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {tierBadges.map((tb) => (
              <div
                key={tb.id}
                className={`flex-1 min-w-[96px] px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  tb.active
                    ? 'bg-[#001A0D] border-[#00E676] text-[#00E676]'
                    : 'bg-black border-[#222222] text-[#8A8A8A]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    tb.active ? 'bg-[#00E676]' : 'bg-[#444444]'
                  }`}
                />
                <span>{tb.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Helpful Brave / Chrome Site Permission Tip when Mag Sensor stays grey */}
        {!hasMagSensor && (
          <p className="mt-2 text-[11px] text-[#A3A3A3] leading-relaxed">
            <strong className="text-[#FFB300]">Brave / Chrome Tip:</strong> If{' '}
            <span className="font-mono text-[#F5F5F5]">Mag Sensor</span> stays
            grey, open the address bar site settings and set{' '}
            <span className="font-semibold text-[#F5F5F5]">
              Motion sensors → Allow
            </span>
            , then tap{' '}
            <span className="font-semibold text-[#FFB300]">
              Enable Phone Compass Sensor
            </span>{' '}
            again.
          </p>
        )}

        {sensorStatusNote && (
          <p className="mt-1.5 text-[11px] text-[#FFB300] leading-relaxed">
            {sensorStatusNote}
          </p>
        )}

        {/* Main Compass Rose + Readout Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Interactive Draggable SVG Tactical Compass Rose */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Fixed Top Lubber Triangle */}
              <div
                aria-hidden="true"
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[12px] border-t-[#FFB300] pointer-events-none"
              />

              <svg
                ref={dialSvgRef}
                viewBox="0 0 220 220"
                onPointerDown={handleDialPointerDown}
                onPointerMove={handleDialPointerMove}
                onPointerUp={handleDialPointerUp}
                onPointerCancel={handleDialPointerUp}
                className={`w-full h-full select-none touch-none ${
                  isDraggingDial ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                role="slider"
                aria-label={`Interactive compass dial heading ${activeHeading} degrees ${headingToCardinal(activeHeading)}`}
                aria-valuemin={0}
                aria-valuemax={359}
                aria-valuenow={activeHeading}
              >
                {/* Static outer bezel */}
                <circle
                  cx="110"
                  cy="110"
                  r="102"
                  fill="#050505"
                  stroke={isLiveSensorActive ? '#00E676' : '#2E2E2E'}
                  strokeWidth="2"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="72"
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth="1"
                />

                {/* Rotating Compass Dial (Low-Pass Smoothed Unwrapped Rotation) */}
                <g
                  style={{
                    transform: `rotate(${-dialAngle.toFixed(2)}deg)`,
                    transformOrigin: '110px 110px',
                    willChange: 'transform',
                  }}
                >
                  {/* 72 degree ticks (every 5°) */}
                  {Array.from({ length: 72 }).map((_, i) => {
                    const deg = i * 5;
                    const isMajor = deg % 45 === 0;
                    const isMid = deg % 15 === 0;
                    const r1 = 98;
                    const r2 = isMajor ? 86 : isMid ? 90 : 94;
                    const rad = ((deg - 90) * Math.PI) / 180;
                    return (
                      <line
                        key={deg}
                        x1={110 + r1 * Math.cos(rad)}
                        y1={110 + r1 * Math.sin(rad)}
                        x2={110 + r2 * Math.cos(rad)}
                        y2={110 + r2 * Math.sin(rad)}
                        stroke={
                          deg === 0
                            ? '#FF3B30'
                            : isMajor
                              ? '#FFB300'
                              : '#404040'
                        }
                        strokeWidth={isMajor ? 2 : 1}
                      />
                    );
                  })}

                  {/* Cardinal & Intercardinal Labels */}
                  {CARDINAL_LABELS.map((c) => {
                    const rad = ((c.deg - 90) * Math.PI) / 180;
                    const r = 73;
                    const x = 110 + r * Math.cos(rad);
                    const y = 110 + r * Math.sin(rad);
                    return (
                      <text
                        key={c.label}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={
                          c.label === 'N'
                            ? '#FF3B30'
                            : c.major
                              ? '#F5F5F5'
                              : '#8A8A8A'
                        }
                        fontSize={c.major ? '14' : '10'}
                        fontWeight={c.major ? '700' : '600'}
                        fontFamily="JetBrains Mono, monospace"
                        transform={`rotate(${dialAngle.toFixed(2)}, ${x}, ${y})`}
                      >
                        {c.label}
                      </text>
                    );
                  })}

                  {/* North Red Needle Pointer */}
                  <polygon points="110,38 104,54 116,54" fill="#FF3B30" />

                  {/* Target Waypoint Bearing Arrow (Phosphor Safe Green) */}
                  {targetMetrics && (
                    <g transform={`rotate(${targetMetrics.bearing}, 110, 110)`}>
                      <line
                        x1="110"
                        y1="110"
                        x2="110"
                        y2="26"
                        stroke="#00E676"
                        strokeWidth="2.5"
                        strokeDasharray="4 3"
                      />
                      <polygon points="110,16 103,31 117,31" fill="#00E676" />
                    </g>
                  )}
                </g>

                {/* Center tactical readout */}
                <circle
                  cx="110"
                  cy="110"
                  r="38"
                  fill="#0A0A0A"
                  stroke="#262626"
                  strokeWidth="1.5"
                />
                <text
                  x="110"
                  y="104"
                  textAnchor="middle"
                  fill="#FFB300"
                  fontSize="20"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {String(activeHeading).padStart(3, '0')}°
                </text>
                <text
                  x="110"
                  y="124"
                  textAnchor="middle"
                  fill="#F5F5F5"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {headingToCardinal(activeHeading)}
                </text>
              </svg>
            </div>
            <span className="mt-1.5 text-[10px] font-mono text-[#737373]">
              {isLiveSensorActive
                ? 'Live heading · Drag dial to override'
                : 'Drag compass dial to set bearing'}
            </span>
          </div>

          {/* Right Side: Manual Heading Fallback & Target Waypoint Arrow Selector */}
          <div className="sm:col-span-7 space-y-3">
            {/* Manual Heading Slider */}
            {(showManualSlider || resolvedSource === 'manual') && (
              <div className="rounded-xl bg-black border border-[#222222] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A3A3A3]">Manual Heading Dial</span>
                  <span className="font-mono font-bold text-[#FFB300] tabular-nums">
                    {String(activeHeading).padStart(3, '0')}°{' '}
                    {headingToCardinal(activeHeading)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={activeHeading}
                  onChange={(e) => {
                    setCompassMode('manual');
                    setManualHeading(Number(e.target.value));
                  }}
                  aria-label="Manual compass heading degrees"
                  className="w-full accent-[#FFB300] cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'N 0°', deg: 0 },
                    { label: 'E 90°', deg: 90 },
                    { label: 'S 180°', deg: 180 },
                    { label: 'W 270°', deg: 270 },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        setCompassMode('manual');
                        setManualHeading(c.deg);
                      }}
                      className={`py-1 rounded-md text-[11px] font-mono font-semibold border cursor-pointer transition ${
                        activeHeading === c.deg
                          ? 'bg-[#FFB300] text-black border-[#FFB300]'
                          : 'bg-[#0C0C0C] text-[#A3A3A3] border-[#262626] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target Waypoint Bearing Lock */}
            <div className="rounded-xl bg-black border border-[#222222] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#00E676]" />
                  <span>Waypoint Bearing Arrow</span>
                </span>
                {targetMetrics && (
                  <span className="font-mono text-xs font-bold text-[#00E676] tabular-nums">
                    {String(targetMetrics.bearing).padStart(3, '0')}°{' '}
                    {headingToCardinal(targetMetrics.bearing)} ·{' '}
                    {targetMetrics.distanceKm < 1
                      ? `${Math.round(targetMetrics.distanceKm * 1000)}m`
                      : `${targetMetrics.distanceKm.toFixed(1)}km`}
                  </span>
                )}
              </div>

              {waypoints.length === 0 ? (
                <p className="text-[11px] text-[#737373]">
                  Pin a Safe Zone or Water waypoint to display a live green
                  direction arrow on the compass rose.
                </p>
              ) : (
                <select
                  aria-label="Target waypoint for compass bearing arrow"
                  value={targetWaypoint?.id || ''}
                  onChange={(e) =>
                    onSelectTargetWaypoint(e.target.value || null)
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg bg-[#0C0C0C] border border-[#2A2A2A] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                >
                  {waypoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Figure-8 Magnetometer Calibration Modal */}
      {showCalibrateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Figure-8 Compass Calibration"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0A] border border-[#262626] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                Figure-8 Sensor Calibration
              </h3>
              <button
                type="button"
                onClick={() => setShowCalibrateModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                aria-label="Close calibration guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Animated Figure-8 SVG Graphic */}
            <div className="mt-4 rounded-xl bg-black border border-[#222222] p-5 flex flex-col items-center">
              <svg viewBox="0 0 220 100" className="w-48 h-24">
                <path
                  d="M 55 50 C 55 18, 95 18, 110 50 C 125 82, 165 82, 165 50 C 165 18, 125 18, 110 50 C 95 82, 55 82, 55 50 Z"
                  fill="none"
                  stroke="#333333"
                  strokeWidth="6"
                />
                <path
                  d="M 55 50 C 55 18, 95 18, 110 50 C 125 82, 165 82, 165 50 C 165 18, 125 18, 110 50 C 95 82, 55 82, 55 50 Z"
                  fill="none"
                  stroke="#FFB300"
                  strokeWidth="3"
                  strokeDasharray="18 12"
                />
                <circle r="6" fill="#FFB300">
                  <animateMotion
                    dur="2.8s"
                    repeatCount="indefinite"
                    path="M 55 50 C 55 18, 95 18, 110 50 C 125 82, 165 82, 165 50 C 165 18, 125 18, 110 50 C 95 82, 55 82, 55 50 Z"
                  />
                </circle>
              </svg>
              <div className="mt-2 font-mono text-xs text-[#FFB300] tabular-nums">
                Current Reading: {String(activeHeading).padStart(3, '0')}°{' '}
                {headingToCardinal(activeHeading)}
              </div>
            </div>

            <ol className="mt-4 space-y-2 text-xs text-[#D4D4D4] leading-relaxed">
              <li>
                <span className="font-mono text-[#FFB300] font-semibold">
                  01.
                </span>{' '}
                Step 2 meters away from cars, magnetic phone mounts, or heavy
                steel.
              </li>
              <li>
                <span className="font-mono text-[#FFB300] font-semibold">
                  02.
                </span>{' '}
                Hold your phone flat and sweep it through a smooth horizontal
                Figure-8 (∞) motion 3–5 times while tilting the wrist slightly.
              </li>
              <li>
                <span className="font-mono text-[#FFB300] font-semibold">
                  03.
                </span>{' '}
                Tap Done once the heading stabilizes. If your phone lacks a
                magnetometer, walk outdoors for Tier 3 GPS bearing or use Solar
                Backup.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => {
                smoothedRef.current = null;
                attachImmediateOrientationListeners();
                startAbsoluteOrientationSensor();
                setShowCalibrateModal(false);
              }}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#FFB300] text-black text-sm font-bold cursor-pointer"
            >
              Done Calibrating
            </button>
          </div>
        </div>
      )}

      {/* Solar Compass Backup Modal */}
      {showSolarModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Solar Compass Backup"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0A] border border-[#262626] p-5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-[#FFB300]" />
                <h3 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                  Solar Compass Backup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSolarModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                aria-label="Close solar compass"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[#A3A3A3] leading-relaxed">
              Calculates True North using your clock and sun direction — works
              even if your phone’s magnetic sensor is broken or jammed.
            </p>

            {/* Hemisphere Toggle */}
            <div className="mt-3 flex gap-1 p-1 rounded-xl bg-black border border-[#222222]">
              <button
                type="button"
                onClick={() => setSolarHemisphere('north')}
                className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition ${
                  solarHemisphere === 'north'
                    ? 'bg-[#FFB300] text-black'
                    : 'text-[#A3A3A3]'
                }`}
              >
                Northern Hemisphere (India / N.A. / EU)
              </button>
              <button
                type="button"
                onClick={() => setSolarHemisphere('south')}
                className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition ${
                  solarHemisphere === 'south'
                    ? 'bg-[#FFB300] text-black'
                    : 'text-[#A3A3A3]'
                }`}
              >
                Southern Hemisphere
              </button>
            </div>

            {/* Interactive Solar Rose */}
            <div className="mt-4 flex flex-col items-center">
              <svg viewBox="0 0 220 220" className="w-48 h-48">
                <circle
                  cx="110"
                  cy="110"
                  r="98"
                  fill="#050505"
                  stroke="#262626"
                  strokeWidth="2"
                />
                {/* Phone Top Direction Marker */}
                <text
                  x="110"
                  y="24"
                  textAnchor="middle"
                  fill="#737373"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  PHONE TOP
                </text>

                {/* Sun Pointer */}
                <g transform={`rotate(${sunDirectionDeg}, 110, 110)`}>
                  <line
                    x1="110"
                    y1="110"
                    x2="110"
                    y2="42"
                    stroke="#FFB300"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <circle cx="110" cy="38" r="10" fill="#FFB300" />
                  <text
                    x="110"
                    y="41"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="8"
                    fontWeight="700"
                  >
                    SUN
                  </text>
                </g>

                {/* Calculated TRUE NORTH Arrow */}
                <g transform={`rotate(${solarCalc.trueNorthRelative}, 110, 110)`}>
                  <line
                    x1="110"
                    y1="110"
                    x2="110"
                    y2="34"
                    stroke="#FF3B30"
                    strokeWidth="3.5"
                  />
                  <polygon points="110,20 102,38 118,38" fill="#FF3B30" />
                  <text
                    x="110"
                    y="62"
                    textAnchor="middle"
                    fill="#FF3B30"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    TRUE N
                  </text>
                </g>

                <circle cx="110" cy="110" r="5" fill="#F5F5F5" />
              </svg>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#A3A3A3]">
                    1. Point Sun Arrow Toward Actual Sun
                  </span>
                  <span className="font-mono text-[#FFB300] tabular-nums">
                    {sunDirectionDeg}° rel
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={sunDirectionDeg}
                  onChange={(e) => setSunDirectionDeg(Number(e.target.value))}
                  className="w-full accent-[#FFB300] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#A3A3A3]">2. Local Solar Time</span>
                  <span className="font-mono text-[#F5F5F5] tabular-nums">
                    {solarCalc.formattedTime} (Sun Azimuth{' '}
                    {solarCalc.sunTrueAzimuth}°)
                  </span>
                </div>
                <input
                  type="range"
                  min={360}
                  max={1080}
                  step={5}
                  value={Math.max(360, Math.min(1080, solarTimeMinutes))}
                  onChange={(e) => setSolarTimeMinutes(Number(e.target.value))}
                  className="w-full accent-[#FFB300] cursor-pointer"
                />
              </div>

              <div className="rounded-xl bg-black border border-[#222222] p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#737373]">
                    Phone Top Heading (True)
                  </div>
                  <div className="font-mono text-lg font-bold text-[#FF3B30] tabular-nums">
                    {String(solarCalc.computedPhoneHeading).padStart(3, '0')}°{' '}
                    {headingToCardinal(solarCalc.computedPhoneHeading)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCompassMode('manual');
                    setManualHeading(solarCalc.computedPhoneHeading);
                    setShowSolarModal(false);
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#FFB300] text-black text-xs font-bold cursor-pointer"
                >
                  Apply to Compass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
