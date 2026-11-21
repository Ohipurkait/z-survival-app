import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Antenna,
  AudioWaveform,
  Camera,
  Check,
  Copy,
  Crosshair,
  Maximize2,
  Mic,
  MicOff,
  PhoneOff,
  QrCode,
  Radio,
  Send,
  Square,
  Trash2,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import {
  AcousticModemReceiver,
  MODEM_BANDS,
  transmitAcousticMessage,
  type ModemBand,
  type ReceiverTelemetry,
  type TransmitHandle,
} from '../../services/acousticModem';
import { OfflineRadioIntel } from '../OfflineRadioIntel';
import { QRScannerModal } from '../QRScannerModal';

type CommsMode = 'acoustic' | 'qr' | 'walkie' | 'radio';
type BurstPriority = 'SOS' | 'SAFE' | 'WATER' | 'INFO';

interface LoggedMessage {
  id: string;
  mode: 'acoustic' | 'qr' | 'walkie' | 'radio';
  direction: 'tx' | 'rx';
  priority?: BurstPriority;
  gps?: string;
  text: string;
  timestamp: string;
  verified?: boolean;
}

const COMMS_LOG_KEY = 'apex_comms_log_v1';

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function playRogerBeep(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch {
    // Ignore audio context block
  }
}

/**
 * Strips verbose non-essential SDP lines so serverless WebRTC Offer/Answer
 * stays compact enough to scan reliably in a single QR code.
 */
function compactSdp(sdp: string): string {
  const dropPrefixes = [
    'a=extmap:',
    'a=rtcp-fb:',
    'a=fmtp:',
    'a=msid-semantic:',
    'a=ssrc:',
    'a=max-message-size:',
  ];
  return sdp
    .split('\r\n')
    .filter((line) => {
      if (!line) return false;
      if (dropPrefixes.some((p) => line.startsWith(p))) return false;
      if (line.startsWith('a=candidate:') && !line.includes(' typ host')) {
        return false;
      }
      return true;
    })
    .join('\r\n')
    .concat('\r\n');
}

function waitForLocalIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 2500
): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onState);
      resolve();
    }, timeoutMs);
    const onState = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onState);
  });
}

export const CommsTab: React.FC = () => {
  const [mode, setMode] = useState<CommsMode>('acoustic');
  const [coordsStr, setCoordsStr] = useState<string | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);

  const [commsLog, setCommsLog] = useState<LoggedMessage[]>(() => {
    try {
      const saved = localStorage.getItem(COMMS_LOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage error
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMMS_LOG_KEY, JSON.stringify(commsLog.slice(0, 40)));
    } catch {
      // Ignore storage error
    }
  }, [commsLog]);

  const appendLog = (entry: Omit<LoggedMessage, 'id' | 'timestamp'>) => {
    setCommsLog((prev) => [
      {
        ...entry,
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowTime(),
      },
      ...prev,
    ]);
  };

  const fetchCurrentGps = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordsStr(
          `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
        );
        setFetchingGps(false);
      },
      () => {
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ================= MODE A: ACOUSTIC SOUND MODEM =================
  const [modemBand, setModemBand] = useState<ModemBand>('audible');
  const [acousticMsg, setAcousticMsg] = useState('SOS NEED WATER');
  const [includeGpsAcoustic, setIncludeGpsAcoustic] = useState(false);
  const [txActive, setTxActive] = useState(false);
  const [txProgress, setTxProgress] = useState(0);
  const [txFreq, setTxFreq] = useState(0);
  const txHandleRef = useRef<TransmitHandle | null>(null);

  const receiverRef = useRef<AcousticModemReceiver | null>(null);
  const [rxActive, setRxActive] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);
  const [rxTelemetry, setRxTelemetry] = useState<ReceiverTelemetry>({
    spaceLevel: 0,
    markLevel: 0,
    syncLevel: 0,
    state: 'listening',
    partialText: '',
  });

  const handleStartAcousticTx = async () => {
    if (txActive) {
      txHandleRef.current?.cancel();
      txHandleRef.current = null;
      setTxActive(false);
      return;
    }
    const base = acousticMsg.trim();
    if (!base) return;
    const payload =
      includeGpsAcoustic && coordsStr ? `${base} @${coordsStr}` : base;

    setTxActive(true);
    setTxProgress(2);
    const handle = transmitAcousticMessage(payload, modemBand, (pct, freq) => {
      setTxProgress(pct);
      setTxFreq(freq);
    });
    txHandleRef.current = handle;
    appendLog({
      mode: 'acoustic',
      direction: 'tx',
      text: payload,
      gps: includeGpsAcoustic && coordsStr ? coordsStr : undefined,
    });
    await handle.promise;
    txHandleRef.current = null;
    setTxActive(false);
    setTxProgress(0);
    setTxFreq(0);
  };

  const handleToggleAcousticRx = async () => {
    setRxError(null);
    if (rxActive) {
      receiverRef.current?.stop();
      setRxActive(false);
      setRxTelemetry({
        spaceLevel: 0,
        markLevel: 0,
        syncLevel: 0,
        state: 'listening',
        partialText: '',
      });
      return;
    }

    try {
      if (!receiverRef.current) {
        receiverRef.current = new AcousticModemReceiver();
      }
      await receiverRef.current.start(
        modemBand,
        (tel) => setRxTelemetry(tel),
        (decoded, valid) => {
          appendLog({
            mode: 'acoustic',
            direction: 'rx',
            text: decoded,
            verified: valid,
          });
        }
      );
      setRxActive(true);
    } catch (err) {
      setRxError(
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Enable mic permission to decode FSK tones.'
      );
    }
  };

  useEffect(() => {
    return () => {
      txHandleRef.current?.cancel();
      receiverRef.current?.stop();
    };
  }, []);

  // ================= MODE B: OFFLINE QR TACTICAL BURST =================
  const [qrPriority, setQrPriority] = useState<BurstPriority>('SOS');
  const [qrMessage, setQrMessage] = useState(
    'Shelter secured on 3rd floor. Need clean water & gauze.'
  );
  const [qrIncludeGps, setQrIncludeGps] = useState(true);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<
    null | 'burst' | 'webrtc-offer' | 'webrtc-answer'
  >(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const qrPayload = `APEX|${qrPriority}|${
    qrIncludeGps && coordsStr ? coordsStr : 'NOGPS'
  }|${qrMessage.trim() || 'PING'}`;

  const handleBurstScanned = (raw: string) => {
    setQrScannerMode(null);
    if (raw.startsWith('APEX|')) {
      const parts = raw.split('|');
      const prio = (parts[1] as BurstPriority) || 'INFO';
      const gpsPart = parts[2] && parts[2] !== 'NOGPS' ? parts[2] : undefined;
      const body = parts.slice(3).join('|') || raw;
      appendLog({
        mode: 'qr',
        direction: 'rx',
        priority: prio,
        gps: gpsPart,
        text: body,
        verified: true,
      });
    } else {
      appendLog({
        mode: 'qr',
        direction: 'rx',
        priority: 'INFO',
        text: raw,
      });
    }
  };

  // ================= MODE C: SERVERLESS WEBRTC HOTSPOT WALKIE-TALKIE =================
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [rtcStep, setRtcStep] = useState<
    'idle' | 'gathering' | 'host-offer-ready' | 'guest-answer-ready' | 'connected'
  >('idle');
  const [rtcQrCodeData, setRtcQrCodeData] = useState<string>('');
  const [rtcError, setRtcError] = useState<string | null>(null);
  const [pttTalking, setPttTalking] = useState(false);
  const [pttLocked, setPttLocked] = useState(false);
  const [remoteTalking, setRemoteTalking] = useState(false);
  const [walkieChatInput, setWalkieChatInput] = useState('');
  const [copiedRtc, setCopiedRtc] = useState(false);

  const teardownWebRTC = () => {
    setPttTalking(false);
    setPttLocked(false);
    setRemoteTalking(false);
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      localAudioStreamRef.current = null;
    }
    setRtcStep('idle');
    setRtcQrCodeData('');
  };

  useEffect(() => {
    return () => {
      teardownWebRTC();
    };
  }, []);

  const wireDataChannel = (dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.onopen = () => {
      setRtcStep('connected');
      setRtcError(null);
      playRogerBeep();
    };
    dc.onclose = () => {
      setRtcStep('idle');
      setPttTalking(false);
      setRemoteTalking(false);
    };
    dc.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.data));
        if (parsed.type === 'ptt') {
          setRemoteTalking(Boolean(parsed.active));
          if (!parsed.active) playRogerBeep();
          return;
        }
        if (parsed.type === 'chat' && parsed.text) {
          appendLog({
            mode: 'walkie',
            direction: 'rx',
            text: String(parsed.text),
            verified: true,
          });
          return;
        }
      } catch {
        appendLog({
          mode: 'walkie',
          direction: 'rx',
          text: String(evt.data),
        });
      }
    };
  };

  const preparePeerConnection = async (): Promise<RTCPeerConnection> => {
    teardownWebRTC();
    // 100% serverless offline LAN/Hotspot ICE configuration (zero STUN/TURN internet servers)
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;

    // Acquire local mic (muted until Push-To-Talk is held)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          pc.addTrack(track, stream);
        });
        localAudioStreamRef.current = stream;
      }
    } catch {
      setRtcError(
        'Microphone unavailable — Walkie-Talkie text chat will still work over local hotspot.'
      );
    }

    pc.ontrack = (evt) => {
      if (remoteAudioRef.current && evt.streams[0]) {
        remoteAudioRef.current.srcObject = evt.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setRtcStep('connected');
      } else if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected'
      ) {
        setRtcError(
          'Hotspot link disconnected. Ensure both phones remain on the same offline Mobile Hotspot.'
        );
      }
    };

    return pc;
  };

  const handleHostCreateOffer = async () => {
    setRtcError(null);
    setRtcStep('gathering');
    try {
      const pc = await preparePeerConnection();
      const dc = pc.createDataChannel('apex-walkie');
      wireDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForLocalIceGathering(pc, 2500);

      const localSdp = pc.localDescription?.sdp;
      if (!localSdp) throw new Error('Could not gather local hotspot SDP.');

      const payload = JSON.stringify({ t: 'o', s: compactSdp(localSdp) });
      setRtcQrCodeData(payload);
      setRtcStep('host-offer-ready');
    } catch (err) {
      setRtcError(
        err instanceof Error
          ? err.message
          : 'Failed to create local WebRTC channel.'
      );
      setRtcStep('idle');
    }
  };

  const handleGuestScanOffer = async (raw: string) => {
    setQrScannerMode(null);
    setRtcError(null);
    setRtcStep('gathering');
    try {
      const parsed = JSON.parse(raw);
      if (parsed.t !== 'o' || typeof parsed.s !== 'string') {
        throw new Error('Scanned QR is not a valid Walkie-Talkie Host Offer.');
      }
      const pc = await preparePeerConnection();
      pc.ondatachannel = (evt) => wireDataChannel(evt.channel);

      await pc.setRemoteDescription({ type: 'offer', sdp: parsed.s });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForLocalIceGathering(pc, 2500);

      const localSdp = pc.localDescription?.sdp;
      if (!localSdp) throw new Error('Could not build local Answer SDP.');

      const payload = JSON.stringify({ t: 'a', s: compactSdp(localSdp) });
      setRtcQrCodeData(payload);
      setRtcStep('guest-answer-ready');
    } catch (err) {
      setRtcError(
        err instanceof Error
          ? err.message
          : 'Invalid Offer QR. Ensure Phone A created a Host Channel Offer first.'
      );
      setRtcStep('idle');
    }
  };

  const handleHostScanAnswer = async (raw: string) => {
    setQrScannerMode(null);
    setRtcError(null);
    try {
      const pc = pcRef.current;
      if (!pc) throw new Error('Create a Host Channel Offer first.');
      const parsed = JSON.parse(raw);
      if (parsed.t !== 'a' || typeof parsed.s !== 'string') {
        throw new Error('Scanned QR is not a valid Guest Answer.');
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: parsed.s });
      setRtcStep('connected');
    } catch (err) {
      setRtcError(
        err instanceof Error ? err.message : 'Failed to complete handshake.'
      );
    }
  };

  const setPttActive = (active: boolean) => {
    if (rtcStep !== 'connected') return;
    setPttTalking(active);
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = active;
      });
    }
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify({ type: 'ptt', active }));
    }
    if (!active) {
      playRogerBeep();
    }
  };

  const handleSendWalkieChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = walkieChatInput.trim();
    if (!text || !dcRef.current || dcRef.current.readyState !== 'open') return;
    dcRef.current.send(JSON.stringify({ type: 'chat', text }));
    appendLog({ mode: 'walkie', direction: 'tx', text });
    setWalkieChatInput('');
  };

  const handleCopyText = async (
    text: string,
    setter: (v: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1500);
    } catch {
      // Ignore clipboard restriction
    }
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-4 pt-4 pb-24 space-y-4">
        {/* Top Mode Switcher Bar */}
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                Offline P2P Comms & Walkie-Talkie
              </h1>
              <p className="text-xs text-[#A3A3A3]">
                Zero cell towers · Zero internet · Sound Modem, QR Burst,
                Hotspot PTT & Offline Radio Intel
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCurrentGps}
              disabled={fetchingGps}
              className="min-h-[40px] px-3 rounded-xl bg-black border border-[#2A2A2A] text-xs font-mono text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 shrink-0" />
              <span>
                {fetchingGps
                  ? 'Fixing GPS...'
                  : coordsStr
                    ? `GPS ${coordsStr}`
                    : 'Attach GPS Fix'}
              </span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {(
              [
                {
                  id: 'acoustic',
                  title: 'Sound Modem',
                  sub: 'Audio FSK',
                  icon: AudioWaveform,
                },
                {
                  id: 'qr',
                  title: 'QR Burst',
                  sub: 'Visual Offline',
                  icon: QrCode,
                },
                {
                  id: 'walkie',
                  title: 'Hotspot PTT',
                  sub: 'WebRTC Voice',
                  icon: Radio,
                },
                {
                  id: 'radio',
                  title: 'Radio Intel',
                  sub: 'Freq · CW · EMF',
                  icon: Antenna,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`min-h-[58px] px-1.5 sm:px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 text-center sm:text-left transition cursor-pointer ${
                    active
                      ? 'bg-[#171200] border-[#FFB300] text-[#F5F5F5]'
                      : 'bg-black border-[#222222] text-[#A3A3A3] hover:border-[#3A3A3A]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
                      active ? 'text-[#FFB300]' : 'text-[#737373]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap">
                      {tab.title}
                    </div>
                    <div className="hidden sm:block text-[10px] text-[#737373]">
                      {tab.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Workspace Grid: Active Mode Left + Unified Comms Log Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Active Comms Mode Panel */}
          <div className="lg:col-span-7 space-y-4">
            {/* ==================== MODE A: ACOUSTIC MODEM ==================== */}
            {mode === 'acoustic' && (
              <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                      Mode A — Acoustic Sound Modem (FSK)
                    </h2>
                    <p className="text-xs text-[#A3A3A3]">
                      Transmit text & GPS via speaker tones and decode live via
                      microphone — zero radio, Bluetooth, or Wi-Fi needed.
                    </p>
                  </div>
                  <AudioWaveform className="w-6 h-6 text-[#FFB300] shrink-0" />
                </div>

                {/* Carrier Band Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(MODEM_BANDS) as ModemBand[]).map((bId) => {
                    const b = MODEM_BANDS[bId];
                    const active = modemBand === bId;
                    return (
                      <button
                        key={bId}
                        type="button"
                        disabled={txActive || rxActive}
                        onClick={() => setModemBand(bId)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'bg-[#171200] border-[#FFB300] text-[#F5F5F5]'
                            : 'bg-black border-[#222222] text-[#A3A3A3]'
                        } disabled:opacity-50`}
                      >
                        <div className="text-xs font-bold">{b.label}</div>
                        <div className="text-[11px] text-[#737373] mt-0.5">
                          {b.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick SOS Presets + Outgoing Text */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'SOS NEED WATER',
                      'SAFE ZONE CLEAR',
                      'MEDIC NEEDED NOW',
                      'DANGER STAY BACK',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAcousticMsg(preset)}
                        className="px-2.5 py-1.5 rounded-lg bg-black border border-[#262626] text-[11px] font-mono text-[#A3A3A3] hover:border-[#FFB300] hover:text-[#FFB300] transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A3A3A3]">
                      Outgoing Acoustic Message (max 140 chars)
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-[#FFB300] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeGpsAcoustic}
                        onChange={(e) => {
                          setIncludeGpsAcoustic(e.target.checked);
                          if (e.target.checked && !coordsStr) fetchCurrentGps();
                        }}
                        className="accent-[#FFB300]"
                      />
                      <span>Append GPS</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    maxLength={120}
                    value={acousticMsg}
                    onChange={(e) => setAcousticMsg(e.target.value)}
                    placeholder="Type short emergency message..."
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-black border border-[#262626] font-mono text-sm text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                  />

                  <button
                    type="button"
                    onClick={handleStartAcousticTx}
                    disabled={!acousticMsg.trim()}
                    className={`w-full min-h-[50px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                      txActive
                        ? 'bg-[#FF3B30] text-white'
                        : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
                    } disabled:opacity-50`}
                  >
                    {txActive ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span className="font-mono tabular-nums">
                          STOP TX ({txProgress}% · {txFreq} Hz)
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Transmit Acoustic Tone Burst</span>
                      </>
                    )}
                  </button>

                  {txActive && (
                    <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                      <div
                        className="h-full bg-[#FFB300] transition-all duration-75"
                        style={{ width: `${txProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Live Microphone FFT Receiver */}
                <div className="pt-4 border-t border-[#1F1F1F] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#F5F5F5]">
                        Microphone FSK Receiver
                      </div>
                      <div className="text-xs text-[#737373]">
                        Hold Phone B’s mic near Phone A’s speaker to decode live
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAcousticRx}
                      className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                        rxActive
                          ? 'bg-[#FF3B30] text-white'
                          : 'bg-[#141414] border border-[#FFB300] text-[#FFB300] hover:bg-[#1C1600]'
                      }`}
                    >
                      {rxActive ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span>Stop Listening</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>Listen & Decode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {rxError && (
                    <div className="rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3 text-xs text-[#F5F5F5]">
                      {rxError}
                    </div>
                  )}

                  {/* Real-Time FFT Carrier Level Meters */}
                  <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#A3A3A3]">
                        RX State:{' '}
                        <span className="text-[#FFB300] font-semibold">
                          {rxActive ? rxTelemetry.state.toUpperCase() : 'STANDBY'}
                        </span>
                      </span>
                      <span className="text-[#737373] tabular-nums">
                        {MODEM_BANDS[modemBand].freqSpace}/
                        {MODEM_BANDS[modemBand].freqMark} Hz
                      </span>
                    </div>

                    {[
                      {
                        label: `SPACE 0 (${MODEM_BANDS[modemBand].freqSpace} Hz)`,
                        val: rxTelemetry.spaceLevel,
                        color: '#38BDF8',
                      },
                      {
                        label: `MARK 1 (${MODEM_BANDS[modemBand].freqMark} Hz)`,
                        val: rxTelemetry.markLevel,
                        color: '#FFB300',
                      },
                      {
                        label: `SYNC (${MODEM_BANDS[modemBand].freqSync} Hz)`,
                        val: rxTelemetry.syncLevel,
                        color: '#FF3B30',
                      },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-[#737373]">
                          <span>{bar.label}</span>
                          <span className="tabular-nums">{bar.val}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#171717] overflow-hidden">
                          <div
                            className="h-full transition-all duration-75"
                            style={{
                              width: `${bar.val}%`,
                              backgroundColor: bar.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {rxTelemetry.partialText && (
                      <div className="pt-2 border-t border-[#1A1A1A] font-mono text-xs text-[#FFB300]">
                        Decoding: {rxTelemetry.partialText}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ==================== MODE B: OFFLINE QR TACTICAL BURST ==================== */}
            {mode === 'qr' && (
              <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                      Mode B — Offline QR Tactical Burst
                    </h2>
                    <p className="text-xs text-[#A3A3A3]">
                      Zero-radio silent optical transfer — display a high-contrast
                      QR or scan another survivor’s screen offline.
                    </p>
                  </div>
                  <QrCode className="w-6 h-6 text-[#FFB300] shrink-0" />
                </div>

                {/* Priority Selector */}
                <div className="grid grid-cols-4 gap-2">
                  {(['SOS', 'SAFE', 'WATER', 'INFO'] as BurstPriority[]).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQrPriority(p)}
                        className={`min-h-[40px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                          qrPriority === p
                            ? p === 'SOS'
                              ? 'bg-[#FF3B30] border-[#FF3B30] text-white'
                              : 'bg-[#FFB300] border-[#FFB300] text-black'
                            : 'bg-black border-[#262626] text-[#A3A3A3]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A3A3A3]">Burst Message</span>
                    <label className="flex items-center gap-1.5 text-xs text-[#FFB300] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qrIncludeGps}
                        onChange={(e) => {
                          setQrIncludeGps(e.target.checked);
                          if (e.target.checked && !coordsStr) fetchCurrentGps();
                        }}
                        className="accent-[#FFB300]"
                      />
                      <span>Include GPS</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={qrMessage}
                    onChange={(e) => setQrMessage(e.target.value)}
                    placeholder="Enter coordinates, safe route, or medical status..."
                    className="w-full p-3 rounded-xl bg-black border border-[#262626] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#FFB300] resize-none"
                  />
                </div>

                {/* Generated High-Contrast QR Card */}
                <div className="rounded-2xl bg-white p-5 flex flex-col items-center justify-center">
                  <QRCodeCanvas
                    value={qrPayload}
                    size={210}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    includeMargin={false}
                  />
                  <div className="mt-2.5 font-mono text-[10px] text-black/80 text-center break-all max-w-xs">
                    {qrPayload}
                  </div>
                </div>

                {/* Actions: Fullscreen QR, Copy Payload, Scan Incoming QR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQrScannerMode('burst')}
                    className="min-h-[48px] px-4 rounded-xl bg-[#FFB300] text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#FFC433] transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Scan Incoming QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrFullscreen(true)}
                    className="min-h-[48px] px-4 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] hover:border-[#FFB300] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-[#FFB300] shrink-0" />
                    <span>Fullscreen QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(qrPayload, setCopiedPayload)}
                    className="min-h-[48px] px-4 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#A3A3A3] hover:text-[#F5F5F5] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-4 h-4 text-[#FFB300]" />
                        <span className="text-[#FFB300]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Payload</span>
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* ==================== MODE C: SERVERLESS WEBRTC WALKIE-TALKIE ==================== */}
            {mode === 'walkie' && (
              <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                      Mode C — Local Hotspot Walkie-Talkie
                    </h2>
                    <p className="text-xs text-[#A3A3A3]">
                      Serverless WebRTC over offline Mobile Hotspot (no
                      internet). Pair via 2-step QR handshake for live PTT voice
                      + text.
                    </p>
                  </div>
                  <Wifi
                    className={`w-6 h-6 shrink-0 ${
                      rtcStep === 'connected' ? 'text-[#22C55E]' : 'text-[#FFB300]'
                    }`}
                  />
                </div>

                <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

                {rtcError && (
                  <div className="rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3 text-xs text-[#F5F5F5]">
                    {rtcError}
                  </div>
                )}

                {rtcStep === 'idle' && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-black border border-[#222222] p-3.5 text-xs text-[#A3A3A3] leading-relaxed">
                      <strong className="text-[#F5F5F5]">Offline Setup:</strong>{' '}
                      Turn on Phone A’s Mobile Hotspot (cellular data can be
                      OFF). Connect Phone B to Phone A’s Wi-Fi, then complete
                      the 2-step QR pairing below.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleHostCreateOffer}
                        className="min-h-[56px] p-4 rounded-xl bg-[#FFB300] text-black text-left hover:bg-[#FFC433] transition cursor-pointer"
                      >
                        <div className="text-sm font-bold">
                          Phone A: Create Channel
                        </div>
                        <div className="text-[11px] text-black/80 mt-0.5">
                          Generates Offer QR for Phone B to scan
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQrScannerMode('webrtc-offer')}
                        className="min-h-[56px] p-4 rounded-xl bg-black border border-[#FFB300] text-[#F5F5F5] text-left hover:bg-[#171200] transition cursor-pointer"
                      >
                        <div className="text-sm font-bold text-[#FFB300]">
                          Phone B: Join Channel
                        </div>
                        <div className="text-[11px] text-[#A3A3A3] mt-0.5">
                          Scan Phone A’s Offer QR to generate Answer
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {rtcStep === 'gathering' && (
                  <div className="py-8 text-center text-sm font-mono text-[#FFB300]">
                    Gathering local hotspot network candidates...
                  </div>
                )}

                {(rtcStep === 'host-offer-ready' ||
                  rtcStep === 'guest-answer-ready') && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-[#171200] border border-[#FFB300]/50 p-3 text-xs text-[#F5F5F5]">
                      {rtcStep === 'host-offer-ready' ? (
                        <>
                          <strong className="text-[#FFB300]">
                            Step 1 (Host):
                          </strong>{' '}
                          Have Phone B scan this Offer QR, then tap &ldquo;Step
                          2: Scan Guest Answer QR&rdquo; below.
                        </>
                      ) : (
                        <>
                          <strong className="text-[#FFB300]">
                            Step 2 (Guest):
                          </strong>{' '}
                          Have Phone A scan this Answer QR to lock the live
                          Walkie-Talkie link.
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white p-4 flex flex-col items-center">
                      <QRCodeCanvas
                        value={rtcQrCodeData}
                        size={230}
                        level="L"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {rtcStep === 'host-offer-ready' && (
                        <button
                          type="button"
                          onClick={() => setQrScannerMode('webrtc-answer')}
                          className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#FFB300] text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Step 2: Scan Guest Answer QR</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(rtcQrCodeData, setCopiedRtc)
                        }
                        className="min-h-[48px] px-3.5 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedRtc ? (
                          <Check className="w-4 h-4 text-[#FFB300]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#FFB300]" />
                        )}
                        <span>{copiedRtc ? 'Copied' : 'Copy Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={teardownWebRTC}
                        className="min-h-[48px] px-3.5 rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 text-xs font-semibold text-[#FF3B30] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {rtcStep === 'connected' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-[#052E16]/40 border border-[#22C55E]/50 px-3.5 py-2.5">
                      <div className="text-xs font-bold text-[#22C55E]">
                        {remoteTalking
                          ? 'RECEIVING VOICE (RX)...'
                          : pttTalking
                            ? 'TRANSMITTING VOICE (TX)...'
                            : 'HOTSPOT WALKIE LINK ACTIVE'}
                      </div>
                      <button
                        type="button"
                        onClick={teardownWebRTC}
                        className="min-h-[34px] px-2.5 rounded-lg bg-[#FF3B30] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>End</span>
                      </button>
                    </div>

                    {/* Big Tactile Push-To-Talk (PTT) Button */}
                    <div className="flex flex-col items-center gap-3 py-2">
                      <button
                        type="button"
                        onPointerDown={() => {
                          if (!pttLocked) setPttActive(true);
                        }}
                        onPointerUp={() => {
                          if (!pttLocked) setPttActive(false);
                        }}
                        onPointerLeave={() => {
                          if (!pttLocked && pttTalking) setPttActive(false);
                        }}
                        onClick={() => {
                          if (pttLocked) setPttActive(!pttTalking);
                        }}
                        className={`w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center gap-2 select-none touch-none transition active:scale-[0.96] cursor-pointer ${
                          pttTalking
                            ? 'bg-[#FF3B30] border-[#FFB300] text-white shadow-[0_0_40px_rgba(255,59,48,0.45)]'
                            : 'bg-[#121212] border-[#FFB300] text-[#FFB300] hover:bg-[#1C1600]'
                        }`}
                      >
                        <Mic className="w-10 h-10" />
                        <span className="font-display text-xl font-bold tracking-wider">
                          {pttTalking ? 'TALKING (TX)' : 'HOLD TO TALK'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !pttLocked;
                          setPttLocked(next);
                          if (!next && pttTalking) setPttActive(false);
                        }}
                        className="text-xs font-semibold text-[#A3A3A3] hover:text-[#FFB300] cursor-pointer"
                      >
                        {pttLocked
                          ? 'Mode: Tap-to-Toggle Mic (Switch to Hold)'
                          : 'Mode: Hold-to-Talk (Switch to Tap Toggle)'}
                      </button>
                    </div>

                    {/* Live P2P Text Chat */}
                    <form
                      onSubmit={handleSendWalkieChat}
                      className="flex gap-2 pt-3 border-t border-[#1F1F1F]"
                    >
                      <input
                        type="text"
                        value={walkieChatInput}
                        onChange={(e) => setWalkieChatInput(e.target.value)}
                        placeholder="Send instant P2P hotspot text..."
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-black border border-[#262626] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                      />
                      <button
                        type="submit"
                        disabled={!walkieChatInput.trim()}
                        className="min-h-[44px] px-4 rounded-xl bg-[#FFB300] text-black font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                )}
              </section>
            )}

            {/* ==================== MODE D: OFFLINE RADIO & SIGNAL INTEL ==================== */}
            {mode === 'radio' && (
              <OfflineRadioIntel
                coordsStr={coordsStr}
                onLogRadioIntel={(text, priority = 'INFO') =>
                  appendLog({
                    mode: 'radio',
                    direction: 'rx',
                    priority,
                    gps: coordsStr || undefined,
                    text,
                  })
                }
              />
            )}
          </div>

          {/* Right Column: Unified Offline Comms Log */}
          <section className="lg:col-span-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 flex flex-col max-h-[680px]">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1E1E1E]">
              <div>
                <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                  Comms Intercept Log
                </h2>
                <p className="text-xs text-[#737373]">
                  Saved locally · Acoustic, QR, Walkie & Radio Intel
                </p>
              </div>
              {commsLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCommsLog([])}
                  className="min-h-[36px] px-2.5 rounded-lg text-xs text-[#737373] hover:text-[#FF3B30] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="mt-3 flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
              {commsLog.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#737373] leading-relaxed">
                  No transmissions logged yet. Send an Acoustic FSK tone, scan a
                  survivor QR Burst, or connect over local Hotspot PTT.
                </p>
              ) : (
                commsLog.map((item) => (
                  <div key={item.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span
                        className={
                          item.direction === 'tx'
                            ? 'text-[#FFB300] font-bold'
                            : 'text-[#22C55E] font-bold'
                        }
                      >
                        {item.direction === 'tx' ? 'TX' : 'RX'} ·{' '}
                        {item.mode.toUpperCase()}
                        {item.priority ? ` · ${item.priority}` : ''}
                      </span>
                      <span className="text-[#737373] tabular-nums">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-[#F5F5F5] leading-snug break-words">
                      {item.text}
                    </p>
                    {item.gps && (
                      <div className="font-mono text-[11px] text-[#FFB300]">
                        GPS: {item.gps}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Fullscreen High-Contrast QR Display Modal */}
      {qrFullscreen && (
        <div
          onClick={() => setQrFullscreen(false)}
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen Tactical QR Burst"
        >
          <QRCodeCanvas
            value={qrPayload}
            size={300}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
          <div className="mt-4 font-mono text-xs text-black font-bold text-center max-w-sm break-all">
            {qrPayload}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQrFullscreen(false);
            }}
            className="mt-6 min-h-[48px] px-6 rounded-xl bg-black text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close Fullscreen QR</span>
          </button>
        </div>
      )}

      {/* Camera QR Scanner Modal (used by Mode B Burst & Mode C WebRTC Handshake) */}
      {qrScannerMode && (
        <QRScannerModal
          title={
            qrScannerMode === 'burst'
              ? 'Scan Survivor QR Burst'
              : qrScannerMode === 'webrtc-offer'
                ? 'Scan Host Offer QR (Phone A)'
                : 'Scan Guest Answer QR (Phone B)'
          }
          subtitle={
            qrScannerMode === 'burst'
              ? 'Reads Z Survival offline message & GPS coordinates'
              : 'Completes serverless Hotspot Walkie-Talkie pairing'
          }
          onClose={() => setQrScannerMode(null)}
          onScan={(text) => {
            if (qrScannerMode === 'burst') handleBurstScanned(text);
            else if (qrScannerMode === 'webrtc-offer')
              handleGuestScanOffer(text);
            else if (qrScannerMode === 'webrtc-answer')
              handleHostScanAnswer(text);
          }}
        />
      )}
    </>
  );
};
