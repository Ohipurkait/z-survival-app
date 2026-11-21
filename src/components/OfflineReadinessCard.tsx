import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Circle,
  HardDrive,
  Languages,
  Map as MapIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  formatStorageBytes,
  type OfflineReadinessState,
} from '../hooks/useOfflineReadiness';

const DISMISS_KEY = 'z_survival_setup_card_dismissed_v1';

interface OfflineReadinessCardProps {
  readiness: OfflineReadinessState;
  onNavigateTab: (tab: 'medic' | 'map' | 'translator') => void;
}

export const OfflineReadinessCard: React.FC<OfflineReadinessCardProps> = ({
  readiness,
  onNavigateTab,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  };

  const allReady = readiness.readyCount === 3;

  const items: Array<{
    id: 'map' | 'translator' | 'medic';
    label: string;
    ready: boolean;
    readyDetail: string;
    setupLabel: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'map',
      label: 'Offline Map',
      ready: readiness.mapReady,
      readyDetail: `${readiness.mapTileCount.toLocaleString()} tiles cached`,
      setupLabel: 'Cache Map',
      icon: MapIcon,
    },
    {
      id: 'translator',
      label: 'Pan-India Translator',
      ready: readiness.translatorReady,
      readyDetail: '12 languages cached',
      setupLabel: 'Download',
      icon: Languages,
    },
    {
      id: 'medic',
      label: 'Local AI Brain',
      ready: readiness.aiReady,
      readyDetail: 'WebGPU model cached',
      setupLabel: 'Install AI',
      icon: Brain,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-3">
      <section
        aria-label="Offline Readiness Setup"
        className="rounded-2xl bg-[#070707] border border-[#222222] p-3.5 sm:p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${
                allReady ? 'text-[#00E676]' : 'text-[#FFB300]'
              }`}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-[#F5F5F5]">
                  Offline Readiness Setup
                </h2>
                <span
                  className={`font-mono text-[11px] font-bold tabular-nums ${
                    allReady ? 'text-[#00E676]' : 'text-[#FFB300]'
                  }`}
                >
                  {readiness.readyCount}/3 Ready
                </span>
                {readiness.remainingBytes !== null && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#737373] tabular-nums">
                    <HardDrive className="w-3 h-3 shrink-0" />
                    <span>{formatStorageBytes(readiness.remainingBytes)} free</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[34px] min-w-[34px] rounded-lg text-[#737373] hover:text-[#F5F5F5] hover:bg-[#141414] flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Dismiss Offline Readiness Setup card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateTab(item.id)}
                className={`min-h-[46px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                  item.ready
                    ? 'bg-black border-[#00E676]/45'
                    : 'bg-black border-[#242424] hover:border-[#FFB300]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.ready ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#525252] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div
                      className={`text-[10px] font-mono tabular-nums truncate ${
                        item.ready ? 'text-[#00E676]' : 'text-[#737373]'
                      }`}
                    >
                      {item.ready ? item.readyDetail : 'Tap to cache offline'}
                    </div>
                  </div>
                </div>

                {!item.ready && (
                  <span className="text-[11px] font-bold text-[#FFB300] whitespace-nowrap shrink-0">
                    {item.setupLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
