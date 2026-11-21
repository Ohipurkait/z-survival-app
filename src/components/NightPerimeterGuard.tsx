import React, { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Camera,
  EyeOff,
  Mic,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface BreachEvent {
  id: string;
  time: string;
  trigger: 'Acoustic' | 'Motion';
  detail: string;
}

const BREACH_LOG_KEY = 'apex_perimeter_breaches_v1';

export const NightPerimeterGuard: React.FC = () => {
  // Settings
  const [acousticThresholdDb, setAcousticThresholdDb] = useState<number>(58);
  const [motionEnabled, setMotionEnabled] = useState<boolean>(false);
  const [motionThresholdPct, setMotionThresholdPct] = useState<number>(12);
  const [silentVibrateOnly, setSilentVibrateOnly] = useState<boolean>(false);
  const [stealthBlackout, setStealthBlackout] = useState<boolean>(false);

  // Runtime state
  const [status, setStatus] = useState<'disarmed' | 'arming' | 'armed' | 'triggered'>('disarmed');
  const [armCountdown, setArmCountdown] = useState<number>(5);
  const [currentDb, setCurrentDb] = useState<number>(0);
  const [currentMotionPct, setCurrentMotionPct] = useState<number>(0);
  const [triggerReason, setTriggerReason] = useState<string>('');
  const [sensorError, setSensorError] = useState<string | null>(null);

  const [breaches, setBreaches] = useState<BreachEvent[]>(() => {
    try {
      const saved = localStorage.getItem(BREACH_LOG_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Live sensor refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  // Loops & siren refs
  const monitorTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sirenCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest thresholds inside interval closure
  const acousticThreshRef = useRef(acousticThresholdDb);
  const motionThreshRef = useRef(motionThresholdPct);
  const silentModeRef = useRef(silentVibrateOnly);
  const statusRef = useRef(status);

  useEffect(() => {
    acousticThreshRef.current = acousticThresholdDb;
  }, [acousticThresholdDb]);

  useEffect(() => {
    motionThreshRef.current = motionThresholdPct;
  }, [motionThresholdPct]);

  useEffect(() => {
    silentModeRef.current = silentVibrateOnly;
  }, [silentVibrateOnly]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    try {
      localStorage.setItem(BREACH_LOG_KEY, JSON.stringify(breaches.slice(0, 20)));
    } catch {
      // Ignore storage error
    }
  }, [breaches]);

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    try {
      sirenOscRef.current?.stop();
      sirenOscRef.current?.disconnect();
      sirenOscRef.current = null;
    } catch {
      // Ignore already stopped
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  const stopAllSensors = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (monitorTimerRef.current) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    prevFrameRef.current = null;
    setCurrentDb(0);
    setCurrentMotionPct(0);
  };

  useEffect(() => {
    return () => {
      stopSiren();
      stopAllSensors();
      if (sirenCtxRef.current) {
        sirenCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const fireAlarm = (trigger: 'Acoustic' | 'Motion', detail: string) => {
    if (statusRef.current === 'triggered') return;
    statusRef.current = 'triggered';
    setStatus('triggered');
    setStealthBlackout(false);
    setTriggerReason(`${trigger} Breach: ${detail}`);

    const event: BreachEvent = {
      id: `br-${Date.now()}`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      trigger,
      detail,
    };
    setBreaches((prev) => [event, ...prev].slice(0, 20));

    // Continuous tactical vibration burst
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([450, 150, 450, 150, 700]);
    }

    // Piercing dual-tone perimeter siren (unless silent vibrate-only is enabled)
    if (!silentModeRef.current) {
      try {
        if (!sirenCtxRef.current) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          sirenCtxRef.current = new AudioCtx();
        }
        const ctx = sirenCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 2400;
        gain.gain.value = 0.45;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        sirenOscRef.current = osc;

        let high = true;
        sirenIntervalRef.current = setInterval(() => {
          high = !high;
          if (sirenOscRef.current && sirenCtxRef.current) {
            sirenOscRef.current.frequency.setValueAtTime(
              high ? 2400 : 1750,
              sirenCtxRef.current.currentTime
            );
          }
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([350, 120, 350]);
          }
        }, 420);
      } catch {
        // Audio policy blocked; vibration + visual breach screen still active
      }
    } else {
      sirenIntervalRef.current = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([450, 150, 450]);
        }
      }, 1100);
    }
  };

  const handleArmPerimeter = async () => {
    setSensorError(null);
    stopSiren();
    stopAllSensors();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setSensorError('Microphone/Camera API unavailable in this browser.');
      return;
    }

    try {
      // 1. Acoustic Microphone Stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      audioStreamRef.current = audioStream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaStreamSource(audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // 2. Optional Camera Frame-Diff Motion Stream
      if (motionEnabled) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 320 },
              height: { ideal: 240 },
            },
            audio: false,
          });
          videoStreamRef.current = videoStream;
          if (videoRef.current) {
            videoRef.current.srcObject = videoStream;
            await videoRef.current.play();
          }
        } catch {
          setSensorError(
            'Camera unavailable — guarding perimeter with Acoustic Microphone only.'
          );
          setMotionEnabled(false);
        }
      }

      // 3. 5-Second Quiet Arming Countdown
      setStatus('arming');
      statusRef.current = 'arming';
      setArmCountdown(5);

      let sec = 5;
      countdownTimerRef.current = setInterval(() => {
        sec -= 1;
        if (sec <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          prevFrameRef.current = null; // Capture fresh baseline frame upon arming
          setStatus('armed');
          statusRef.current = 'armed';
        } else {
          setArmCountdown(sec);
        }
      }, 1000);

      // 4. Start Sensor Sampling Loop (~160ms)
      const timeDomain = new Uint8Array(analyser.fftSize);
      const workCanvas =
        motionCanvasRef.current || document.createElement('canvas');
      workCanvas.width = 96;
      workCanvas.height = 72;
      motionCanvasRef.current = workCanvas;
      const mCtx = workCanvas.getContext('2d', { willReadFrequently: true });

      monitorTimerRef.current = window.setInterval(() => {
        if (!analyserRef.current) return;

        // Acoustic RMS -> 0..100 tactical dB gauge
        analyserRef.current.getByteTimeDomainData(timeDomain);
        let sumSq = 0;
        for (let i = 0; i < timeDomain.length; i++) {
          const norm = (timeDomain[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / timeDomain.length);
        const dbRaw = 20 * Math.log10(Math.max(rms, 0.0001)); // -80..0 dBFS
        const tacticalDb = Math.max(0, Math.min(100, Math.round(dbRaw + 90)));
        setCurrentDb(tacticalDb);

        if (
          statusRef.current === 'armed' &&
          tacticalDb >= acousticThreshRef.current
        ) {
          fireAlarm(
            'Acoustic',
            `${tacticalDb} dB exceeded ${acousticThreshRef.current} dB threshold`
          );
          return;
        }

        // Camera frame-diff motion detection
        if (
          videoStreamRef.current &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          mCtx
        ) {
          mCtx.drawImage(videoRef.current, 0, 0, 96, 72);
          const frame = mCtx.getImageData(0, 0, 96, 72).data;
          if (prevFrameRef.current) {
            let changedPixels = 0;
            const totalPixels = 96 * 72;
            for (let i = 0; i < frame.length; i += 4) {
              const lumNow =
                0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
              const lumPrev =
                0.299 * prevFrameRef.current[i] +
                0.587 * prevFrameRef.current[i + 1] +
                0.114 * prevFrameRef.current[i + 2];
              if (Math.abs(lumNow - lumPrev) > 26) {
                changedPixels++;
              }
            }
            const motionPct = Math.min(
              100,
              Math.round((changedPixels / totalPixels) * 100)
            );
            setCurrentMotionPct(motionPct);

            if (
              statusRef.current === 'armed' &&
              motionPct >= motionThreshRef.current
            ) {
              fireAlarm(
                'Motion',
                `${motionPct}% frame delta exceeded ${motionThreshRef.current}% limit`
              );
              return;
            }
          }
          prevFrameRef.current = new Uint8ClampedArray(frame);
        }
      }, 160);
    } catch {
      setSensorError(
        'Microphone permission denied. Allow microphone access to arm Night Perimeter Guard.'
      );
      stopAllSensors();
      setStatus('disarmed');
    }
  };

  const handleDisarm = () => {
    stopSiren();
    stopAllSensors();
    setStealthBlackout(false);
    setStatus('disarmed');
    statusRef.current = 'disarmed';
    setTriggerReason('');
  };

  const isRunning = status === 'arming' || status === 'armed';

  return (
    <>
      <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
              Night Perimeter Guard
            </h2>
            <p className="mt-0.5 text-xs text-[#A3A3A3]">
              Acoustic decibel tripwire + optional camera motion detector
            </p>
          </div>
          {status === 'armed' ? (
            <ShieldCheck className="w-6 h-6 text-[#22C55E] shrink-0" />
          ) : status === 'triggered' ? (
            <ShieldAlert className="w-6 h-6 text-[#FF3B30] shrink-0" />
          ) : (
            <BellRing className="w-6 h-6 text-[#FFB300] shrink-0" />
          )}
        </div>

        {/* Live Acoustic dB Meter + Threshold Line */}
        <div className="mt-4 rounded-xl bg-black border border-[#222222] p-3.5 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#A3A3A3] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#FFB300]" />
                <span>Acoustic Level</span>
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#F5F5F5]">
                {currentDb} dB{' '}
                <span className="text-[#737373]">
                  / Trip {acousticThresholdDb} dB
                </span>
              </span>
            </div>

            <div className="relative w-full h-3 rounded-full bg-[#151515] overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  currentDb >= acousticThresholdDb
                    ? 'bg-[#FF3B30]'
                    : 'bg-[#FFB300]'
                }`}
                style={{ width: `${currentDb}%` }}
              />
              {/* Red Threshold Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#FF3B30]"
                style={{ left: `${acousticThresholdDb}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <label
                htmlFor="acoustic-trip-slider"
                className="text-[11px] text-[#737373] whitespace-nowrap"
              >
                Sensitivity
              </label>
              <input
                id="acoustic-trip-slider"
                type="range"
                min={20}
                max={95}
                value={acousticThresholdDb}
                onChange={(e) => setAcousticThresholdDb(Number(e.target.value))}
                className="flex-1 accent-[#FFB300] cursor-pointer"
              />
              <span className="font-mono text-xs text-[#FFB300] tabular-nums w-11 text-right">
                {acousticThresholdDb} dB
              </span>
            </div>
          </div>

          {/* Optional Camera Frame-Diff Motion Tripwire */}
          <div className="pt-3 border-t border-[#1A1A1A] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#F5F5F5] font-medium">
                <Camera className="w-3.5 h-3.5 text-[#FFB300]" />
                <span>Camera Motion Tripwire</span>
              </div>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setMotionEnabled((v) => !v)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${
                  motionEnabled
                    ? 'bg-[#171200] border-[#FFB300] text-[#FFB300]'
                    : 'bg-[#0D0D0D] border-[#262626] text-[#737373]'
                }`}
              >
                {motionEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {motionEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-20 h-14 rounded-lg bg-[#0F0F0F] border border-[#262626] object-cover shrink-0 opacity-75"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#737373]">Frame Delta</span>
                      <span className="font-mono tabular-nums text-[#F5F5F5]">
                        {currentMotionPct}% / Trip {motionThresholdPct}%
                      </span>
                    </div>
                    <div className="relative w-full h-2 rounded-full bg-[#151515] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${
                          currentMotionPct >= motionThresholdPct
                            ? 'bg-[#FF3B30]'
                            : 'bg-[#22C55E]'
                        }`}
                        style={{ width: `${Math.min(100, currentMotionPct * 2)}%` }}
                      />
                    </div>
                    <input
                      aria-label="Motion trigger threshold percent"
                      type="range"
                      min={3}
                      max={40}
                      value={motionThresholdPct}
                      onChange={(e) =>
                        setMotionThresholdPct(Number(e.target.value))
                      }
                      className="w-full accent-[#FFB300] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Toggles: Silent Vibrate + Stealth Blackout */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSilentVibrateOnly((v) => !v)}
            className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              silentVibrateOnly
                ? 'bg-[#171200] border-[#FFB300] text-[#FFB300]'
                : 'bg-black border-[#262626] text-[#A3A3A3]'
            }`}
          >
            {silentVibrateOnly ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stealth Vibrate Only</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Siren + Vibrate</span>
              </>
            )}
          </button>

          {status === 'armed' && (
            <button
              type="button"
              onClick={() => setStealthBlackout(true)}
              className="min-h-[40px] px-3 rounded-xl bg-black border border-[#262626] text-xs font-semibold text-[#F5F5F5] hover:border-[#FFB300] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-[#FFB300]" />
              <span>Blackout Screen</span>
            </button>
          )}
        </div>

        {/* Arm / Disarm Primary Action */}
        <div className="mt-3">
          {status === 'disarmed' ? (
            <button
              type="button"
              onClick={handleArmPerimeter}
              className="w-full min-h-[50px] px-4 rounded-xl bg-[#FFB300] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#FFC433] active:scale-[0.98] transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Arm Night Perimeter Guard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisarm}
              className="w-full min-h-[50px] px-4 rounded-xl bg-[#FF3B30] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#FF5247] active:scale-[0.98] transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {status === 'arming'
                  ? `Arming in ${armCountdown}s — Tap to Cancel`
                  : status === 'triggered'
                    ? 'SILENCE & DISARM BREACH ALARM'
                    : 'GUARD ARMED — Tap to Disarm'}
              </span>
            </button>
          )}
        </div>

        {sensorError && (
          <p className="mt-2.5 text-xs text-[#FF3B30] leading-relaxed">
            {sensorError}
          </p>
        )}

        {/* Recent Breach Log */}
        {breaches.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-[#1D1D1D]">
            <div className="flex items-center justify-between text-[11px] text-[#737373] mb-1.5">
              <span>Perimeter Breach Log ({breaches.length})</span>
              <button
                type="button"
                onClick={() => setBreaches([])}
                className="text-[#737373] hover:text-[#FF3B30] inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {breaches.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 text-[11px] bg-black border border-[#1C1C1C] rounded-lg px-2.5 py-1.5"
                >
                  <span className="text-[#F5F5F5] truncate">
                    <span className="text-[#FF3B30] font-semibold">
                      {b.trigger}:
                    </span>{' '}
                    {b.detail}
                  </span>
                  <span className="font-mono text-[#737373] tabular-nums shrink-0">
                    {b.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pure AMOLED Blackout Stealth Mode Overlay (Zero Screen Glow While Guarding) */}
      {stealthBlackout && status === 'armed' && (
        <div
          onClick={() => setStealthBlackout(false)}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-8 select-none cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="Perimeter Guard AMOLED Stealth Blackout active"
        >
          <div className="text-[11px] font-mono text-[#262626] uppercase tracking-widest">
            PERIMETER ARMED · ACOUSTIC {currentDb}/{acousticThresholdDb}dB
            {motionEnabled ? ` · MOTION ${currentMotionPct}%` : ''}
          </div>
          <div className="text-xs text-[#333333]">
            Tap anywhere to wake screen
          </div>
        </div>
      )}

      {/* Full-Screen Red Breach Alert Overlay */}
      {status === 'triggered' && (
        <div
          className="fixed inset-0 z-50 bg-[#2A0403] flex flex-col items-center justify-center p-6 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-label="Perimeter breach detected"
        >
          <ShieldAlert className="w-16 h-16 text-[#FF3B30]" />
          <h2 className="mt-4 font-display text-4xl font-bold tracking-wider text-white">
            PERIMETER BREACH
          </h2>
          <p className="mt-2 font-mono text-sm text-[#FFB300] max-w-md">
            {triggerReason}
          </p>
          <p className="mt-1 text-xs text-[#D4D4D4]">
            Check surroundings immediately before illuminating flashlight.
          </p>
          <button
            type="button"
            onClick={handleDisarm}
            className="mt-8 min-h-[58px] px-8 rounded-2xl bg-[#FF3B30] text-white font-bold text-base tracking-wide hover:bg-[#FF5247] cursor-pointer"
          >
            SILENCE & DISARM ALARM
          </button>
        </div>
      )}
    </>
  );
};
