import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ClipboardPaste, X, AlertTriangle } from 'lucide-react';

interface QRScannerModalProps {
  title: string;
  subtitle?: string;
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  title,
  subtitle,
  onScan,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [scannerEngine, setScannerEngine] = useState<'native' | 'jsqr'>('jsqr');

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          'Camera unavailable in this browser. Paste the QR payload text manually below.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        let detector: BarcodeDetectorLike | null = null;
        const win = window as unknown as {
          BarcodeDetector?: new (opts: {
            formats: string[];
          }) => BarcodeDetectorLike;
        };
        if (typeof win.BarcodeDetector === 'function') {
          try {
            detector = new win.BarcodeDetector({ formats: ['qr_code'] });
            setScannerEngine('native');
          } catch {
            detector = null;
          }
        }

        const scanFrame = async () => {
          if (!active || !videoRef.current) return;
          const video = videoRef.current;

          if (video.readyState >= 2 && video.videoWidth > 0) {
            if (detector) {
              try {
                const codes = await detector.detect(video);
                if (codes.length > 0 && codes[0].rawValue) {
                  active = false;
                  onScan(codes[0].rawValue);
                  return;
                }
              } catch {
                // Fall back to jsQR if native detector errors on a frame
                detector = null;
                setScannerEngine('jsqr');
              }
            }

            const canvas = canvasRef.current;
            if (canvas) {
              const w = Math.min(video.videoWidth, 640);
              const h = Math.round((video.videoHeight / video.videoWidth) * w);
              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
              }
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imgData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imgData.data, w, h, {
                  inversionAttempts: 'attemptBoth',
                });
                if (code && code.data) {
                  active = false;
                  onScan(code.data);
                  return;
                }
              }
            }
          }

          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch {
        setCameraError(
          'Camera permission denied or no rear camera detected. You can paste a QR code payload manually below.'
        );
      }
    };

    startCamera();

    return () => {
      active = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0A0A0A] border border-[#262626] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 text-[#FFB300] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold tracking-wide text-[#F5F5F5] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[#A3A3A3] truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer"
            aria-label="Close QR scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {cameraError ? (
            <div className="rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3.5 flex items-start gap-2.5 text-xs text-[#F5F5F5]">
              <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
              <p className="leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-h-[320px] rounded-xl overflow-hidden bg-black border border-[#262626]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Tactical reticle overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-[#FFB300]/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-black/80 text-[11px] font-mono text-[#FFB300] whitespace-nowrap">
                Aim at survivor QR ({scannerEngine === 'native' ? 'Hardware' : 'jsQR'})
              </div>
            </div>
          )}

          {/* Manual payload paste fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualText.trim()) onScan(manualText.trim());
            }}
            className="space-y-2 pt-2 border-t border-[#1F1F1F]"
          >
            <label
              htmlFor="manual-qr-input"
              className="flex items-center gap-1.5 text-xs text-[#A3A3A3]"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-[#FFB300]" />
              <span>Or paste copied QR / handshake code</span>
            </label>
            <div className="flex gap-2">
              <input
                id="manual-qr-input"
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste code payload here..."
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-black border border-[#2A2A2A] font-mono text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="min-h-[42px] px-4 rounded-xl bg-[#FFB300] text-black text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
              >
                Decode
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
