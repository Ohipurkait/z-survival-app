export type ModemBand = 'audible' | 'ultrasonic';

export interface ModemBandConfig {
  id: ModemBand;
  label: string;
  description: string;
  freqSpace: number; // Bit 0
  freqMark: number; // Bit 1
  freqSync: number; // Preamble sync
  bitMs: number;
}

export const MODEM_BANDS: Record<ModemBand, ModemBandConfig> = {
  audible: {
    id: 'audible',
    label: 'Audible Rugged (1.5–2.6 kHz)',
    description: 'High reliability across rooms & noisy terrain',
    freqSpace: 1500,
    freqMark: 2100,
    freqSync: 2600,
    bitMs: 55,
  },
  ultrasonic: {
    id: 'ultrasonic',
    label: 'Near-Ultrasonic (15.6–17.6 kHz)',
    description: 'Low-audibility stealth short-range transfer',
    freqSpace: 15600,
    freqMark: 16800,
    freqSync: 17600,
    bitMs: 60,
  },
};

const PREAMBLE_MS = 320;
const GUARD_MS = 60;
const STX = 0x02;
const ETX = 0x03;

function encodePayloadBytes(message: string): Uint8Array {
  const textBytes = new TextEncoder().encode(message.slice(0, 140));
  let xor = 0;
  for (let i = 0; i < textBytes.length; i++) {
    xor ^= textBytes[i];
  }
  // Frame: [STX, length, ...payload, xor, ETX]
  const frame = new Uint8Array(textBytes.length + 4);
  frame[0] = STX;
  frame[1] = textBytes.length;
  frame.set(textBytes, 2);
  frame[frame.length - 2] = xor;
  frame[frame.length - 1] = ETX;
  return frame;
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    bits.push(0); // Start bit (0)
    for (let bit = 0; bit < 8; bit++) {
      bits.push((b >> bit) & 1);
    }
    bits.push(1); // Stop bit (1)
  }
  return bits;
}

export interface TransmitHandle {
  cancel: () => void;
  promise: Promise<void>;
}

/**
 * Transmits a short text message over the speaker as FSK audio tones using Web Audio OscillatorNode.
 */
export function transmitAcousticMessage(
  message: string,
  bandId: ModemBand,
  onProgress: (percent: number, activeFreq: number) => void
): TransmitHandle {
  const band = MODEM_BANDS[bandId];
  const frame = encodePayloadBytes(message);
  const bits = bytesToBits(frame);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + 0.05;
  const bitSec = band.bitMs / 1000;
  const preambleSec = PREAMBLE_MS / 1000;
  const guardSec = GUARD_MS / 1000;

  // Preamble sync carrier
  osc.frequency.setValueAtTime(band.freqSync, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.75, startTime + 0.015);

  // Brief guard space before data bits
  const dataStart = startTime + preambleSec + guardSec;
  osc.frequency.setValueAtTime(band.freqMark, startTime + preambleSec);

  for (let i = 0; i < bits.length; i++) {
    const t = dataStart + i * bitSec;
    const freq = bits[i] === 1 ? band.freqMark : band.freqSpace;
    osc.frequency.setValueAtTime(freq, t);
  }

  const endTime = dataStart + bits.length * bitSec + 0.04;
  gain.gain.setValueAtTime(0.75, endTime - 0.02);
  gain.gain.linearRampToValueAtTime(0.0001, endTime);

  osc.start(startTime);
  osc.stop(endTime + 0.02);

  const totalDurationMs = (endTime - startTime) * 1000;
  let cancelled = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let resolveFn: () => void = () => {};

  const cleanup = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    try {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignore already stopped
    }
    ctx.close().catch(() => {});
  };

  const promise = new Promise<void>((resolve) => {
    resolveFn = resolve;
    const wallStart = performance.now();

    timerId = setInterval(() => {
      if (cancelled) return;
      const elapsed = performance.now() - wallStart;
      const pct = Math.min(100, Math.round((elapsed / totalDurationMs) * 100));
      let currentFreq = band.freqSync;
      if (elapsed > PREAMBLE_MS + GUARD_MS) {
        const bitIdx = Math.floor(
          (elapsed - PREAMBLE_MS - GUARD_MS) / band.bitMs
        );
        if (bitIdx >= 0 && bitIdx < bits.length) {
          currentFreq = bits[bitIdx] === 1 ? band.freqMark : band.freqSpace;
        }
      }
      onProgress(pct, currentFreq);
      if (elapsed >= totalDurationMs + 50) {
        cleanup();
        onProgress(100, 0);
        resolve();
      }
    }, 35);
  });

  return {
    cancel: () => {
      cancelled = true;
      cleanup();
      resolveFn();
    },
    promise,
  };
}

export interface ReceiverTelemetry {
  spaceLevel: number; // 0..100
  markLevel: number; // 0..100
  syncLevel: number; // 0..100
  state: 'listening' | 'sync-locked' | 'decoding';
  partialText: string;
}

export class AcousticModemReceiver {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private running = false;

  public async start(
    bandId: ModemBand,
    onTelemetry: (t: ReceiverTelemetry) => void,
    onMessageDecoded: (msg: string, checksumValid: boolean) => void
  ): Promise<void> {
    this.stop();
    const band = MODEM_BANDS[bandId];

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error('Microphone access is unavailable in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    this.ctx = ctx;
    this.stream = stream;
    this.analyser = analyser;
    this.running = true;

    const freqData = new Float32Array(analyser.frequencyBinCount);
    const binHz = ctx.sampleRate / analyser.fftSize;

    const getBandDb = (targetHz: number): number => {
      const center = Math.round(targetHz / binHz);
      let peak = -120;
      for (let i = Math.max(0, center - 2); i <= Math.min(freqData.length - 1, center + 2); i++) {
        if (freqData[i] > peak) peak = freqData[i];
      }
      return peak;
    };

    const dbToPct = (db: number) =>
      Math.max(0, Math.min(100, Math.round(((db + 95) / 65) * 100)));

    // FSK receiver state machine
    let state: 'listening' | 'sync-locked' | 'decoding' = 'listening';
    let syncStartMs = 0;
    let decodeOriginMs = 0;
    let nextBitIndex = 0;
    const bitBuffer: number[] = [];
    const byteBuffer: number[] = [];
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let partialText = '';

    const resetRx = () => {
      state = 'listening';
      syncStartMs = 0;
      nextBitIndex = 0;
      bitBuffer.length = 0;
      byteBuffer.length = 0;
      partialText = '';
    };

    const emitFrameIfComplete = () => {
      if (byteBuffer.length < 4) return false;
      if (byteBuffer[0] !== STX) {
        // Shift until STX or discard noise
        const stxIdx = byteBuffer.indexOf(STX);
        if (stxIdx === -1) {
          if (byteBuffer.length > 8) resetRx();
          return false;
        }
        byteBuffer.splice(0, stxIdx);
      }

      const expectedLen = byteBuffer[1];
      if (expectedLen === 0 || expectedLen > 144) {
        resetRx();
        return false;
      }

      const payloadEnd = 2 + expectedLen;
      if (byteBuffer.length > 2) {
        const partialBytes = new Uint8Array(
          byteBuffer.slice(2, Math.min(byteBuffer.length, payloadEnd))
        );
        partialText = decoder.decode(partialBytes);
      }

      if (byteBuffer.length >= payloadEnd + 2) {
        const payload = new Uint8Array(byteBuffer.slice(2, payloadEnd));
        const rxXor = byteBuffer[payloadEnd];
        let calcXor = 0;
        for (let i = 0; i < payload.length; i++) calcXor ^= payload[i];
        const decoded = decoder.decode(payload).trim();
        if (decoded.length > 0) {
          onMessageDecoded(decoded, rxXor === calcXor);
        }
        resetRx();
        return true;
      }
      return false;
    };

    const tick = () => {
      if (!this.running || !this.analyser) return;
      this.analyser.getFloatFrequencyData(freqData);
      const now = performance.now();

      const spaceDb = getBandDb(band.freqSpace);
      const markDb = getBandDb(band.freqMark);
      const syncDb = getBandDb(band.freqSync);

      const syncStrong = syncDb > -68 && syncDb > markDb + 4 && syncDb > spaceDb + 4;
      const dataStrong = Math.max(spaceDb, markDb) > -72;

      if (state === 'listening') {
        if (syncStrong) {
          if (syncStartMs === 0) syncStartMs = now;
          if (now - syncStartMs >= 130) {
            state = 'sync-locked';
          }
        } else {
          syncStartMs = 0;
        }
      } else if (state === 'sync-locked') {
        // Wait for preamble sync tone to drop into guard / first start bit (0)
        if (!syncStrong && spaceDb > markDb + 3 && dataStrong) {
          state = 'decoding';
          decodeOriginMs = now + band.bitMs * 0.45;
          nextBitIndex = 0;
          bitBuffer.length = 0;
          byteBuffer.length = 0;
          partialText = '';
        } else if (now - syncStartMs > 1200) {
          resetRx();
        }
      } else if (state === 'decoding') {
        const expectedSampleTime = decodeOriginMs + nextBitIndex * band.bitMs;
        if (now >= expectedSampleTime) {
          const bit = markDb >= spaceDb ? 1 : 0;
          bitBuffer.push(bit);
          nextBitIndex++;

          // Every 10 bits = 1 framed byte (start=0, 8 data bits LSB, stop=1)
          if (bitBuffer.length >= 10) {
            const chunk = bitBuffer.splice(0, 10);
            let byteVal = 0;
            for (let b = 0; b < 8; b++) {
              byteVal |= chunk[1 + b] << b;
            }
            byteBuffer.push(byteVal);
            emitFrameIfComplete();
          }

          // Guard against stuck carrier / timeout
          if (byteBuffer.length > 152 || (!dataStrong && bitBuffer.length === 0 && byteBuffer.length > 2)) {
            if (partialText.trim().length >= 2) {
              onMessageDecoded(partialText.trim(), false);
            }
            resetRx();
          }
        }
      }

      onTelemetry({
        spaceLevel: dbToPct(spaceDb),
        markLevel: dbToPct(markDb),
        syncLevel: dbToPct(syncDb),
        state,
        partialText,
      });

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
  }
}
