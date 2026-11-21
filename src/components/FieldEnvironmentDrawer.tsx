import React, { useMemo, useState } from 'react';
import {
  CloudRain,
  Compass,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  X,
} from 'lucide-react';
import {
  FIELD_WEATHER_SIGNS,
  calculateMoonInfo,
  calculateSunSchedule,
} from '../utils/astronomy';

interface FieldEnvironmentDrawerProps {
  open: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  locationLabel: string;
}

/**
 * Custom SVG Moon disc showing exact waxing/waning terminator shading
 */
const MoonPhaseSVG: React.FC<{ phaseFraction: number }> = ({ phaseFraction }) => {
  // phaseFraction: 0 = New, 0.25 = First Quarter, 0.5 = Full, 0.75 = Last Quarter
  const r = 34;
  const cx = 42;
  const cy = 42;
  const isWaxing = phaseFraction < 0.5;
  // rx of inner terminator ellipse varies from +r (New) -> 0 (Quarter) -> -r (Full)
  const cosPhase = Math.cos(phaseFraction * 2 * Math.PI);
  const rx = Math.abs(cosPhase) * r;
  const isGibbous = phaseFraction > 0.25 && phaseFraction < 0.75;

  // Build lit path on right side for waxing, left side for waning
  const outerSweep = isWaxing ? 1 : 0;
  const innerSweep = isWaxing ? (isGibbous ? 1 : 0) : isGibbous ? 0 : 1;

  const litPath =
    phaseFraction < 0.02 || phaseFraction > 0.98
      ? ''
      : phaseFraction > 0.48 && phaseFraction < 0.52
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`
        : `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;

  return (
    <svg
      viewBox="0 0 84 84"
      className="w-20 h-20 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#0D0D0D"
        stroke="#333333"
        strokeWidth="1.5"
      />
      {litPath && <path d={litPath} fill="#FFB300" />}
      {/* Subtle tactical crater ticks */}
      <circle cx={cx - 8} cy={cy - 10} r="4" fill="#000000" fillOpacity="0.16" />
      <circle cx={cx + 11} cy={cy + 6} r="6" fill="#000000" fillOpacity="0.14" />
      <circle cx={cx - 4} cy={cy + 14} r="3" fill="#000000" fillOpacity="0.15" />
    </svg>
  );
};

export const FieldEnvironmentDrawer: React.FC<FieldEnvironmentDrawerProps> = ({
  open,
  onClose,
  lat,
  lon,
  locationLabel,
}) => {
  const [starMethod, setStarMethod] = useState<'polaris' | 'orion' | 'crux'>(
    lat >= 0 ? 'polaris' : 'crux'
  );

  const moon = useMemo(() => calculateMoonInfo(new Date()), [open]);
  const sun = useMemo(
    () => calculateSunSchedule(lat, lon, new Date()),
    [lat, lon, open]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Field Environment — Moon Phase, Solar Schedule & Celestial Navigation"
    >
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-[#0A0A0A] border-t sm:border border-[#262626] max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#222222] shrink-0">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
              Field Environment
            </h2>
            <p className="text-xs text-[#A3A3A3] font-mono tabular-nums">
              {locationLabel} · {lat.toFixed(3)}°, {lon.toFixed(3)}° · Offline
              Ephemeris
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-[#F5F5F5] flex items-center justify-center cursor-pointer"
            aria-label="Close Field Environment drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Moon Phase & Night-Ops Illumination */}
          <section className="rounded-xl bg-black border border-[#222222] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB300] mb-3">
              <Moon className="w-4 h-4" />
              <span>Lunar Phase & Night Visibility</span>
            </div>

            <div className="flex items-center gap-4">
              <MoonPhaseSVG phaseFraction={moon.phaseFraction} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold text-[#F5F5F5]">
                    {moon.phaseName}
                  </span>
                  <span className="font-mono text-xl font-bold text-[#FFB300] tabular-nums">
                    {moon.illuminationPct}%
                  </span>
                </div>
                <div className="text-xs text-[#A3A3A3] font-mono tabular-nums">
                  Age {moon.ageDays.toFixed(1)}d · Full in{' '}
                  {moon.daysToFull.toFixed(1)}d · New in{' '}
                  {moon.daysToNew.toFixed(1)}d
                </div>
                <div className="text-xs text-[#F5F5F5] font-semibold pt-1">
                  Stealth Assessment:{' '}
                  <span
                    className={
                      moon.illuminationPct >= 75
                        ? 'text-[#FF3B30]'
                        : 'text-[#22C55E]'
                    }
                  >
                    {moon.nightStealthRating}
                  </span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  {moon.nightVisibilityNote}
                </p>
              </div>
            </div>
          </section>

          {/* 2. GPS-Calculated Solar Schedule */}
          <section className="rounded-xl bg-black border border-[#222222] p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FFB300]">
                <Sun className="w-4 h-4" />
                <span>Solar Schedule (GPS Calculated)</span>
              </div>
              <span className="font-mono text-xs text-[#F5F5F5] tabular-nums">
                {sun.nextEventLabel}:{' '}
                <strong className="text-[#FFB300]">
                  {sun.nextEventCountdown}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg bg-[#0B0B0B] border border-[#1E1E1E] p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#737373]">
                  <Sunrise className="w-3.5 h-3.5 text-[#FFB300]" />
                  <span>Sunrise</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#F5F5F5] tabular-nums">
                  {sun.sunriseStr}
                </div>
                <div className="font-mono text-[10px] text-[#737373] tabular-nums">
                  Dawn {sun.civilDawnStr}
                </div>
              </div>

              <div className="rounded-lg bg-[#0B0B0B] border border-[#1E1E1E] p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#737373]">
                  <Sunset className="w-3.5 h-3.5 text-[#FF3B30]" />
                  <span>Sunset</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#F5F5F5] tabular-nums">
                  {sun.sunsetStr}
                </div>
                <div className="font-mono text-[10px] text-[#737373] tabular-nums">
                  Dusk {sun.civilDuskStr}
                </div>
              </div>

              <div className="rounded-lg bg-[#0B0B0B] border border-[#1E1E1E] p-2.5">
                <div className="text-[11px] text-[#737373]">Daylight Span</div>
                <div className="mt-1 font-mono text-base font-bold text-[#FFB300] tabular-nums">
                  {sun.daylightDurationStr}
                </div>
                <div className="font-mono text-[10px] text-[#737373] tabular-nums">
                  Noon {sun.solarNoonStr}
                </div>
              </div>

              <div className="rounded-lg bg-[#0B0B0B] border border-[#1E1E1E] p-2.5">
                <div className="text-[11px] text-[#737373]">Sun Elevation</div>
                <div className="mt-1 font-mono text-base font-bold text-[#F5F5F5] tabular-nums">
                  {sun.solarElevationDeg}°
                </div>
                <div className="text-[10px] text-[#737373]">
                  {sun.isDaytime ? 'Above horizon' : 'Below horizon'}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Celestial North Star Navigation Guide (Polaris / Orion / Crux) */}
          <section className="rounded-xl bg-black border border-[#222222] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FFB300]">
                <Sparkles className="w-4 h-4" />
                <span>Celestial North Star Guide</span>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0D0D0D] border border-[#222222]">
                {(
                  [
                    { id: 'polaris', label: 'Polaris (North)' },
                    { id: 'orion', label: 'Orion (E–W)' },
                    { id: 'crux', label: 'Crux (South)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStarMethod(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      starMethod === tab.id
                        ? 'bg-[#FFB300] text-black'
                        : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {starMethod === 'polaris' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <svg
                  viewBox="0 0 280 150"
                  className="sm:col-span-6 w-full h-36 rounded-lg bg-[#05070B] border border-[#1E1E1E]"
                >
                  {/* Big Dipper bowl & handle */}
                  <polyline
                    points="26,112 58,96 90,94 114,104 118,128 152,126 156,100 114,104"
                    fill="none"
                    stroke="#525252"
                    strokeWidth="1.2"
                  />
                  {/* Pointer stars Merak -> Dubhe -> Polaris */}
                  <line
                    x1="152"
                    y1="126"
                    x2="178"
                    y2="28"
                    stroke="#FFB300"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Stars */}
                  {[
                    [26, 112],
                    [58, 96],
                    [90, 94],
                    [114, 104],
                    [118, 128],
                    [152, 126],
                    [156, 100],
                  ].map(([x, y], idx) => (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={idx >= 5 ? 3.5 : 2.5}
                      fill={idx >= 5 ? '#FFB300' : '#F5F5F5'}
                    />
                  ))}
                  {/* Polaris */}
                  <circle cx="178" cy="28" r="5" fill="#22C55E" />
                  <circle
                    cx="178"
                    cy="28"
                    r="9"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  {/* Vertical drop to True North horizon */}
                  <line
                    x1="178"
                    y1="38"
                    x2="178"
                    y2="142"
                    stroke="#22C55E"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text
                    x="190"
                    y="32"
                    fill="#22C55E"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    POLARIS (N)
                  </text>
                  <text
                    x="122"
                    y="75"
                    fill="#FFB300"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    5× Gap
                  </text>
                  <text
                    x="24"
                    y="138"
                    fill="#737373"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    BIG DIPPER (URSA MAJOR)
                  </text>
                  <text
                    x="184"
                    y="142"
                    fill="#22C55E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    TRUE NORTH
                  </text>
                </svg>

                <ol className="sm:col-span-6 space-y-1.5 text-xs text-[#E5E5E5] leading-relaxed">
                  <li>
                    <strong className="text-[#FFB300]">1.</strong> Locate the
                    Big Dipper (7 bright stars shaped like a ladle) in the
                    northern sky.
                  </li>
                  <li>
                    <strong className="text-[#FFB300]">2.</strong> Take the two
                    outer rim stars of the bowl (Merak & Dubhe) and extend that
                    line <strong>5× the distance</strong> upward.
                  </li>
                  <li>
                    <strong className="text-[#22C55E]">3.</strong> The bright
                    star it hits is <strong>Polaris (North Star)</strong>. Drop
                    straight down to the horizon for{' '}
                    <strong>True North (±1°)</strong>.
                  </li>
                </ol>
              </div>
            )}

            {starMethod === 'orion' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <svg
                  viewBox="0 0 280 150"
                  className="sm:col-span-6 w-full h-36 rounded-lg bg-[#05070B] border border-[#1E1E1E]"
                >
                  {/* Orion body */}
                  <polygon
                    points="98,28 168,36 154,122 106,118"
                    fill="none"
                    stroke="#333333"
                    strokeWidth="1.2"
                  />
                  {/* Orion's Belt (3 tight stars) */}
                  <line
                    x1="120"
                    y1="78"
                    x2="148"
                    y2="70"
                    stroke="#FFB300"
                    strokeWidth="2"
                  />
                  {[
                    [98, 28],
                    [168, 36],
                    [154, 122],
                    [106, 118],
                  ].map(([x, y], idx) => (
                    <circle key={idx} cx={x} cy={y} r="3" fill="#E5E5E5" />
                  ))}
                  {/* Belt stars: Mintaka is top-right */}
                  <circle cx="120" cy="78" r="3.5" fill="#FFB300" />
                  <circle cx="134" cy="74" r="3.5" fill="#FFB300" />
                  <circle cx="148" cy="70" r="4.5" fill="#22C55E" />
                  {/* East-West arrow */}
                  <line
                    x1="28"
                    y1="138"
                    x2="252"
                    y2="138"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                  />
                  <text
                    x="158"
                    y="72"
                    fill="#22C55E"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    MINTAKA (0° EQ)
                  </text>
                  <text
                    x="22"
                    y="132"
                    fill="#38BDF8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    RISES DUE EAST
                  </text>
                  <text
                    x="176"
                    y="132"
                    fill="#38BDF8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    SETS DUE WEST
                  </text>
                </svg>

                <ol className="sm:col-span-6 space-y-1.5 text-xs text-[#E5E5E5] leading-relaxed">
                  <li>
                    <strong className="text-[#FFB300]">1.</strong> Works in BOTH
                    Northern & Southern hemispheres whenever Polaris is blocked.
                  </li>
                  <li>
                    <strong className="text-[#FFB300]">2.</strong> Find the 3
                    tight, evenly spaced stars of <strong>Orion&apos;s Belt</strong>.
                  </li>
                  <li>
                    <strong className="text-[#22C55E]">3.</strong> The leading
                    star (<strong>Mintaka</strong>) sits on the celestial
                    equator — it ALWAYS rises within 1° of{' '}
                    <strong>Due East</strong> and sets <strong>Due West</strong>.
                  </li>
                </ol>
              </div>
            )}

            {starMethod === 'crux' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <svg
                  viewBox="0 0 280 150"
                  className="sm:col-span-6 w-full h-36 rounded-lg bg-[#05070B] border border-[#1E1E1E]"
                >
                  {/* Southern Cross */}
                  <line
                    x1="100"
                    y1="26"
                    x2="100"
                    y2="68"
                    stroke="#FFB300"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="82"
                    y1="44"
                    x2="118"
                    y2="44"
                    stroke="#FFB300"
                    strokeWidth="1.5"
                  />
                  {[
                    [100, 26],
                    [100, 68],
                    [82, 44],
                    [118, 44],
                  ].map(([x, y], idx) => (
                    <circle key={idx} cx={x} cy={y} r="3.2" fill="#FFB300" />
                  ))}
                  {/* 4.5x extension to South Celestial Pole */}
                  <line
                    x1="100"
                    y1="68"
                    x2="100"
                    y2="128"
                    stroke="#22C55E"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx="100"
                    cy="128"
                    r="5"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="1.5"
                  />
                  <text
                    x="128"
                    y="46"
                    fill="#FFB300"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    CRUX (SOUTHERN CROSS)
                  </text>
                  <text
                    x="110"
                    y="102"
                    fill="#22C55E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    4.5× Long Axis
                  </text>
                  <text
                    x="112"
                    y="132"
                    fill="#22C55E"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    SOUTH POLE (NORTH = BEHIND)
                  </text>
                </svg>

                <ol className="sm:col-span-6 space-y-1.5 text-xs text-[#E5E5E5] leading-relaxed">
                  <li>
                    <strong className="text-[#FFB300]">1.</strong> Locate the
                    kite-shaped <strong>Southern Cross (Crux)</strong>.
                  </li>
                  <li>
                    <strong className="text-[#FFB300]">2.</strong> Extend its
                    long axis <strong>4.5× downward</strong> to find the empty
                    South Celestial Pole, then drop straight down for{' '}
                    <strong>True South</strong>.
                  </li>
                  <li>
                    <strong className="text-[#22C55E]">3.</strong> Turn 180°
                    around to face <strong>True North</strong>.
                  </li>
                </ol>
              </div>
            )}
          </section>

          {/* 4. Offline Tactical Weather Signs */}
          <section className="rounded-xl bg-black border border-[#222222] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB300] mb-2.5">
              <CloudRain className="w-4 h-4" />
              <span>Zero-Internet Field Weather Signs</span>
            </div>
            <div className="divide-y divide-[#181818]">
              {FIELD_WEATHER_SIGNS.map((sign) => (
                <div key={sign.indicator} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#F5F5F5]">
                      {sign.indicator}
                    </span>
                    {sign.severity === 'alert' && (
                      <span className="text-[10px] font-mono font-bold text-[#FF3B30] uppercase shrink-0">
                        Storm Alert
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#FFB300]">
                    {sign.forecast}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#A3A3A3]">
                    Action: {sign.action}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-2 text-[11px] text-[#737373] px-1">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>
              All moon, sun, and star calculations run locally on device clock +
              GPS with zero internet required.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
