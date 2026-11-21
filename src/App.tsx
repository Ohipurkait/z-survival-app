import React, { useEffect, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  Eye,
  Flashlight,
  HardDrive,
  HeartPulse,
  Languages,
  Map as MapIcon,
  Radio,
  WifiOff,
  Zap,
} from 'lucide-react';
import { OfflineReadinessCard } from './components/OfflineReadinessCard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AIMedicTab } from './components/tabs/AIMedicTab';
import { CommsTab } from './components/tabs/CommsTab';
import { OfflineMapTab } from './components/tabs/OfflineMapTab';
import { SurvivalToolsTab } from './components/tabs/SurvivalToolsTab';
import { TranslatorTab } from './components/tabs/TranslatorTab';
import {
  formatStorageBytes,
  useOfflineReadiness,
} from './hooks/useOfflineReadiness';
import { PowerSaverProvider, usePowerSaver } from './hooks/usePowerSaver';
import { useOnlineStatus } from './hooks/usePWAInstall';

type TabId = 'medic' | 'map' | 'comms' | 'translator' | 'tools';

interface NavTab {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_TABS: NavTab[] = [
  { id: 'medic', label: 'AI Medic', icon: HeartPulse },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'comms', label: 'Comms', icon: Radio },
  { id: 'translator', label: 'Translate', icon: Languages },
  { id: 'tools', label: 'Tools', icon: Flashlight },
];

function ZSurvivalShell() {
  const [activeTab, setActiveTab] = useState<TabId>('medic');
  const [mapMounted, setMapMounted] = useState(false);
  const [sosJumpSignal, setSosJumpSignal] = useState(0);

  const isOnline = useOnlineStatus();
  const readiness = useOfflineReadiness();
  const {
    ultraPowerSaver,
    autoTriggered,
    nightVision,
    battery,
    toggleUltraPowerSaver,
    toggleNightVision,
  } = usePowerSaver();

  useEffect(() => {
    if (activeTab === 'map') {
      if (!mapMounted) {
        setMapMounted(true);
      } else {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }
    }
  }, [activeTab, mapMounted]);

  const handleQuickSos = () => {
    setActiveTab('tools');
    setSosJumpSignal((n) => n + 1);
  };

  const isLowBattery =
    battery.levelPct !== null && battery.levelPct < 20 && !battery.charging;
  const isHealthyBattery =
    battery.charging || (battery.levelPct !== null && battery.levelPct >= 40);

  return (
    <div className="min-h-[100dvh] bg-black text-[#F5F5F5] flex flex-col">
      {/* Compact 360px-Safe Top Tactical Header (56px) */}
      <header className="sticky top-0 z-30 h-14 bg-black/95 border-b border-[#1E1E1E] backdrop-blur-md">
        <div className="w-full max-w-6xl mx-auto h-full px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Brand Logo: Custom Z Compass Crosshair + "Z Survival" */}
          <button
            type="button"
            onClick={() => setActiveTab('medic')}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0 cursor-pointer"
            aria-label="Z Survival Home"
          >
            <img
              src="/icon.svg"
              alt="Z Survival emblem"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-md shrink-0"
            />
            <span className="font-display text-base sm:text-xl font-bold tracking-wider text-[#F5F5F5] whitespace-nowrap shrink-0">
              <span className="text-[#FFB300]">Z</span> Survival
            </span>
          </button>

          {/* Desktop Inline Offline Readiness Status (Phosphor Safe Green #00E676 for Ready) */}
          <div
            data-non-essential="true"
            className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#080808] border border-[#222222] text-[11px] font-mono tabular-nums whitespace-nowrap overflow-hidden min-w-0"
            title={`Offline modules cached: ${readiness.readyCount}/3 · Remaining storage: ${formatStorageBytes(readiness.remainingBytes)}`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('medic')}
              className={`cursor-pointer transition ${
                readiness.aiReady
                  ? 'text-[#00E676] font-semibold'
                  : 'text-[#666666] hover:text-[#FFB300]'
              }`}
            >
              AI
            </button>
            <span className="text-[#333333]" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`cursor-pointer transition ${
                readiness.mapReady
                  ? 'text-[#00E676] font-semibold'
                  : 'text-[#666666] hover:text-[#FFB300]'
              }`}
            >
              Map
            </button>
            <span className="text-[#333333]" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('translator')}
              className={`cursor-pointer transition ${
                readiness.translatorReady
                  ? 'text-[#00E676] font-semibold'
                  : 'text-[#666666] hover:text-[#FFB300]'
              }`}
            >
              Translator
            </button>
            <span className="text-[#333333]" aria-hidden="true">
              ·
            </span>
            <span
              className={`font-semibold ${
                readiness.readyCount === 3 ? 'text-[#00E676]' : 'text-[#A3A3A3]'
              }`}
            >
              {readiness.readyCount}/3 Ready
            </span>
            {readiness.remainingBytes !== null && (
              <>
                <span className="text-[#333333]" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-[#A3A3A3]">
                  <HardDrive className="w-3 h-3 text-[#737373] shrink-0" />
                  <span>{formatStorageBytes(readiness.remainingBytes)}</span>
                </span>
              </>
            )}
          </div>

          {/* Right Action Cluster — Fits cleanly on 360px phones without clipping */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Night-Vision Red Mode Eye Toggle */}
            <button
              type="button"
              onClick={toggleNightVision}
              aria-pressed={nightVision}
              aria-label={
                nightVision
                  ? 'Disable Night-Vision Red Mode'
                  : 'Enable Night-Vision Red Mode'
              }
              title={
                nightVision
                  ? 'Night-Vision Red Mode ON — Tap to restore standard palette'
                  : 'Night-Vision Red Mode (Preserves dark-adapted vision)'
              }
              className={`min-h-[34px] min-w-[34px] px-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                nightVision
                  ? 'bg-black border-[#FF1E1E] text-[#FF1E1E]'
                  : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-[#FF3B30] hover:text-[#FF3B30]'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" />
            </button>

            {/* Live Battery Badge & Ultra Power Saver Toggle */}
            <button
              type="button"
              onClick={toggleUltraPowerSaver}
              aria-pressed={ultraPowerSaver}
              title={
                ultraPowerSaver
                  ? 'Ultra Power Saver Active — Tap to exit'
                  : 'Tap to toggle Ultra Power Saver (Doomsday Battery Mode)'
              }
              className={`min-h-[34px] px-1.5 sm:px-2 rounded-lg border text-[11px] font-mono font-bold tabular-nums flex items-center gap-1 whitespace-nowrap cursor-pointer transition shrink-0 ${
                ultraPowerSaver
                  ? 'bg-black border-[#FF3B30] text-[#FF3B30]'
                  : isLowBattery
                    ? 'bg-[#1C0706] border-[#FF3B30] text-[#FF3B30]'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] hover:border-[#FFB300]'
              }`}
            >
              {battery.supported && battery.levelPct !== null ? (
                <>
                  {battery.charging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
                  ) : isLowBattery ? (
                    <BatteryLow className="w-3.5 h-3.5 text-[#FF3B30] shrink-0" />
                  ) : (
                    <Battery
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isHealthyBattery ? 'text-[#00E676]' : 'text-[#FFB300]'
                      }`}
                    />
                  )}
                  <span
                    className={
                      ultraPowerSaver || isLowBattery
                        ? 'text-[#FF3B30]'
                        : isHealthyBattery
                          ? 'text-[#00E676]'
                          : 'text-[#FFB300]'
                    }
                  >
                    {battery.levelPct}%
                  </span>
                </>
              ) : (
                <>
                  <Zap
                    className={`w-3.5 h-3.5 shrink-0 ${
                      ultraPowerSaver ? 'text-[#FF3B30]' : 'text-[#00E676]'
                    }`}
                  />
                  <span className="hidden xs:inline">
                    {ultraPowerSaver ? 'ULTRA' : 'PWR'}
                  </span>
                </>
              )}
            </button>

            {/* Emergency Crimson Quick SOS Trigger */}
            <button
              type="button"
              onClick={handleQuickSos}
              className="min-h-[34px] px-2 rounded-lg bg-[#FF3B30] text-white text-[11px] font-mono font-bold tracking-wider hover:bg-[#FF5247] active:scale-[0.97] transition whitespace-nowrap cursor-pointer shrink-0"
              aria-label="Open Emergency SOS Signals and Torch"
              title="Jump to Emergency SOS Beacons"
            >
              SOS
            </button>

            {!isOnline && (
              <div
                className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-[#00E676] whitespace-nowrap"
                role="status"
                title="Running 100% Offline"
              >
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
              </div>
            )}

            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Active Mode Status Strips (Night-Vision Red / Doomsday Battery) */}
      {(ultraPowerSaver || nightVision) && (
        <div className="bg-black border-b border-[#3D1400] px-3 py-1.5">
          <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-[#FF3B30] font-bold truncate">
              {nightVision ? 'NIGHT-VISION RED MODE' : ''}
              {nightVision && ultraPowerSaver ? ' · ' : ''}
              {ultraPowerSaver
                ? `DOOMSDAY BATTERY${autoTriggered ? ' (<20%)' : ''} · PURE OLED BLACK`
                : ''}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {nightVision && (
                <button
                  type="button"
                  onClick={toggleNightVision}
                  className="text-[#FF3B30] underline cursor-pointer"
                >
                  Exit Red
                </button>
              )}
              {ultraPowerSaver && (
                <button
                  type="button"
                  onClick={toggleUltraPowerSaver}
                  className="text-[#FFB300] underline cursor-pointer"
                >
                  Exit Saver
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dismissible First-Time Offline Readiness Setup Card */}
      <OfflineReadinessCard
        readiness={readiness}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area — Tabs stay alive to preserve ongoing local downloads & walkie links */}
      <main className="flex-1 w-full bg-black">
        <div className={activeTab === 'medic' ? 'block' : 'hidden'}>
          <AIMedicTab />
        </div>

        {mapMounted && (
          <div className={activeTab === 'map' ? 'block' : 'hidden'}>
            <OfflineMapTab isTabActive={activeTab === 'map'} />
          </div>
        )}

        <div className={activeTab === 'comms' ? 'block' : 'hidden'}>
          <CommsTab />
        </div>

        <div className={activeTab === 'translator' ? 'block' : 'hidden'}>
          <TranslatorTab />
        </div>

        <div className={activeTab === 'tools' ? 'block' : 'hidden'}>
          <SurvivalToolsTab sosJumpSignal={sosJumpSignal} />
        </div>
      </main>

      {/* Fixed 5-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Primary survival modules"
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-[#1F1F1F] backdrop-blur-md pb-safe"
      >
        <div className="w-full max-w-6xl mx-auto grid grid-cols-5 h-16">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[48px] px-1 transition cursor-pointer ${
                  isActive
                    ? 'text-[#FFB300]'
                    : 'text-[#808080] hover:text-[#D4D4D4]'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-0.5 bg-[#FFB300]"
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <PowerSaverProvider>
      <ZSurvivalShell />
    </PowerSaverProvider>
  );
}
