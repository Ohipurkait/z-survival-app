import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg bg-[#FFB300] text-black text-[11px] font-bold tracking-wide hover:bg-[#FFC433] active:scale-[0.98] transition whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Install Z Survival app for offline use"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0A] border border-[#262626] p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#FFB300] shrink-0" />
                <h2
                  id="install-guide-title"
                  className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]"
                >
                  Add Z Survival to Home Screen
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] transition cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-[#A3A3A3] leading-relaxed">
              Install Z Survival directly onto your phone so all tools, cached
              maps, local AI brain, and Pan-India translator launch full-screen
              in Airplane Mode.
            </p>

            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm text-[#F5F5F5]">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    01.
                  </span>
                  <span>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#FFB300]">
                      <Share className="w-3.5 h-3.5" /> Share
                    </span>{' '}
                    button in your Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    02.
                  </span>
                  <span>
                    Scroll down and tap{' '}
                    <strong className="text-[#F5F5F5]">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    03.
                  </span>
                  <span>
                    Tap <strong className="text-[#F5F5F5]">Add</strong> in the
                    top-right corner. Launch from your home screen anytime
                    offline.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-[#F5F5F5]">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    01.
                  </span>
                  <span>
                    Open your browser menu (three dots in Chrome / Edge / Brave).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    02.
                  </span>
                  <span>
                    Tap <strong className="text-[#F5F5F5]">Install App</strong> or{' '}
                    <strong className="text-[#F5F5F5]">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#FFB300] font-semibold mt-0.5">
                    03.
                  </span>
                  <span>
                    Confirm installation to run Z Survival full-screen in
                    Airplane Mode.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] text-sm font-semibold text-[#F5F5F5] hover:bg-[#242424] transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
