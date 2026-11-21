/**
 * 100% Offline Astronomical & Tactical Field Environment Calculations
 * Zero network calls — pure orbital math for Moon Phase, Sunrise/Sunset,
 * Twilight, and Solar Elevation using device GPS coordinates.
 */

export interface MoonInfo {
  phaseName: string;
  illuminationPct: number; // 0 - 100
  ageDays: number; // 0 - 29.53
  phaseFraction: number; // 0 = New, 0.25 = First Q, 0.5 = Full, 0.75 = Last Q
  isWaxing: boolean;
  daysToFull: number;
  daysToNew: number;
  nightStealthRating: string;
  nightVisibilityNote: string;
}

export interface SunSchedule {
  sunriseStr: string;
  sunsetStr: string;
  solarNoonStr: string;
  civilDawnStr: string;
  civilDuskStr: string;
  daylightDurationStr: string;
  isDaytime: boolean;
  nextEventLabel: string;
  nextEventCountdown: string;
  solarElevationDeg: number;
}

const SYNODIC_MONTH = 29.53058867;
// Known astronomical New Moon epoch: Jan 6, 2000 18:14 UTC
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export function calculateMoonInfo(date: Date = new Date()): MoonInfo {
  const daysSinceEpoch = (date.getTime() - NEW_MOON_EPOCH_MS) / 86400000;
  const cycles = daysSinceEpoch / SYNODIC_MONTH;
  const frac = ((cycles % 1) + 1) % 1; // 0..1
  const ageDays = frac * SYNODIC_MONTH;
  const illuminationPct = Math.round(((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100);
  const isWaxing = frac < 0.5;

  let phaseName = 'New Moon';
  if (frac < 0.03 || frac >= 0.97) phaseName = 'New Moon';
  else if (frac < 0.22) phaseName = 'Waxing Crescent';
  else if (frac < 0.28) phaseName = 'First Quarter';
  else if (frac < 0.47) phaseName = 'Waxing Gibbous';
  else if (frac < 0.53) phaseName = 'Full Moon';
  else if (frac < 0.72) phaseName = 'Waning Gibbous';
  else if (frac < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  const daysToFull =
    frac <= 0.5
      ? (0.5 - frac) * SYNODIC_MONTH
      : (1.5 - frac) * SYNODIC_MONTH;
  const daysToNew = (1 - frac) * SYNODIC_MONTH;

  let nightStealthRating = 'High Cover (Dark)';
  let nightVisibilityNote =
    'Low ambient moonlight — ideal for stealth movement; flashlight needed for rough terrain.';
  if (illuminationPct >= 75) {
    nightStealthRating = 'Low Cover (Bright)';
    nightVisibilityNote =
      'Strong moonlight casts sharp shadows; travel possible without torch, but open areas expose silhouettes.';
  } else if (illuminationPct >= 30) {
    nightStealthRating = 'Moderate Cover';
    nightVisibilityNote =
      'Partial moonlight outlines trails and skylines; stick to tree lines for concealment.';
  }

  return {
    phaseName,
    illuminationPct,
    ageDays,
    phaseFraction: frac,
    isWaxing,
    daysToFull,
    daysToNew,
    nightStealthRating,
    nightVisibilityNote,
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function formatMinutesToLocalTime(totalMinutesUtc: number, date: Date): string {
  const tzOffsetMin = -date.getTimezoneOffset();
  const localMin = (((totalMinutesUtc + tzOffsetMin) % 1440) + 1440) % 1440;
  const hrs = Math.floor(localMin / 60);
  const mins = Math.floor(localMin % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * NOAA simplified solar calculator for local Sunrise, Sunset, Civil Twilight,
 * and current Solar Elevation angle from GPS latitude/longitude.
 */
export function calculateSunSchedule(
  lat: number,
  lon: number,
  date: Date = new Date()
): SunSchedule {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear =
    Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year gamma (radians)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (utcHours - 12) / 24);

  // Equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = toRad(lat);

  // Current solar elevation angle
  const trueSolarTimeMin =
    (((utcHours * 60 + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngleDeg = trueSolarTimeMin / 4 - 180;
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(toRad(hourAngleDeg));
  const solarElevationDeg = Math.round(
    90 - toDeg(Math.acos(Math.max(-1, Math.min(1, cosZenith))))
  );

  // Hour angle helper for a given zenith (90.833° sunrise/sunset, 96° civil twilight)
  const computeHourAngleDeg = (zenithDeg: number): number | null => {
    const cosH =
      Math.cos(toRad(zenithDeg)) / (Math.cos(latRad) * Math.cos(decl)) -
      Math.tan(latRad) * Math.tan(decl);
    if (cosH > 1 || cosH < -1) return null;
    return toDeg(Math.acos(cosH));
  };

  const haSun = computeHourAngleDeg(90.833);
  const haCivil = computeHourAngleDeg(96.0);
  const solarNoonUtc = 720 - 4 * lon - eqTime;

  if (haSun === null) {
    const alwaysDay = solarElevationDeg > 0;
    return {
      sunriseStr: alwaysDay ? 'Polar Day' : 'Polar Night',
      sunsetStr: alwaysDay ? 'Polar Day' : 'Polar Night',
      solarNoonStr: formatMinutesToLocalTime(solarNoonUtc, date),
      civilDawnStr: '--:--',
      civilDuskStr: '--:--',
      daylightDurationStr: alwaysDay ? '24h 00m' : '0h 00m',
      isDaytime: alwaysDay,
      nextEventLabel: alwaysDay ? 'Continuous Daylight' : 'Continuous Night',
      nextEventCountdown: '--',
      solarElevationDeg,
    };
  }

  const sunriseUtc = solarNoonUtc - haSun * 4;
  const sunsetUtc = solarNoonUtc + haSun * 4;
  const daylightMin = haSun * 8;

  const civilDawnUtc = haCivil !== null ? solarNoonUtc - haCivil * 4 : sunriseUtc - 24;
  const civilDuskUtc = haCivil !== null ? solarNoonUtc + haCivil * 4 : sunsetUtc + 24;

  const nowUtcMin = date.getUTCHours() * 60 + date.getUTCMinutes();
  const normSunrise = ((sunriseUtc % 1440) + 1440) % 1440;
  const normSunset = ((sunsetUtc % 1440) + 1440) % 1440;

  // Determine daytime reliably via solar elevation or sunrise/sunset window
  const isDaytime = solarElevationDeg >= 0;

  let nextEventLabel = 'Until Sunset';
  let diffMin = 0;
  if (isDaytime) {
    nextEventLabel = 'Daylight Left';
    diffMin = ((normSunset - nowUtcMin) % 1440 + 1440) % 1440;
  } else {
    nextEventLabel = 'Until Sunrise';
    diffMin = ((normSunrise - nowUtcMin) % 1440 + 1440) % 1440;
  }

  return {
    sunriseStr: formatMinutesToLocalTime(sunriseUtc, date),
    sunsetStr: formatMinutesToLocalTime(sunsetUtc, date),
    solarNoonStr: formatMinutesToLocalTime(solarNoonUtc, date),
    civilDawnStr: formatMinutesToLocalTime(civilDawnUtc, date),
    civilDuskStr: formatMinutesToLocalTime(civilDuskUtc, date),
    daylightDurationStr: formatDuration(daylightMin),
    isDaytime,
    nextEventLabel,
    nextEventCountdown: formatDuration(diffMin),
    solarElevationDeg,
  };
}

export interface WeatherSign {
  indicator: string;
  forecast: string;
  action: string;
  severity: 'alert' | 'normal';
}

export const FIELD_WEATHER_SIGNS: WeatherSign[] = [
  {
    indicator: 'Tall Anvil Clouds (Cumulonimbus) + Sudden Cool Gust',
    forecast: 'Severe thunderstorm & lightning within 20–60 min',
    action: 'Drop off ridges immediately; secure tarp and dig drainage trench.',
    severity: 'alert',
  },
  {
    indicator: 'Wispy Hooked High Clouds (Cirrus "Mare\'s Tails")',
    forecast: 'Warm front & steady rain arriving in 24–36 hours',
    action: 'Collect dry firewood now and stage rainwater catchment sheets.',
    severity: 'normal',
  },
  {
    indicator: 'Halo Ring Around Sun or Moon',
    forecast: 'High ice crystals signaling rain/snow within 18–24 hours',
    action: 'Waterproof sleeping gear and reinforce shelter roof pitch.',
    severity: 'normal',
  },
  {
    indicator: 'Campfire Smoke Drops Low & Curls Downward',
    forecast: 'Falling barometric pressure — incoming storm system',
    action: 'Expect rain and wind shift; prepare enclosed waterproof cover.',
    severity: 'alert',
  },
  {
    indicator: 'Heavy Morning Dew on Grass + Clear Dawn Sky',
    forecast: 'High-pressure stability — dry, fair weather expected today',
    action: 'Good window for solar water disinfection (SODIS) and long-range travel.',
    severity: 'normal',
  },
];
