export type RadioCategory = 'air' | 'distress' | 'ham' | 'walkie';

export interface RadioFrequencyEntry {
  id: string;
  freqDisplay: string;
  freqMhz: number;
  band: string;
  mode: string;
  category: RadioCategory;
  region: string;
  title: string;
  notes: string;
  priority?: 'critical' | 'standard';
}

export const RADIO_CATEGORY_LABELS: Record<RadioCategory | 'all', string> = {
  all: 'All Bands',
  air: 'AIR India',
  distress: 'Distress',
  ham: 'Ham 40m/20m',
  walkie: 'Walkie-Talkie',
};

export const EMERGENCY_RADIO_FREQUENCIES: RadioFrequencyEntry[] = [
  // ==================== ALL INDIA RADIO (AIR) EMERGENCY MW / SW ====================
  {
    id: 'air-delhi-819',
    freqDisplay: '819 kHz',
    freqMhz: 0.819,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · North / National',
    title: 'AIR Delhi Indraprastha (National Emergency)',
    notes: 'Primary high-power MW channel for national disaster bulletins, NDMA alerts, and news.',
    priority: 'critical',
  },
  {
    id: 'air-delhi-666',
    freqDisplay: '666 kHz',
    freqMhz: 0.666,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · Delhi NCR',
    title: 'AIR Delhi Rajdhani',
    notes: 'High-power North India regional MW relay; carries Hindi & English emergency advisories.',
  },
  {
    id: 'air-mumbai-1044',
    freqDisplay: '1044 kHz',
    freqMhz: 1.044,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · West / Arabian Sea',
    title: 'AIR Mumbai Samvadita',
    notes: 'West Coast emergency & Arabian Sea cyclone/flood alerts (Maharashtra & Gujarat).',
    priority: 'critical',
  },
  {
    id: 'air-kolkata-657',
    freqDisplay: '657 kHz',
    freqMhz: 0.657,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · East / Bay of Bengal',
    title: 'AIR Kolkata Geetanjali',
    notes: 'Primary East India cyclone, flood & Bay of Bengal coastal warning MW station.',
    priority: 'critical',
  },
  {
    id: 'air-chennai-720',
    freqDisplay: '720 kHz',
    freqMhz: 0.72,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · South / Tamil Nadu',
    title: 'AIR Chennai A',
    notes: 'South India coastal cyclone, tsunami & state emergency disaster broadcast.',
    priority: 'critical',
  },
  {
    id: 'air-bengaluru-612',
    freqDisplay: '612 kHz',
    freqMhz: 0.612,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · Karnataka / Deccan',
    title: 'AIR Bengaluru',
    notes: 'Regional MW broadcast covering Karnataka & Deccan plateau.',
  },
  {
    id: 'air-hyderabad-738',
    freqDisplay: '738 kHz',
    freqMhz: 0.738,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · Telangana / AP',
    title: 'AIR Hyderabad',
    notes: 'High-power MW station for Telangana & Andhra Pradesh emergency alerts.',
  },
  {
    id: 'air-nagpur-1566',
    freqDisplay: '1566 kHz',
    freqMhz: 1.566,
    band: 'MW (AM)',
    mode: 'AM',
    category: 'air',
    region: 'India · Central / Pan-India Night',
    title: 'AIR National Channel (Nagpur 1000kW)',
    notes: 'High-power central transmitter with huge nighttime skywave reach across India.',
  },
  {
    id: 'air-sw-5040',
    freqDisplay: '5.040 MHz',
    freqMhz: 5.04,
    band: '60m SW',
    mode: 'AM',
    category: 'air',
    region: 'India · Nighttime Regional SW',
    title: 'AIR Shortwave Tropical Band (Night)',
    notes: 'Best after sunset for regional skywave coverage when local FM/MW towers fail.',
  },
  {
    id: 'air-sw-7270',
    freqDisplay: '7.270 MHz',
    freqMhz: 7.27,
    band: '41m SW',
    mode: 'AM',
    category: 'air',
    region: 'India · Dusk / Dawn SW',
    title: 'AIR Shortwave National Relay (41m)',
    notes: 'Reliable medium-range shortwave broadcast across Indian states at dawn & dusk.',
  },
  {
    id: 'air-sw-9425',
    freqDisplay: '9.425 MHz',
    freqMhz: 9.425,
    band: '31m SW',
    mode: 'AM',
    category: 'air',
    region: 'India · Pan-India / South Asia',
    title: 'AIR External & National Shortwave (31m)',
    notes: 'Long-distance daytime/evening shortwave bulletins reachable with simple wire antenna.',
  },
  {
    id: 'air-sw-11670',
    freqDisplay: '11.670 MHz',
    freqMhz: 11.67,
    band: '25m SW',
    mode: 'AM',
    category: 'air',
    region: 'India · Daytime Pan-India SW',
    title: 'AIR National / Vividh Bharati SW (25m)',
    notes: 'Strong daytime shortwave band for pan-India coverage without local repeaters.',
  },
  {
    id: 'air-fm-1026',
    freqDisplay: '102.6 MHz',
    freqMhz: 102.6,
    band: 'FM VHF',
    mode: 'WFM',
    category: 'air',
    region: 'India · Metro Cities',
    title: 'AIR FM Rainbow / Local Metro Emergency',
    notes: 'Line-of-sight urban FM; check 100.1–107.2 MHz locally for municipal advisories.',
  },

  // ==================== INTERNATIONAL DISTRESS FREQUENCIES ====================
  {
    id: 'distress-air-1215',
    freqDisplay: '121.500 MHz',
    freqMhz: 121.5,
    band: 'VHF Air',
    mode: 'AM',
    category: 'distress',
    region: 'Global',
    title: 'International Aviation Emergency (Guard)',
    notes: 'Monitored by ATC, commercial aircraft & SAR helicopters. Civil ELT beacon frequency.',
    priority: 'critical',
  },
  {
    id: 'distress-mil-243',
    freqDisplay: '243.000 MHz',
    freqMhz: 243.0,
    band: 'UHF Air',
    mode: 'AM',
    category: 'distress',
    region: 'Global',
    title: 'Military Aviation Distress & SAR',
    notes: 'Second harmonic of 121.5 MHz; used by military SAR & rescue aircraft.',
    priority: 'critical',
  },
  {
    id: 'distress-marine-ch16',
    freqDisplay: '156.800 MHz',
    freqMhz: 156.8,
    band: 'VHF Marine',
    mode: 'FM (Ch 16)',
    category: 'distress',
    region: 'Global · Coastal & Sea',
    title: 'Marine VHF Channel 16 (Distress & Calling)',
    notes: 'Monitored 24/7 by Indian Coast Guard, ports, and all commercial vessels.',
    priority: 'critical',
  },
  {
    id: 'distress-maritime-2182',
    freqDisplay: '2182 kHz',
    freqMhz: 2.182,
    band: 'MF Marine',
    mode: 'USB / AM',
    category: 'distress',
    region: 'Global · Maritime',
    title: 'International Maritime Distress Calling',
    notes: 'Long-range coastal & ship-to-ship voice distress frequency (up to 300+ km).',
    priority: 'critical',
  },
  {
    id: 'distress-navtex-518',
    freqDisplay: '518 kHz',
    freqMhz: 0.518,
    band: 'MF Navtex',
    mode: 'SITOR-B',
    category: 'distress',
    region: 'Global · Maritime',
    title: 'International NAVTEX Maritime Warnings',
    notes: 'Automated weather, storm & coastal navigation safety broadcasts in English.',
  },
  {
    id: 'distress-hf-4125',
    freqDisplay: '4.125 MHz',
    freqMhz: 4.125,
    band: 'HF Marine',
    mode: 'USB',
    category: 'distress',
    region: 'Global · Ocean SAR',
    title: 'Maritime HF Distress & SAR Voice',
    notes: 'Long-range HF rescue coordination alongside 6.215 MHz and 8.291 MHz USB.',
  },
  {
    id: 'distress-epirb-406',
    freqDisplay: '406.025 MHz',
    freqMhz: 406.025,
    band: 'UHF Sat',
    mode: 'Digital Burst',
    category: 'distress',
    region: 'Global · Satellite',
    title: 'COSPAS-SARSAT Satellite Distress (EPIRB/PLB)',
    notes: 'Global rescue satellite uplink for personal locator beacons (receive-only reference).',
  },

  // ==================== HAM RADIO EMERGENCY BANDS (40m / 20m / VHF) ====================
  {
    id: 'ham-40m-7110',
    freqDisplay: '7.110 MHz',
    freqMhz: 7.11,
    band: '40m HF',
    mode: 'LSB',
    category: 'ham',
    region: 'IARU Region 3 (India / Asia-Pacific)',
    title: '40m Emergency Center of Activity (Region 3)',
    notes: 'Primary regional HF disaster net frequency across India & Asia day and night.',
    priority: 'critical',
  },
  {
    id: 'ham-40m-7050',
    freqDisplay: '7.050 MHz',
    freqMhz: 7.05,
    band: '40m HF',
    mode: 'LSB / CW',
    category: 'ham',
    region: 'India (VU Ham Net)',
    title: 'VU India Amateur Disaster & Relief Net',
    notes: 'Widely monitored by Indian licensed amateur radio operators (NIAR / ARSI) during disasters.',
    priority: 'critical',
  },
  {
    id: 'ham-20m-14300',
    freqDisplay: '14.300 MHz',
    freqMhz: 14.3,
    band: '20m HF',
    mode: 'USB',
    category: 'ham',
    region: 'Global',
    title: '20m Global Emergency & Maritime Mobile Net',
    notes: 'International daytime emergency frequency monitored continuously worldwide.',
    priority: 'critical',
  },
  {
    id: 'ham-20m-14260',
    freqDisplay: '14.260 MHz',
    freqMhz: 14.26,
    band: '20m HF',
    mode: 'USB',
    category: 'ham',
    region: 'IARU Region 3 (India / Asia)',
    title: '20m Region 3 Emergency Calling',
    notes: 'Daytime inter-state & international disaster traffic across South Asia.',
  },
  {
    id: 'ham-80m-3750',
    freqDisplay: '3.750 MHz',
    freqMhz: 3.75,
    band: '80m HF',
    mode: 'LSB',
    category: 'ham',
    region: 'Regional · Nighttime NVIS',
    title: '80m Regional Nighttime Emergency Net',
    notes: 'High-angle NVIS propagation reaches 50–400 km over mountains/hills at night.',
  },
  {
    id: 'ham-2m-145500',
    freqDisplay: '145.500 MHz',
    freqMhz: 145.5,
    band: '2m VHF',
    mode: 'FM Simplex',
    category: 'ham',
    region: 'India / Region 3',
    title: '2m VHF Amateur Emergency Simplex Calling',
    notes: 'Primary handheld Baofeng/VHF direct simplex channel when repeaters are down.',
    priority: 'critical',
  },
  {
    id: 'ham-70cm-433500',
    freqDisplay: '433.500 MHz',
    freqMhz: 433.5,
    band: '70cm UHF',
    mode: 'FM Simplex',
    category: 'ham',
    region: 'Global / Region 3',
    title: '70cm UHF Amateur Simplex Calling',
    notes: 'Better indoor/urban concrete penetration for short-range city block rescue comms.',
  },

  // ==================== WALKIE-TALKIE (FRS / PMR446 / CB) ====================
  {
    id: 'wt-frs-1',
    freqDisplay: '462.5625 MHz',
    freqMhz: 462.5625,
    band: 'FRS / GMRS',
    mode: 'NFM (Ch 1)',
    category: 'walkie',
    region: 'US / Global FRS Handhelds',
    title: 'FRS / GMRS Channel 1 (Primary Calling)',
    notes: 'Universal survival calling channel (no CTCSS/PL privacy tone so all radios hear).',
    priority: 'critical',
  },
  {
    id: 'wt-frs-3',
    freqDisplay: '462.6125 MHz',
    freqMhz: 462.6125,
    band: 'FRS / GMRS',
    mode: 'NFM (Ch 3)',
    category: 'walkie',
    region: 'Wilderness / 3-3-3 Plan',
    title: 'FRS Channel 3 (3-3-3 Survival Schedule)',
    notes: 'Check every 3 hours for 3 minutes on Channel 3 to save walkie-talkie battery.',
  },
  {
    id: 'wt-gmrs-20',
    freqDisplay: '462.6750 MHz',
    freqMhz: 462.675,
    band: 'GMRS',
    mode: 'FM (Ch 20)',
    category: 'walkie',
    region: 'US / GMRS Emergency',
    title: 'GMRS Channel 20 (Emergency / Traveler)',
    notes: 'Traditional GMRS emergency & highway assistance channel (141.3 Hz tone optional).',
  },
  {
    id: 'wt-pmr-1',
    freqDisplay: '446.00625 MHz',
    freqMhz: 446.00625,
    band: 'PMR446',
    mode: 'NFM (Ch 1)',
    category: 'walkie',
    region: 'India / EU / UK License-Free',
    title: 'PMR446 Channel 1 (License-Free Calling)',
    notes: 'Standard license-free UHF walkie-talkie calling channel across India & Europe.',
    priority: 'critical',
  },
  {
    id: 'wt-pmr-8',
    freqDisplay: '446.09375 MHz',
    freqMhz: 446.09375,
    band: 'PMR446',
    mode: 'NFM (Ch 8)',
    category: 'walkie',
    region: 'India / EU Mountain Rescue',
    title: 'PMR446 Channel 8 (Mountain / Tactical 8-8)',
    notes: 'Used by hikers & off-grid survival teams (Ch 8, sub-code 8 or open squelch).',
  },
  {
    id: 'wt-cb-9',
    freqDisplay: '27.065 MHz',
    freqMhz: 27.065,
    band: 'CB 11m',
    mode: 'AM (Ch 9)',
    category: 'walkie',
    region: 'Global / India License-Free CB',
    title: 'CB Radio Channel 9 (Emergency & Highway)',
    notes: '27 MHz license-exempt Citizens Band emergency channel for vehicle convoys.',
  },
];

export interface DipoleMetrics {
  freqMhz: number;
  fullWaveM: number;
  halfWaveTotalM: number;
  eachLegM: number;
  quarterWhipM: number;
  halfWaveTotalFt: number;
  eachLegFt: number;
}

/**
 * Practical wire Dipole Antenna Length Calculator:
 * Half-wave dipole total length in meters = 142.5 / f(MHz) (includes ~0.95 end-effect velocity factor)
 * Each leg = 71.25 / f(MHz)
 */
export function computeDipoleMetrics(freqMhz: number): DipoleMetrics | null {
  if (!Number.isFinite(freqMhz) || freqMhz <= 0.1 || freqMhz > 3000) return null;
  const fullWaveM = 299.792 / freqMhz;
  const halfWaveTotalM = 142.5 / freqMhz;
  const eachLegM = halfWaveTotalM / 2;
  const quarterWhipM = eachLegM;
  const halfWaveTotalFt = halfWaveTotalM * 3.28084;
  const eachLegFt = eachLegM * 3.28084;

  return {
    freqMhz,
    fullWaveM,
    halfWaveTotalM,
    eachLegM,
    quarterWhipM,
    halfWaveTotalFt,
    eachLegFt,
  };
}

export function formatLengthMeters(meters: number): string {
  if (meters < 1) {
    return `${(meters * 100).toFixed(1)} cm`;
  }
  return `${meters.toFixed(2)} m`;
}

export function formatLengthFeet(feet: number): string {
  if (feet < 2) {
    return `${(feet * 12).toFixed(1)} in`;
  }
  const wholeFt = Math.floor(feet);
  const inches = Math.round((feet - wholeFt) * 12);
  if (inches === 12) return `${wholeFt + 1} ft 0 in`;
  return `${wholeFt} ft ${inches} in`;
}

export const MORSE_TO_CHAR: Record<string, string> = {
  '.-': 'A',
  '-...': 'B',
  '-.-.': 'C',
  '-..': 'D',
  '.': 'E',
  '..-.': 'F',
  '--.': 'G',
  '....': 'H',
  '..': 'I',
  '.---': 'J',
  '-.-': 'K',
  '.-..': 'L',
  '--': 'M',
  '-.': 'N',
  '---': 'O',
  '.--.': 'P',
  '--.-': 'Q',
  '.-.': 'R',
  '...': 'S',
  '-': 'T',
  '..-': 'U',
  '...-': 'V',
  '.--': 'W',
  '-..-': 'X',
  '-.--': 'Y',
  '--..': 'Z',
  '-----': '0',
  '.----': '1',
  '..---': '2',
  '...--': '3',
  '....-': '4',
  '.....': '5',
  '-....': '6',
  '--...': '7',
  '---..': '8',
  '----.': '9',
  '.-.-.-': '.',
  '--..--': ',',
  '..--..': '?',
  '-..-.': '/',
  '-....-': '-',
  '-.--.': '(',
  '-.--.-': ')',
  '...---...': ' [SOS] ',
  '.-.-.': ' [AR] ',
  '-...-': ' = ',
};
