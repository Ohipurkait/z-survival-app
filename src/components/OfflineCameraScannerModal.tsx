import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  Leaf,
  RefreshCw,
  ScanEye,
  Send,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import {
  VISION_MODEL_ID,
  localVisionService,
  type ScanFocusMode,
  type ScanResult,
} from '../services/localVisionService';

interface OfflineCameraScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSendReportToMedic: (promptTitle: string, reportBody: string) => void;
}

export const OfflineCameraScannerModal: React.FC<
  OfflineCameraScannerModalProps
> = ({ open, onClose, onSendReportToMedic }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [focusMode, setFocusMode] = useState<ScanFocusMode>('auto');
  const [modelState, setModelState] = useState<
    'idle' | 'downloading' | 'ready' | 'error'
  >(localVisionService.isLoaded() ? 'ready' : 'idle');
  const [isCached, setIsCached] = useState<boolean>(
    localVisionService.isMarkedCached()
  );
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloadDetail, setDownloadDetail] = useState('');
  const [modelError, setModelError] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(
    null
  );
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPreviewUrl(null);
    setScanResult(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        'Camera API unavailable. Use "Upload Photo" below to scan an image offline.'
      );
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        'Camera permission denied or rear camera unavailable. Use "Upload Photo" below.'
      );
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  if (!open) return null;

  const handleLoadVisionModel = async () => {
    if (modelState === 'downloading') return;
    setModelError(null);
    setModelState('downloading');
    setDownloadPct(3);
    setDownloadDetail('Loading MobileNetV2 ONNX runtime...');
    try {
      await localVisionService.loadModel((pct, detail) => {
        setDownloadPct(pct);
        setDownloadDetail(detail);
      });
      setModelState('ready');
      setIsCached(true);
    } catch (err) {
      setModelState('error');
      setModelError(
        err instanceof Error
          ? err.message
          : 'Could not download MobileNetV2. Ensure internet for one-time ~4 MB cache.'
      );
    }
  };

  const runClassificationOnCanvas = async (canvas: HTMLCanvasElement) => {
    setScanning(true);
    try {
      const result = await localVisionService.classifyCanvas(canvas, focusMode);
      setScanResult(result);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Scan failed. Try capturing with better lighting.'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleCaptureAndScan = async () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    const canvas =
      workCanvasRef.current || document.createElement('canvas');
    workCanvasRef.current = canvas;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center-crop square frame for MobileNetV2 (224x224 optimal)
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const minDim = Math.min(vw, vh);
    const sx = (vw - minDim) / 2;
    const sy = (vh - minDim) / 2;
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);

    setCapturedPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
    await runClassificationOnCanvas(canvas);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas =
          workCanvasRef.current || document.createElement('canvas');
        workCanvasRef.current = canvas;
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        setCapturedPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
        await runClassificationOnCanvas(canvas);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportToMedic = () => {
    if (!scanResult) return;
    const topStr = scanResult.predictions
      .slice(0, 3)
      .map((p) => `${p.label} (${Math.round(p.score * 100)}%)`)
      .join(', ');

    const body = `OFFLINE CAMERA SCAN REPORT [${scanResult.advice.threatLevel}]
Category: ${scanResult.advice.category}
Detected (${scanResult.mode === 'mobilenet-v2' ? 'Local MobileNetV2' : 'Offline Visual Triage'}): ${topStr}

ASSESSMENT: ${scanResult.advice.headline}

FIELD ACTION STEPS:
${scanResult.advice.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${
      scanResult.advice.protocolTitle
        ? `\n\nMatched Rule-Engine Protocol: ${scanResult.advice.protocolTitle}`
        : ''
    }`;

    onSendReportToMedic(
      `Camera Scan: ${scanResult.predictions[0]?.label || scanResult.advice.category}`,
      body
    );
    onClose();
  };

  const threatColor =
    scanResult?.advice.threatLevel === 'DANGER'
      ? 'text-[#FF3B30] border-[#FF3B30]/50 bg-[#1B0605]'
      : scanResult?.advice.threatLevel === 'CAUTION'
        ? 'text-[#FFB300] border-[#FFB300]/50 bg-[#181200]'
        : 'text-[#22C55E] border-[#22C55E]/40 bg-[#071A0E]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Offline Camera Scanner"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#0A0A0A] border border-[#262626] overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#222222] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ScanEye className="w-5 h-5 text-[#FFB300] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5] truncate">
                Offline Camera Scanner
              </h2>
              <p className="text-[11px] text-[#737373] truncate">
                Local MobileNetV2 ({VISION_MODEL_ID}) · Zero Cloud API
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-[#F5F5F5] flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close camera scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Model Status & One-Tap Offline Download */}
          <div className="rounded-xl bg-black border border-[#222222] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  {modelState === 'ready'
                    ? 'Vision Brain Active (1,000-Class MobileNetV2)'
                    : isCached
                      ? 'Vision Brain Cached Locally (~4 MB)'
                      : 'Download Local Vision Model (~4 MB)'}
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  {modelState === 'ready'
                    ? 'Runs 100% locally in Airplane Mode'
                    : 'Instant triage active now · Download once for full object ID'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadVisionModel}
                disabled={modelState === 'downloading' || modelState === 'ready'}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  modelState === 'ready'
                    ? 'bg-[#0E1E12] border border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
                } disabled:opacity-75`}
              >
                {modelState === 'ready' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Loaded</span>
                  </>
                ) : modelState === 'downloading' ? (
                  <span className="font-mono tabular-nums">{downloadPct}%</span>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{isCached ? 'Load Cached' : 'Download (~4MB)'}</span>
                  </>
                )}
              </button>
            </div>

            {modelState === 'downloading' && (
              <div className="mt-2.5 space-y-1">
                <div className="text-[11px] text-[#A3A3A3] truncate">
                  {downloadDetail}
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-full bg-[#FFB300] transition-all duration-200"
                    style={{ width: `${downloadPct}%` }}
                  />
                </div>
              </div>
            )}

            {modelError && (
              <div className="mt-2 text-[11px] text-[#FF3B30] flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{modelError}</span>
              </div>
            )}
          </div>

          {/* Scan Focus Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black border border-[#222222]">
            {(
              [
                { id: 'auto', label: 'Auto Object', icon: ScanEye },
                { id: 'plant', label: 'Plant / Forage', icon: Leaf },
                { id: 'wound', label: 'Wound Triage', icon: ShieldAlert },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = focusMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFocusMode(m.id)}
                  className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    active
                      ? m.id === 'wound'
                        ? 'bg-[#FF3B30] text-white'
                        : 'bg-[#FFB300] text-black'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Viewfinder or Captured Frame */}
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black border border-[#262626] flex items-center justify-center">
            {capturedPreviewUrl ? (
              <img
                src={capturedPreviewUrl}
                alt="Captured survival scan"
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                    <Camera className="w-8 h-8 text-[#525252]" />
                    <p className="mt-2 text-xs text-[#A3A3A3] max-w-xs">
                      {cameraError || 'Starting rear tactical camera...'}
                    </p>
                  </div>
                )}
                {/* Tactical Square Reticle */}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 relative">
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FFB300]" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FFB300]" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FFB300]" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FFB300]" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Capture & Upload Controls */}
          <div className="flex gap-2">
            {capturedPreviewUrl ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#161616] border border-[#2C2C2C] text-sm font-bold text-[#F5F5F5] hover:border-[#FFB300] flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#FFB300]" />
                <span>Scan Again</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCaptureAndScan}
                disabled={!cameraActive || scanning}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#FFB300] text-black text-sm font-bold hover:bg-[#FFC433] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{scanning ? 'Analyzing Locally...' : 'Capture & Analyze'}</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="min-h-[48px] px-3.5 rounded-xl bg-black border border-[#2C2C2C] text-xs font-semibold text-[#F5F5F5] hover:border-[#FFB300] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#FFB300]" />
              <span>Photo</span>
            </button>
          </div>

          {/* Scan Output + Rule-Engine Tactical Field Advice */}
          {scanResult && (
            <div className="space-y-3 pt-1">
              {/* Threat Verdict Banner */}
              <div className={`rounded-xl border p-3.5 ${threatColor}`}>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono font-bold uppercase tracking-wider">
                  <span>{scanResult.advice.category}</span>
                  <span>{scanResult.advice.threatLevel}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-[#F5F5F5]">
                  {scanResult.advice.headline}
                </div>
              </div>

              {/* Predictions Confidence Bars */}
              <div className="rounded-xl bg-black border border-[#222222] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#737373]">
                  <span>
                    {scanResult.mode === 'mobilenet-v2'
                      ? 'MobileNetV2 Top Matches'
                      : 'Instant Visual Triage (Download 4MB Vision Brain for 1,000-Class ID)'}
                  </span>
                  <span className="font-mono tabular-nums">
                    {scanResult.timestamp}
                  </span>
                </div>
                {scanResult.predictions.slice(0, 3).map((pred, idx) => {
                  const pct = Math.max(1, Math.round(pred.score * 100));
                  return (
                    <div key={`${pred.label}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[#F5F5F5] font-medium truncate capitalize">
                          {pred.label}
                        </span>
                        <span className="font-mono text-[#FFB300] tabular-nums shrink-0">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#171717] overflow-hidden">
                        <div
                          className="h-full bg-[#FFB300]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actionable Field Steps */}
              <div className="rounded-xl bg-black border border-[#222222] p-3.5">
                <div className="text-xs font-bold text-[#FFB300]">
                  Immediate Field Advice
                </div>
                <ol className="mt-2 space-y-1.5 text-xs text-[#E5E5E5] leading-relaxed">
                  {scanResult.advice.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[11px] text-[#737373] shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <button
                  type="button"
                  onClick={handleExportToMedic}
                  className="mt-3.5 w-full min-h-[44px] px-4 rounded-xl bg-[#FFB300] text-black text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#FFC433] transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Scan Report to AI Medic Log</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
