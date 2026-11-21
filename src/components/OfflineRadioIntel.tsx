import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Antenna,
  AudioLines,
  Check,
  Copy,
  Download,
  Magnet,
  Mic,
  MicOff,
  Play,
  Radio,
  Search,
  Send,
  Square,
  Trash2,
  Volume2,
  Waves,
} from 'lucide-react';
import {
  computeDipoleMetrics,
  EMERGENCY_RADIO_FREQUENCIES,
  formatLengthFeet,
  formatLengthMeters,
  MORSE_TO_CHAR,
  RADIO_CATEGORY_LABELS,
  type RadioCategory,
} from '../data/radioFrequencies';

type RadioSubTool = 'directory' | 'morse' | 'emf' | 'recorder';

interface OfflineRadioIntelProps {
  coordsStr: string | null;
  onLogRadioIntel?: (text: string, priority?: 'SOS' | 'INFO') => void;
}

// W3C Generic Sensor API Magnetometer typing
interface MagnetometerInstance extends EventTarget {
  readonly x: number | null;
  readonly y: number | null;
  readonly z: number | null;
  readonly activated: boolean;
  start: () => void;
  stop: () => void;
}

interface MagnetometerConstructor {
  new (options?: { frequency?: number }): MagnetometerInstance;
}

interface SavedRadioClip {
  id: string;
  title: string;
  timestamp: string;
  gps: string | null;
  durationSec: number;
  bandpassFiltered: boolean;
  mimeType: string;
  blob: Blob;
}

// ==================== INDEXEDDB STORAGE FOR OFFLINE RADIO CLIPS ====================
const CLIP_DB_NAME = 'z_survival_radio_clips_v1';
const CLIP_STORE_NAME = 'clips';

function openClipsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CLIP_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CLIP_STORE_NAME)) {
        db.createObjectStore(CLIP_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllClips(): Promise<SavedRadioClip[]> {
  try {
    const db = await openClipsDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CLIP_STORE_NAME, 'readonly');
      const store = tx.objectStore(CLIP_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as SavedRadioClip[]) || [];
        rows.sort((a, b) => b.id.localeCompare(a.id));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbSaveClip(clip: SavedRadioClip): Promise<void> {
  const db = await openClipsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CLIP_STORE_NAME, 'readwrite');
    tx.objectStore(CLIP_STORE_NAME).put(clip);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDeleteClip(id: string): Promise<void> {
  const db = await openClipsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CLIP_STORE_NAME, 'readwrite');
    tx.objectStore(CLIP_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const OfflineRadioIntel: React.FC<OfflineRadioIntelProps> = ({
  coordsStr,
  onLogRadioIntel,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<RadioSubTool>('directory');

  // ==================== 1. FREQUENCY DIRECTORY & DIPOLE ANTENNA CALCULATOR ====================
  const [freqQuery, setFreqQuery] = useState('');
  const [freqCategory, setFreqCategory] = useState<RadioCategory | 'all'>('all');
  const [dipoleFreqInput, setDipoleFreqInput] = useState('145.5');
  const dipoleRef = useRef<HTMLDivElement | null>(null);

  const filteredFrequencies = useMemo(() => {
    const q = freqQuery.trim().toLowerCase();
    return EMERGENCY_RADIO_FREQUENCIES.filter((entry) => {
      if (freqCategory !== 'all' && entry.category !== freqCategory) {
        return false;
      }
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.freqDisplay.toLowerCase().includes(q) ||
        entry.band.toLowerCase().includes(q) ||
        entry.region.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.mode.toLowerCase().includes(q)
      );
    });
  }, [freqQuery, freqCategory]);

  const dipoleMetrics = useMemo(
    () => computeDipoleMetrics(parseFloat(dipoleFreqInput)),
    [dipoleFreqInput]
  );

  // ==================== 2. LIVE RADIO MORSE (CW) & TONE DECODER ====================
  const [morseListening, setMorseListening] = useState(false);
  const [morseError, setMorseError] = useState<string | null>(null);
  const [morseToneActive, setMorseToneActive] = useState(false);
  const [morsePeakHz, setMorsePeakHz] = useState<number>(0);
  const [morseSignalLevel, setMorseSignalLevel] = useState<number>(0);
  const [morseThreshold, setMorseThreshold] = useState<number>(42);
  const [morseDotMs, setMorseDotMs] = useState<number>(95); // ~12.6 WPM default
  const [morseAutoTrack, setMorseAutoTrack] = useState<boolean>(true);
  const [morseTargetHz, setMorseTargetHz] = useState<number>(700);
  const [morseCurrentSymbols, setMorseCurrentSymbols] = useState<string>('');
  const [morseDecodedText, setMorseDecodedText] = useState<string>('');
  const [morseCopied, setMorseCopied] = useState(false);

  const morseCtxRef = useRef<AudioContext | null>(null);
  const morseStreamRef = useRef<MediaStream | null>(null);
  const morseRafRef = useRef<number | null>(null);
  const morseThresholdRef = useRef(morseThreshold);
  const morseDotMsRef = useRef(morseDotMs);
  const morseAutoTrackRef = useRef(morseAutoTrack);
  const morseTargetHzRef = useRef(morseTargetHz);

  useEffect(() => {
    morseThresholdRef.current = morseThreshold;
  }, [morseThreshold]);
  useEffect(() => {
    morseDotMsRef.current = morseDotMs;
  }, [morseDotMs]);
  useEffect(() => {
    morseAutoTrackRef.current = morseAutoTrack;
  }, [morseAutoTrack]);
  useEffect(() => {
    morseTargetHzRef.current = morseTargetHz;
  }, [morseTargetHz]);

  const stopMorseDecoder = useCallback(() => {
    if (morseRafRef.current !== null) {
      cancelAnimationFrame(morseRafRef.current);
      morseRafRef.current = null;
    }
    if (morseStreamRef.current) {
      morseStreamRef.current.getTracks().forEach((t) => t.stop());
      morseStreamRef.current = null;
    }
    if (morseCtxRef.current) {
      morseCtxRef.current.close().catch(() => {});
      morseCtxRef.current = null;
    }
    setMorseListening(false);
    setMorseToneActive(false);
    setMorseSignalLevel(0);
  }, []);

  const startMorseDecoder = async () => {
    setMorseError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      morseStreamRef.current = stream;
      morseCtxRef.current = ctx;
      setMorseListening(true);

      const bins = new Uint8Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / analyser.fftSize;

      let toneOn = false;
      let stateChangedAt = performance.now();
      let symbolBuf = '';
      let wordSpaceEmitted = true;
      let lastUiUpdate = 0;

      const tick = () => {
        if (!morseCtxRef.current) return;
        analyser.getByteFrequencyData(bins);

        const minHz = morseAutoTrackRef.current
          ? 380
          : Math.max(250, morseTargetHzRef.current - 90);
        const maxHz = morseAutoTrackRef.current
          ? 1450
          : Math.min(2400, morseTargetHzRef.current + 90);

        const startBin = Math.max(1, Math.floor(minHz / binHz));
        const endBin = Math.min(bins.length - 1, Math.ceil(maxHz / binHz));

        let peakVal = 0;
        let peakBin = startBin;
        let sumOthers = 0;
        let countOthers = 0;

        for (let i = startBin; i <= endBin; i++) {
          const v = bins[i];
          if (v > peakVal) {
            peakVal = v;
            peakBin = i;
          }
          sumOthers += v;
          countOthers++;
        }

        const avgFloor = countOthers > 0 ? sumOthers / countOthers : 0;
        // Narrowband CW tone score favors sharp spectral peak above room noise floor
        const snrBoost = Math.max(0, peakVal - avgFloor * 0.65);
        const normalizedPct = Math.min(100, Math.round((snrBoost / 210) * 100));
        const detectedHz = Math.round(peakBin * binHz);

        const now = performance.now();
        const threshold = morseThresholdRef.current;
        const dotUnit = morseDotMsRef.current;

        // Hysteresis prevents chatter around squelch threshold
        const isHigh = toneOn
          ? normalizedPct >= threshold * 0.72
          : normalizedPct >= threshold;

        if (isHigh !== toneOn) {
          const duration = now - stateChangedAt;
          if (toneOn) {
            // Tone just ended -> classify dot vs dash (ignore tiny <28ms noise clicks)
            if (duration >= Math.max(28, dotUnit * 0.35)) {
              const sym = duration >= dotUnit * 2.1 ? '-' : '.';
              symbolBuf += sym;
              wordSpaceEmitted = false;
              setMorseCurrentSymbols(symbolBuf);
            }
          }
          toneOn = isHigh;
          stateChangedAt = now;
          setMorseToneActive(toneOn);
        } else if (!toneOn) {
          const silenceDur = now - stateChangedAt;
          // Letter boundary (~2.4x dot unit)
          if (symbolBuf.length > 0 && silenceDur >= dotUnit * 2.4) {
            const decoded = MORSE_TO_CHAR[symbolBuf] || '?';
            setMorseDecodedText((prev) => (prev + decoded).slice(-400));
            symbolBuf = '';
            setMorseCurrentSymbols('');
          }
          // Word boundary (~6x dot unit)
          if (!wordSpaceEmitted && symbolBuf.length === 0 && silenceDur >= dotUnit * 6) {
            setMorseDecodedText((prev) =>
              prev.endsWith(' ') || prev.length === 0 ? prev : prev + ' '
            );
            wordSpaceEmitted = true;
          }
        }

        if (now - lastUiUpdate >= 65) {
          lastUiUpdate = now;
          setMorseSignalLevel(normalizedPct);
          if (normalizedPct >= threshold * 0.6) {
            setMorsePeakHz(detectedHz);
          }
        }

        morseRafRef.current = requestAnimationFrame(tick);
      };

      morseRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setMorseError(
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Allow mic permission to decode radio Morse tones.'
      );
      stopMorseDecoder();
    }
  };

  // Play an audible 700Hz Morse SOS test beacon so users can test/calibrate the decoder
  const playMorseSosTest = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const unit = morseDotMs / 1000;
      const pattern = [1, 1, 1, 3, 3, 3, 1, 1, 1];
      let t = ctx.currentTime + 0.05;
      pattern.forEach((units, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = morseAutoTrack ? 700 : morseTargetHz;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
        gain.gain.setValueAtTime(0.22, t + units * unit - 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t + units * unit);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + units * unit + 0.01);
        const gap = idx === 2 || idx === 5 ? 3 : 1;
        t += (units + gap) * unit;
      });
      setTimeout(() => ctx.close().catch(() => {}), (t - ctx.currentTime + 0.5) * 1000);
    } catch {
      // ignore audio block
    }
  };

  // ==================== 3. EMF / ELECTRONIC SIGNAL & TRANSMITTER DETECTOR ====================
  const [emfActive, setEmfActive] = useState(false);
  const [emfStatus, setEmfStatus] = useState<
    'idle' | 'live' | 'unsupported' | 'denied'
  >('idle');
  const [emfReading, setEmfReading] = useState<{
    x: number;
    y: number;
    z: number;
    mag: number;
  }>({ x: 0, y: 0, z: 0, mag: 0 });
  const [emfBaselineUt, setEmfBaselineUt] = useState<number>(45);
  const [emfAlertThresholdUt, setEmfAlertThresholdUt] = useState<number>(95);
  const [emfAudioAlert, setEmfAudioAlert] = useState<boolean>(true);
  const [emfHistory, setEmfHistory] = useState<number[]>([]);

  const emfSensorRef = useRef<MagnetometerInstance | null>(null);
  const emfLastBeepRef = useRef<number>(0);
  const emfAlertRef = useRef(emfAlertThresholdUt);
  const emfAudioAlertRef = useRef(emfAudioAlert);

  useEffect(() => {
    emfAlertRef.current = emfAlertThresholdUt;
  }, [emfAlertThresholdUt]);
  useEffect(() => {
    emfAudioAlertRef.current = emfAudioAlert;
  }, [emfAudioAlert]);

  const triggerEmfSpikeBeep = useCallback(() => {
    const now = performance.now();
    if (now - emfLastBeepRef.current < 450) return;
    emfLastBeepRef.current = now;
    try {
      if (navigator.vibrate) navigator.vibrate(80);
      if (!emfAudioAlertRef.current) return;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 1650;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
      setTimeout(() => ctx.close().catch(() => {}), 200);
    } catch {
      // ignore audio/vibe block
    }
  }, []);

  const stopEmfDetector = useCallback(() => {
    if (emfSensorRef.current) {
      try {
        emfSensorRef.current.stop();
      } catch {
        // ignore
      }
      emfSensorRef.current = null;
    }
    setEmfActive(false);
  }, []);

  const startEmfDetector = () => {
    stopEmfDetector();
    const MagCtor = (
      window as unknown as { Magnetometer?: MagnetometerConstructor }
    ).Magnetometer;

    if (!MagCtor) {
      setEmfStatus('unsupported');
      setEmfActive(false);
      return;
    }

    try {
      const sensor = new MagCtor({ frequency: 15 });
      let lastPush = 0;

      const onReading = () => {
        const x = sensor.x ?? 0;
        const y = sensor.y ?? 0;
        const z = sensor.z ?? 0;
        const mag = Math.sqrt(x * x + y * y + z * z);

        const now = performance.now();
        if (now - lastPush >= 85) {
          lastPush = now;
          setEmfReading({
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            z: Math.round(z * 10) / 10,
            mag: Math.round(mag * 10) / 10,
          });
          setEmfHistory((prev) => [...prev.slice(-39), mag]);
          setEmfStatus('live');
        }

        if (mag >= emfAlertRef.current) {
          triggerEmfSpikeBeep();
        }
      };

      const onError = (ev: Event) => {
        const errEvt = ev as Event & { error?: { name?: string } };
        if (errEvt.error?.name === 'NotAllowedError') {
          setEmfStatus('denied');
        } else {
          setEmfStatus('unsupported');
        }
        stopEmfDetector();
      };

      sensor.addEventListener('reading', onReading);
      sensor.addEventListener('error', onError);
      emfSensorRef.current = sensor;
      sensor.start();
      setEmfActive(true);
      setEmfStatus('live');
    } catch {
      setEmfStatus('unsupported');
      setEmfActive(false);
    }
  };

  const emfDeltaUt = Math.round((emfReading.mag - emfBaselineUt) * 10) / 10;
  const isEmfAlert = emfActive && emfReading.mag >= emfAlertThresholdUt;
  const emfMeterPct = Math.min(100, Math.round((emfReading.mag / 200) * 100));

  // ==================== 4. FILTERED RADIO BROADCAST RECORDER ====================
  const [recActive, setRecActive] = useState(false);
  const [recBandpassOn, setRecBandpassOn] = useState(true);
  const [recTitle, setRecTitle] = useState('');
  const [recSeconds, setRecSeconds] = useState(0);
  const [recLevelPct, setRecLevelPct] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const [savedClips, setSavedClips] = useState<SavedRadioClip[]>([]);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const recMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recRafRef = useRef<number | null>(null);
  const recStartTimeRef = useRef<number>(0);
  const recAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const recAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    void idbGetAllClips().then(setSavedClips);
  }, []);

  const cleanupRecorderResources = useCallback(() => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (recRafRef.current !== null) {
      cancelAnimationFrame(recRafRef.current);
      recRafRef.current = null;
    }
    if (recStreamRef.current) {
      recStreamRef.current.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
    }
    if (recAudioCtxRef.current) {
      recAudioCtxRef.current.close().catch(() => {});
      recAudioCtxRef.current = null;
    }
    setRecActive(false);
    setRecLevelPct(0);
  }, []);

  const startRadioRecording = async () => {
    setRecError(null);
    if (typeof MediaRecorder === 'undefined') {
      setRecError('MediaRecorder is not supported in this browser.');
      return;
    }

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      recStreamRef.current = rawStream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      recAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(rawStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;

      const dest = ctx.createMediaStreamDestination();

      if (recBandpassOn) {
        // Tactical Radio Voice Bandpass Filter Chain: 300Hz HPF -> 3000Hz LPF -> Dynamics Compressor
        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 300;
        hpf.Q.value = 0.85;

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 3000;
        lpf.Q.value = 0.85;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -24;
        comp.knee.value = 18;
        comp.ratio.value = 4;
        comp.attack.value = 0.005;
        comp.release.value = 0.15;

        source.connect(hpf);
        hpf.connect(lpf);
        lpf.connect(comp);
        comp.connect(analyser);
        comp.connect(dest);
      } else {
        source.connect(analyser);
        source.connect(dest);
      }

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType =
        preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(
        dest.stream,
        mimeType ? { mimeType } : undefined
      );
      recChunksRef.current = [];

      const clipTitleSnap =
        recTitle.trim() ||
        `Radio Intel ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      const clipGpsSnap = coordsStr;
      const clipFilterSnap = recBandpassOn;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(recChunksRef.current, { type: finalMime });
        const durSec = Math.max(
          1,
          Math.round((Date.now() - recStartTimeRef.current) / 1000)
        );

        const newClip: SavedRadioClip = {
          id: `clip-${Date.now()}`,
          title: clipTitleSnap,
          timestamp: new Date().toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          gps: clipGpsSnap,
          durationSec: durSec,
          bandpassFiltered: clipFilterSnap,
          mimeType: finalMime,
          blob,
        };

        try {
          await idbSaveClip(newClip);
          setSavedClips((prev) => [newClip, ...prev]);
          setRecTitle('');
          onLogRadioIntel?.(
            `Recorded broadcast clip: "${newClip.title}" (${formatDuration(durSec)}${
              clipFilterSnap ? ', 300Hz-3kHz Filtered' : ''
            })`,
            'INFO'
          );
        } catch {
          setRecError('Could not save clip to offline storage.');
        }

        cleanupRecorderResources();
      };

      recMediaRecorderRef.current = recorder;
      recStartTimeRef.current = Date.now();
      setRecSeconds(0);
      setRecActive(true);
      recorder.start(250);

      recTimerRef.current = setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - recStartTimeRef.current) / 1000));
      }, 500);

      // Live level meter
      const timeData = new Uint8Array(analyser.frequencyBinCount);
      const meterLoop = () => {
        if (!recAudioCtxRef.current) return;
        analyser.getByteTimeDomainData(timeData);
        let peak = 0;
        for (let i = 0; i < timeData.length; i++) {
          const amp = Math.abs(timeData[i] - 128) / 128;
          if (amp > peak) peak = amp;
        }
        setRecLevelPct(Math.min(100, Math.round(peak * 140)));
        recRafRef.current = requestAnimationFrame(meterLoop);
      };
      recRafRef.current = requestAnimationFrame(meterLoop);
    } catch (err) {
      setRecError(
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Allow mic permission to record radio broadcasts.'
      );
      cleanupRecorderResources();
    }
  };

  const stopRadioRecording = () => {
    if (
      recMediaRecorderRef.current &&
      recMediaRecorderRef.current.state !== 'inactive'
    ) {
      recMediaRecorderRef.current.stop();
    } else {
      cleanupRecorderResources();
    }
  };

  const handleTogglePlayClip = (clip: SavedRadioClip) => {
    if (playingClipId === clip.id && recAudioElemRef.current) {
      recAudioElemRef.current.pause();
      setPlayingClipId(null);
      return;
    }

    if (recAudioElemRef.current) {
      recAudioElemRef.current.pause();
    }
    if (recAudioUrlRef.current) {
      URL.revokeObjectURL(recAudioUrlRef.current);
    }

    const url = URL.createObjectURL(clip.blob);
    recAudioUrlRef.current = url;
    const audio = new Audio(url);
    recAudioElemRef.current = audio;
    audio.onended = () => setPlayingClipId(null);
    audio.onerror = () => setPlayingClipId(null);
    setPlayingClipId(clip.id);
    void audio.play().catch(() => setPlayingClipId(null));
  };

  const handleDownloadClip = (clip: SavedRadioClip) => {
    const ext = clip.mimeType.includes('mp4')
      ? 'm4a'
      : clip.mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';
    const url = URL.createObjectURL(clip.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clip.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDeleteClip = async (id: string) => {
    if (playingClipId === id && recAudioElemRef.current) {
      recAudioElemRef.current.pause();
      setPlayingClipId(null);
    }
    await idbDeleteClip(id);
    setSavedClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Cleanup all audio/sensor handles on unmount
  useEffect(() => {
    return () => {
      stopMorseDecoder();
      stopEmfDetector();
      cleanupRecorderResources();
      if (recAudioElemRef.current) {
        recAudioElemRef.current.pause();
      }
      if (recAudioUrlRef.current) {
        URL.revokeObjectURL(recAudioUrlRef.current);
      }
    };
  }, [stopMorseDecoder, stopEmfDetector, cleanupRecorderResources]);

  const subTools: Array<{
    id: RadioSubTool;
    label: string;
    icon: React.FC<{ className?: string }>;
    live?: boolean;
  }> = [
    { id: 'directory', label: 'Freq & Antenna', icon: Antenna },
    {
      id: 'morse',
      label: 'Morse Decoder',
      icon: Waves,
      live: morseListening,
    },
    { id: 'emf', label: 'EMF Meter', icon: Magnet, live: emfActive },
    {
      id: 'recorder',
      label: 'Radio Recorder',
      icon: AudioLines,
      live: recActive,
    },
  ];

  return (
    <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
            Offline Radio & Signal Intel
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            AIR & Global distress directory · Live CW Morse decoder · µT EMF
            detector · 300Hz–3kHz broadcast recorder
          </p>
        </div>
        <Radio className="w-6 h-6 text-[#FFB300] shrink-0" />
      </div>

      {/* 4 Sub-Tool Pills (360px Safe, Non-Truncating) */}
      <div
        role="tablist"
        aria-label="Radio and Signal Intel Tools"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {subTools.map((tool) => {
          const Icon = tool.icon;
          const active = activeSubTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSubTool(tool.id)}
              className={`shrink-0 min-h-[38px] px-3 rounded-full border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-[#FFB300] border-[#FFB300] text-black'
                  : 'bg-black border-[#262626] text-[#C8C8C8] hover:border-[#FFB300]/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tool.label}</span>
              {tool.live && (
                <span
                  className="w-2 h-2 rounded-full bg-[#FF3B30]"
                  aria-label="Active"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ==================== 1. FREQUENCY DIRECTORY + DIPOLE CALCULATOR ==================== */}
      {activeSubTool === 'directory' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={freqQuery}
                onChange={(e) => setFreqQuery(e.target.value)}
                placeholder="Search AIR Delhi, 121.5, Ch-16, 40m, PMR446..."
                className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-black border border-[#262626] text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                ['all', 'air', 'distress', 'ham', 'walkie'] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFreqCategory(cat)}
                  className={`min-h-[32px] px-2.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    freqCategory === cat
                      ? 'bg-[#171200] border-[#FFB300] text-[#FFB300]'
                      : 'bg-black border-[#222222] text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  {RADIO_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Offline Frequency List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-[#1A1A1A] rounded-xl bg-black border border-[#222222] px-3">
            {filteredFrequencies.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#737373]">
                No offline frequency matched &ldquo;{freqQuery}&rdquo;.
              </p>
            ) : (
              filteredFrequencies.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          item.priority === 'critical'
                            ? 'text-[#FF3B30]'
                            : 'text-[#FFB300]'
                        }`}
                      >
                        {item.freqDisplay}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] font-mono text-[10px] text-[#D4D4D4]">
                        {item.band} · {item.mode}
                      </span>
                      <span className="text-[10px] text-[#737373]">
                        {item.region}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#F5F5F5]">
                      {item.title}
                    </div>
                    <p className="text-[11px] text-[#A3A3A3] leading-snug">
                      {item.notes}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDipoleFreqInput(String(item.freqMhz));
                      dipoleRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      });
                    }}
                    className="self-start shrink-0 min-h-[32px] px-2.5 rounded-lg bg-[#0E0E0E] border border-[#2A2A2A] text-[10px] font-mono font-semibold text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Antenna className="w-3 h-3" />
                    <span>Calc Antenna</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Dipole Antenna Length Calculator */}
          <div
            ref={dipoleRef}
            className="rounded-xl bg-black border border-[#262626] p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Antenna className="w-4 h-4 text-[#FFB300] shrink-0" />
                <h3 className="font-display text-lg font-bold tracking-wide text-[#F5F5F5]">
                  Dipole Antenna Length Calculator
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#737373]">
                L = 142.5 / f(MHz)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <input
                  type="number"
                  step="any"
                  min="0.2"
                  max="3000"
                  value={dipoleFreqInput}
                  onChange={(e) => setDipoleFreqInput(e.target.value)}
                  aria-label="Frequency in MHz"
                  className="w-full min-h-[42px] pl-3 pr-14 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] font-mono text-sm text-[#FFB300] font-bold tabular-nums focus:outline-none focus:border-[#FFB300]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#737373]">
                  MHz
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { label: '7.11', val: '7.11' },
                  { label: '14.3', val: '14.3' },
                  { label: '121.5', val: '121.5' },
                  { label: '145.5', val: '145.5' },
                  { label: '156.8', val: '156.8' },
                  { label: '446.0', val: '446.00625' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDipoleFreqInput(p.val)}
                    className={`min-h-[34px] px-2 rounded-lg border font-mono text-[11px] font-semibold cursor-pointer ${
                      dipoleFreqInput === p.val
                        ? 'bg-[#FFB300] border-[#FFB300] text-black'
                        : 'bg-[#0A0A0A] border-[#242424] text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {dipoleMetrics ? (
              <>
                {/* Tactical Inline SVG Dipole Diagram */}
                <div className="rounded-lg bg-[#080808] border border-[#1E1E1E] p-2.5">
                  <svg
                    viewBox="0 0 360 72"
                    className="w-full h-16"
                    aria-label="Half-wave dipole wire diagram"
                  >
                    {/* Left wire leg */}
                    <line
                      x1="18"
                      y1="30"
                      x2="168"
                      y2="30"
                      stroke="#FFB300"
                      strokeWidth="3"
                    />
                    <circle cx="18" cy="30" r="3.5" fill="#FF3B30" />
                    {/* Right wire leg */}
                    <line
                      x1="192"
                      y1="30"
                      x2="342"
                      y2="30"
                      stroke="#FFB300"
                      strokeWidth="3"
                    />
                    <circle cx="342" cy="30" r="3.5" fill="#FF3B30" />
                    {/* Center feedpoint insulator + coax drop */}
                    <rect
                      x="168"
                      y="22"
                      width="24"
                      height="16"
                      rx="3"
                      fill="#141414"
                      stroke="#00E676"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="180"
                      y1="38"
                      x2="180"
                      y2="66"
                      stroke="#00E676"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                    {/* Dimensions */}
                    <text
                      x="92"
                      y="18"
                      textAnchor="middle"
                      fill="#F5F5F5"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Leg A: {formatLengthMeters(dipoleMetrics.eachLegM)}
                    </text>
                    <text
                      x="268"
                      y="18"
                      textAnchor="middle"
                      fill="#F5F5F5"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Leg B: {formatLengthMeters(dipoleMetrics.eachLegM)}
                    </text>
                    <text
                      x="180"
                      y="64"
                      textAnchor="middle"
                      fill="#00E676"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      COAX / FEEDPOINT
                    </text>
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#0A0A0A] border border-[#222222] p-2.5">
                    <div className="text-[10px] text-[#737373]">
                      Total Half-Wave
                    </div>
                    <div className="font-mono text-sm font-bold text-[#FFB300] tabular-nums mt-0.5">
                      {formatLengthMeters(dipoleMetrics.halfWaveTotalM)}
                    </div>
                    <div className="font-mono text-[10px] text-[#A3A3A3] tabular-nums">
                      {formatLengthFeet(dipoleMetrics.halfWaveTotalFt)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] border border-[#222222] p-2.5">
                    <div className="text-[10px] text-[#737373]">
                      Each Wire Leg
                    </div>
                    <div className="font-mono text-sm font-bold text-[#00E676] tabular-nums mt-0.5">
                      {formatLengthMeters(dipoleMetrics.eachLegM)}
                    </div>
                    <div className="font-mono text-[10px] text-[#A3A3A3] tabular-nums">
                      {formatLengthFeet(dipoleMetrics.eachLegFt)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] border border-[#222222] p-2.5">
                    <div className="text-[10px] text-[#737373]">
                      1/4-Wave Whip
                    </div>
                    <div className="font-mono text-sm font-bold text-[#F5F5F5] tabular-nums mt-0.5">
                      {formatLengthMeters(dipoleMetrics.quarterWhipM)}
                    </div>
                    <div className="font-mono text-[10px] text-[#A3A3A3] tabular-nums">
                      λ = {formatLengthMeters(dipoleMetrics.fullWaveM)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#FF3B30]">
                Enter a valid frequency between 0.2 and 3000 MHz.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. LIVE RADIO MORSE (CW) & TONE DECODER ==================== */}
      {activeSubTool === 'morse' && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={morseListening ? stopMorseDecoder : startMorseDecoder}
              className={`flex-1 min-w-[180px] min-h-[48px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                morseListening
                  ? 'bg-[#FF3B30] text-white'
                  : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
              }`}
            >
              {morseListening ? (
                <>
                  <MicOff className="w-4 h-4 shrink-0" />
                  <span>Stop CW Mic Decoder</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>Listen to Radio Morse (CW)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={playMorseSosTest}
              className="min-h-[48px] px-3.5 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Test SOS</span>
            </button>
          </div>

          {morseError && (
            <div className="rounded-xl bg-[#1A0505] border border-[#FF3B30]/60 px-3 py-2 text-xs text-[#FF8A80]">
              {morseError}
            </div>
          )}

          {/* Live Tone Envelope & Carrier Pitch Readout */}
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  morseToneActive
                    ? 'text-[#00E676]'
                    : morseListening
                      ? 'text-[#FFB300]'
                      : 'text-[#737373]'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    morseToneActive
                      ? 'bg-[#00E676]'
                      : morseListening
                        ? 'bg-[#FFB300]'
                        : 'bg-[#333333]'
                  }`}
                />
                {morseToneActive
                  ? 'CW CARRIER DETECTED'
                  : morseListening
                    ? 'LISTENING FOR BEEPS...'
                    : 'DECODER STANDBY'}
              </span>
              <span className="text-[#A3A3A3] tabular-nums">
                {morsePeakHz > 0 ? `${morsePeakHz} Hz` : '-- Hz'} ·{' '}
                {Math.round(1200 / morseDotMs)} WPM
              </span>
            </div>

            {/* Signal Level Meter with Threshold Marker */}
            <div className="relative w-full h-3.5 rounded-full bg-[#141414] overflow-hidden border border-[#222222]">
              <div
                className={`h-full transition-all duration-75 ${
                  morseToneActive ? 'bg-[#00E676]' : 'bg-[#FFB300]'
                }`}
                style={{ width: `${morseSignalLevel}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-0.5 bg-[#FF3B30]"
                style={{ left: `${morseThreshold}%` }}
              />
            </div>

            {/* Sliders: Squelch Threshold + WPM Dot Speed + Carrier Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#A3A3A3]">Squelch Threshold</span>
                  <span className="font-mono text-[#FF3B30] tabular-nums">
                    {morseThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={morseThreshold}
                  onChange={(e) => setMorseThreshold(Number(e.target.value))}
                  className="w-full accent-[#FF3B30] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#A3A3A3]">CW Speed (Dot Unit)</span>
                  <span className="font-mono text-[#FFB300] tabular-nums">
                    {Math.round(1200 / morseDotMs)} WPM ({morseDotMs}ms)
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={180}
                  step={5}
                  value={morseDotMs}
                  onChange={(e) => setMorseDotMs(Number(e.target.value))}
                  className="w-full accent-[#FFB300] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#181818]">
              <label className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={morseAutoTrack}
                  onChange={(e) => setMorseAutoTrack(e.target.checked)}
                  className="accent-[#FFB300]"
                />
                <span>Auto-Lock Pitch (380–1450 Hz)</span>
              </label>

              {!morseAutoTrack && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#FFB300] tabular-nums">
                    {morseTargetHz} Hz
                  </span>
                  <input
                    type="range"
                    min={400}
                    max={1400}
                    step={25}
                    value={morseTargetHz}
                    onChange={(e) => setMorseTargetHz(Number(e.target.value))}
                    className="w-28 accent-[#FFB300] cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Decoded Morse Output Box */}
          <div className="rounded-xl bg-black border border-[#262626] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#737373]">
                LIVE BUFFER:{' '}
                <strong className="text-[#FFB300] tracking-widest">
                  {morseCurrentSymbols || '—'}
                </strong>
              </span>
              <div className="flex items-center gap-1.5">
                {morseDecodedText && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(morseDecodedText).catch(() => {});
                        setMorseCopied(true);
                        setTimeout(() => setMorseCopied(false), 1500);
                      }}
                      className="min-h-[30px] px-2 rounded-lg bg-[#121212] border border-[#262626] text-[11px] text-[#FFB300] flex items-center gap-1 cursor-pointer"
                    >
                      {morseCopied ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{morseCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onLogRadioIntel && (
                      <button
                        type="button"
                        onClick={() =>
                          onLogRadioIntel(
                            `CW Morse RX: ${morseDecodedText.trim()}`,
                            morseDecodedText.includes('SOS') ? 'SOS' : 'INFO'
                          )
                        }
                        className="min-h-[30px] px-2 rounded-lg bg-[#171200] border border-[#FFB300]/60 text-[11px] font-semibold text-[#FFB300] flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Log</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMorseDecodedText('');
                        setMorseCurrentSymbols('');
                      }}
                      className="min-h-[30px] px-2 rounded-lg bg-[#121212] border border-[#262626] text-[11px] text-[#A3A3A3] hover:text-[#FF3B30] cursor-pointer"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="min-h-[84px] max-h-[160px] overflow-y-auto rounded-lg bg-[#070707] border border-[#1A1A1A] p-3 font-mono text-sm text-[#00E676] tracking-wider break-words">
              {morseDecodedText || (
                <span className="text-[#525252] text-xs font-sans tracking-normal">
                  Hold your phone microphone near an external pocket radio or
                  walkie-talkie speaker. Decoded Morse text will stream here live.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. EMF / ELECTRONIC SIGNAL & TRANSMITTER DETECTOR ==================== */}
      {activeSubTool === 'emf' && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={emfActive ? stopEmfDetector : startEmfDetector}
              className={`flex-1 min-w-[180px] min-h-[48px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                emfActive
                  ? 'bg-[#FF3B30] text-white'
                  : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
              }`}
            >
              <Magnet className="w-4 h-4 shrink-0" />
              <span>
                {emfActive
                  ? 'Stop EMF Field Meter'
                  : 'Start Magnetometer EMF Scan'}
              </span>
            </button>

            <button
              type="button"
              disabled={!emfActive}
              onClick={() => setEmfBaselineUt(Math.round(emfReading.mag))}
              className="min-h-[48px] px-3.5 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#FFB300] hover:border-[#FFB300] disabled:opacity-40 cursor-pointer"
            >
              Zero Baseline
            </button>
          </div>

          {(emfStatus === 'unsupported' || emfStatus === 'denied') && (
            <div className="rounded-xl bg-[#140F00] border border-[#FFB300]/50 p-3 text-xs space-y-1">
              <div className="font-bold text-[#FFB300]">
                {emfStatus === 'denied'
                  ? 'Magnetometer Permission Denied'
                  : 'Raw Magnetometer Sensor Unavailable in This Browser'}
              </div>
              <p className="text-[11px] text-[#D4D4D4] leading-relaxed">
                {emfStatus === 'denied'
                  ? 'Allow Motion Sensors in your browser site settings (Brave / Chrome address bar lock icon → Site settings → Motion sensors → Allow) and retry.'
                  : 'The W3C Magnetometer API requires an Android Chromium/Brave browser installed as a standalone PWA (and Chrome flag #enable-generic-sensor-extra-classes on some builds). Embedded iframes and desktop browsers do not expose raw µT hardware.'}
              </p>
            </div>
          )}

          {/* Live Micro-Tesla Readout Card */}
          <div
            className={`rounded-xl border p-4 space-y-3 transition ${
              isEmfAlert
                ? 'bg-[#1A0505] border-[#FF3B30]'
                : 'bg-black border-[#222222]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  Magnetic Flux Density
                </div>
                <div
                  className={`font-mono text-3xl font-bold tabular-nums mt-0.5 ${
                    isEmfAlert
                      ? 'text-[#FF3B30]'
                      : emfActive
                        ? 'text-[#00E676]'
                        : 'text-[#FFB300]'
                  }`}
                >
                  {emfReading.mag.toFixed(1)}{' '}
                  <span className="text-base font-normal text-[#A3A3A3]">µT</span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px]">
                <div
                  className={`font-bold ${
                    isEmfAlert
                      ? 'text-[#FF3B30]'
                      : emfActive
                        ? 'text-[#00E676]'
                        : 'text-[#737373]'
                  }`}
                >
                  {isEmfAlert
                    ? 'STRONG EMF SPIKE'
                    : emfActive
                      ? 'AMBIENT NORMAL'
                      : 'STANDBY'}
                </div>
                <div className="text-[#A3A3A3] tabular-nums mt-0.5">
                  Δ {emfDeltaUt >= 0 ? `+${emfDeltaUt}` : emfDeltaUt} µT vs{' '}
                  {emfBaselineUt} µT
                </div>
              </div>
            </div>

            {/* Horizontal Bar Meter */}
            <div className="relative w-full h-3.5 rounded-full bg-[#141414] overflow-hidden border border-[#242424]">
              <div
                className={`h-full transition-all duration-100 ${
                  isEmfAlert
                    ? 'bg-[#FF3B30]'
                    : emfReading.mag > 70
                      ? 'bg-[#FFB300]'
                      : 'bg-[#00E676]'
                }`}
                style={{ width: `${emfMeterPct}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-0.5 bg-[#FF3B30]"
                style={{
                  left: `${Math.min(100, Math.round((emfAlertThresholdUt / 200) * 100))}%`,
                }}
              />
            </div>

            {/* 3-Axis Raw Telemetry + Rolling Sparkline */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
              <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] px-2.5 py-1.5 text-center">
                <span className="text-[#737373]">X </span>
                <span className="text-[#F5F5F5]">{emfReading.x.toFixed(1)}</span>
              </div>
              <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] px-2.5 py-1.5 text-center">
                <span className="text-[#737373]">Y </span>
                <span className="text-[#F5F5F5]">{emfReading.y.toFixed(1)}</span>
              </div>
              <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] px-2.5 py-1.5 text-center">
                <span className="text-[#737373]">Z </span>
                <span className="text-[#F5F5F5]">{emfReading.z.toFixed(1)}</span>
              </div>
            </div>

            {emfHistory.length > 1 && (
              <svg
                viewBox="0 0 320 48"
                className="w-full h-12 rounded-lg bg-[#070707] border border-[#1A1A1A]"
                aria-label="EMF history graph"
              >
                <polyline
                  fill="none"
                  stroke={isEmfAlert ? '#FF3B30' : '#FFB300'}
                  strokeWidth="2"
                  points={emfHistory
                    .map((val, idx) => {
                      const x = (idx / Math.max(1, emfHistory.length - 1)) * 320;
                      const y = 46 - Math.min(44, (val / 200) * 44);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              </svg>
            )}

            {/* Threshold & Beep Controls */}
            <div className="pt-2 border-t border-[#1A1A1A] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3]">
                  Alert Threshold (Earth ambient ≈ 35–65 µT)
                </span>
                <span className="font-mono font-bold text-[#FF3B30] tabular-nums">
                  {emfAlertThresholdUt} µT
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={200}
                step={5}
                value={emfAlertThresholdUt}
                onChange={(e) => setEmfAlertThresholdUt(Number(e.target.value))}
                className="w-full accent-[#FF3B30] cursor-pointer"
              />
              <label className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={emfAudioAlert}
                  onChange={(e) => setEmfAudioAlert(e.target.checked)}
                  className="accent-[#FFB300]"
                />
                <span>Audible Geiger Beep + Vibration on EMF Spike</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. FILTERED RADIO BROADCAST RECORDER ==================== */}
      {activeSubTool === 'recorder' && (
        <div className="space-y-3.5">
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#FFB300]" />
                <span>300Hz–3000Hz Voice Bandpass Filter</span>
              </span>
              <button
                type="button"
                disabled={recActive}
                onClick={() => setRecBandpassOn((v) => !v)}
                className={`min-h-[32px] px-3 rounded-lg border text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                  recBandpassOn
                    ? 'bg-[#001A0D] border-[#00E676] text-[#00E676]'
                    : 'bg-[#121212] border-[#2A2A2A] text-[#A3A3A3]'
                }`}
              >
                {recBandpassOn ? 'Filter ON (Crisp Radio)' : 'Raw Audio'}
              </button>
            </div>

            <input
              type="text"
              value={recTitle}
              disabled={recActive}
              onChange={(e) => setRecTitle(e.target.value)}
              placeholder="Clip note (e.g. AIR 819kHz Evacuation Bulletin)"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300] disabled:opacity-50"
            />

            <button
              type="button"
              onClick={recActive ? stopRadioRecording : startRadioRecording}
              className={`w-full min-h-[50px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                recActive
                  ? 'bg-[#FF3B30] text-white'
                  : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
              }`}
            >
              {recActive ? (
                <>
                  <Square className="w-4 h-4 fill-current shrink-0" />
                  <span className="font-mono tabular-nums">
                    STOP & SAVE CLIP ({formatDuration(recSeconds)})
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>1-Tap Record Filtered Radio Clip</span>
                </>
              )}
            </button>

            {recActive && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#FF3B30] font-bold">
                    ● RECORDING OFFLINE
                  </span>
                  <span className="text-[#A3A3A3]">
                    {coordsStr ? `GPS ${coordsStr}` : 'No GPS attached'}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-[#00E676] transition-all duration-75"
                    style={{ width: `${recLevelPct}%` }}
                  />
                </div>
              </div>
            )}

            {recError && (
              <p className="text-xs text-[#FF3B30]">{recError}</p>
            )}
          </div>

          {/* Saved Offline Radio Clips List */}
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                Saved Offline Clips ({savedClips.length})
              </h3>
              <span className="font-mono text-[10px] text-[#737373]">
                Stored in IndexedDB
              </span>
            </div>

            {savedClips.length === 0 ? (
              <p className="py-5 text-center text-xs text-[#737373]">
                No radio clips recorded yet. Captures emergency voice broadcasts
                with 300Hz–3kHz static filtering, timestamp, and GPS fix.
              </p>
            ) : (
              <div className="divide-y divide-[#1A1A1A] max-h-[260px] overflow-y-auto">
                {savedClips.map((clip) => {
                  const isPlaying = playingClipId === clip.id;
                  return (
                    <div
                      key={clip.id}
                      className="py-2.5 flex items-center justify-between gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePlayClip(clip)}
                        className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                          isPlaying
                            ? 'bg-[#FFB300] border-[#FFB300] text-black'
                            : 'bg-[#0E0E0E] border-[#2A2A2A] text-[#FFB300]'
                        }`}
                        aria-label={isPlaying ? 'Stop playback' : 'Play clip'}
                      >
                        {isPlaying ? (
                          <Square className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#F5F5F5] truncate">
                          {clip.title}
                        </div>
                        <div className="text-[10px] font-mono text-[#8A8A8A] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="text-[#FFB300]">
                            {formatDuration(clip.durationSec)}
                          </span>
                          <span>{clip.timestamp}</span>
                          {clip.bandpassFiltered && (
                            <span className="text-[#00E676]">300–3kHz</span>
                          )}
                          {clip.gps && (
                            <span className="text-[#D4D4D4]">
                              GPS {clip.gps}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadClip(clip)}
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-[#0E0E0E] border border-[#242424] text-[#A3A3A3] hover:text-[#FFB300] flex items-center justify-center cursor-pointer"
                          aria-label={`Download ${clip.title}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteClip(clip.id)}
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-[#0E0E0E] border border-[#242424] text-[#A3A3A3] hover:text-[#FF3B30] flex items-center justify-center cursor-pointer"
                          aria-label={`Delete ${clip.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
