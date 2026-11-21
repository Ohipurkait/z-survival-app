import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  EyeOff,
  Flashlight,
  Lock,
  Megaphone,
  Plus,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FIELD_MANUAL_SECTIONS } from '../../data/fieldManual';
import { NightPerimeterGuard } from '../NightPerimeterGuard';
import { SurvivalBlueprints } from '../SurvivalBlueprints';
import { SurvivorBlackBoxVault } from '../SurvivorBlackBoxVault';

type ToolsSubTab = 'signals' | 'guard' | 'manual' | 'vault';

interface SurvivalToolsTabProps {
  sosJumpSignal?: number;
}

interface BugOutItem {
  id: string;
  label: string;
  category:
    | 'Water'
    | 'Medical'
    | 'Fire & Shelter'
    | 'Tools & Signal'
    | 'Food & Nav';
  qty: string;
  checked: boolean;
  custom?: boolean;
}

const DEFAULT_BUG_OUT_BAG: BugOutItem[] = [
  { id: 'b-1', label: '3L Water Containers / Metal Canteen', category: 'Water', qty: '3L min', checked: false },
  { id: 'b-2', label: 'Hollow-Fiber Water Filter / Purification Tabs', category: 'Water', qty: '1 kit', checked: false },
  { id: 'b-3', label: 'Unscented 6% Bleach Dropper Bottle', category: 'Water', qty: '30 ml', checked: false },
  { id: 'b-4', label: 'CAT Tourniquet & Pressure Bandage', category: 'Medical', qty: '2x', checked: false },
  { id: 'b-5', label: 'Sterile Gauze Pads, Medical Tape & Antiseptic', category: 'Medical', qty: '1 pack', checked: false },
  { id: 'b-6', label: 'ORS Electrolyte Packets & Antibiotics', category: 'Medical', qty: '10x', checked: false },
  { id: 'b-7', label: 'Nitrile Gloves & Trauma Shears', category: 'Medical', qty: '4 pairs', checked: false },
  { id: 'b-8', label: 'Ferro Rod + 2 Bic Lighters + Storm Matches', category: 'Fire & Shelter', qty: '3 sources', checked: false },
  { id: 'b-9', label: 'Emergency Mylar Bivvy / Ripstop Tarp', category: 'Fire & Shelter', qty: '1x', checked: false },
  { id: 'b-10', label: '550 Paracord (30m) & Duct Tape Roll', category: 'Fire & Shelter', qty: '30m', checked: false },
  { id: 'b-11', label: 'Dry Wool Socks & Thermal Base Layer', category: 'Fire & Shelter', qty: '2 sets', checked: false },
  { id: 'b-12', label: 'Full-Tang Fixed-Blade Knife & Multi-Tool', category: 'Tools & Signal', qty: '1 each', checked: false },
  { id: 'b-13', label: 'Headlamp + Spare Lithium Batteries', category: 'Tools & Signal', qty: '1 + 4 AA', checked: false },
  { id: 'b-14', label: '20,000mAh Power Bank + Solar Panel + Cables', category: 'Tools & Signal', qty: '1 kit', checked: false },
  { id: 'b-15', label: 'Pealess Emergency Whistle & Signal Mirror', category: 'Tools & Signal', qty: '1 each', checked: false },
  { id: 'b-16', label: 'N95 / P100 Respirator Masks & Work Gloves', category: 'Tools & Signal', qty: '4x', checked: false },
  { id: 'b-17', label: 'High-Calorie Ration Bars / Peanut Butter / Nuts', category: 'Food & Nav', qty: '72 hrs', checked: false },
  { id: 'b-18', label: 'Baseplate Magnetic Compass & Printed Map', category: 'Food & Nav', qty: '1 set', checked: false },
  { id: 'b-19', label: 'Waterproof Cash, ID Copies & Emergency Contacts', category: 'Food & Nav', qty: 'Sealed', checked: false },
];

const BUG_OUT_STORAGE_KEY = 'apex_bugout_bag_v1';
const RATION_STORAGE_KEY = 'apex_ration_calc_v1';

const SOS_SEQUENCE: Array<[boolean, number, string]> = [
  [true, 1, 'S ·'],
  [false, 1, 'S ·'],
  [true, 1, 'S ··'],
  [false, 1, 'S ··'],
  [true, 1, 'S ···'],
  [false, 3, 'S ···'],
  [true, 3, 'O —'],
  [false, 1, 'O —'],
  [true, 3, 'O ——'],
  [false, 1, 'O ——'],
  [true, 3, 'O ———'],
  [false, 3, 'O ———'],
  [true, 1, 'S ·'],
  [false, 1, 'S ·'],
  [true, 1, 'S ··'],
  [false, 1, 'S ··'],
  [true, 1, 'S ···'],
  [false, 7, 'PAUSE'],
];

type StrobeMode = 'red-white' | 'red' | 'white';
type ActivityTier = 'shelter' | 'moderate' | 'heavy';

const ACTIVITY_NEEDS: Record<
  ActivityTier,
  { label: string; litersPerPersonDay: number; kcalPerPersonDay: number }
> = {
  shelter: {
    label: 'Resting / Shelter',
    litersPerPersonDay: 2.5,
    kcalPerPersonDay: 1600,
  },
  moderate: {
    label: 'Normal Movement',
    litersPerPersonDay: 3.5,
    kcalPerPersonDay: 2200,
  },
  heavy: {
    label: 'Heavy Exertion / Heat',
    litersPerPersonDay: 5.0,
    kcalPerPersonDay: 2800,
  },
};

export const SurvivalToolsTab: React.FC<SurvivalToolsTabProps> = ({
  sosJumpSignal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ToolsSubTab>('signals');

  useEffect(() => {
    if (sosJumpSignal && sosJumpSignal > 0) {
      setActiveSubTab('signals');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [sosJumpSignal]);

  // Camera torch & SOS audio refs
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // 3kHz Whistle refs
  const whistleCtxRef = useRef<AudioContext | null>(null);
  const whistleOscRef = useRef<OscillatorNode | null>(null);
  const whistleGainRef = useRef<GainNode | null>(null);
  const whistleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flashlightOn, setFlashlightOn] = useState(false);
  const [torchHardwareAvailable, setTorchHardwareAvailable] = useState<
    boolean | null
  >(null);
  const [torchNotice, setTorchNotice] = useState<string | null>(null);
  const [screenLampOpen, setScreenLampOpen] = useState(false);

  // SOS Morse state
  const [sosActive, setSosActive] = useState(false);
  const [sosLit, setSosLit] = useState(false);
  const [sosLabel, setSosLabel] = useState('··· ——— ···');
  const [sosAudioEnabled, setSosAudioEnabled] = useState(false);

  // 3kHz Acoustic SOS Whistle state
  const [whistleActive, setWhistleActive] = useState(false);
  const [whistlePattern, setWhistlePattern] = useState<'continuous' | 'sos'>(
    'sos'
  );

  // Strobe & OLED Blackout state
  const [strobeActive, setStrobeActive] = useState(false);
  const [strobeMode, setStrobeMode] = useState<StrobeMode>('red-white');
  const [strobeSpeedMs, setStrobeSpeedMs] = useState<number>(180);
  const [strobePhase, setStrobePhase] = useState<number>(0);
  const [oledBlackout, setOledBlackout] = useState<boolean>(false);

  // Ration & Water Calculator state (persisted)
  const [rationState, setRationState] = useState<{
    people: number;
    waterLiters: number;
    foodUnit: 'kcal' | 'days';
    foodAmount: number;
    activity: ActivityTier;
  }>(() => {
    try {
      const saved = localStorage.getItem(RATION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage error
    }
    return {
      people: 2,
      waterLiters: 20,
      foodUnit: 'kcal',
      foodAmount: 18000,
      activity: 'moderate',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(RATION_STORAGE_KEY, JSON.stringify(rationState));
    } catch {
      // Ignore storage error
    }
  }, [rationState]);

  const rationResults = useMemo(() => {
    const people = Math.max(1, rationState.people || 1);
    const tier = ACTIVITY_NEEDS[rationState.activity];
    const dailyWaterNeed = people * tier.litersPerPersonDay;
    const dailyKcalNeed = people * tier.kcalPerPersonDay;

    const waterDays = Math.max(0, rationState.waterLiters) / dailyWaterNeed;
    const foodDays =
      rationState.foodUnit === 'kcal'
        ? Math.max(0, rationState.foodAmount) / dailyKcalNeed
        : Math.max(0, rationState.foodAmount) / people;

    const limitingDays = Math.min(waterDays, foodDays);
    const bottleneck: 'Water' | 'Food' | 'Balanced' =
      Math.abs(waterDays - foodDays) < 0.2
        ? 'Balanced'
        : waterDays < foodDays
          ? 'Water'
          : 'Food';

    return {
      dailyWaterNeed,
      dailyKcalNeed,
      waterDays,
      foodDays,
      limitingDays,
      bottleneck,
    };
  }, [rationState]);

  // Field Survival Manual search & accordion state
  const [manualQuery, setManualQuery] = useState('');
  const [openManualIds, setOpenManualIds] = useState<string[]>([
    'water-purification',
  ]);

  const filteredManualSections = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    if (!q) return FIELD_MANUAL_SECTIONS;

    return FIELD_MANUAL_SECTIONS.map((sec) => {
      const catMatch =
        sec.category.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q);
      const matchingGuides = sec.guides.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.steps.some((s) => s.toLowerCase().includes(q)) ||
          (g.warning && g.warning.toLowerCase().includes(q))
      );
      if (catMatch) return sec;
      if (matchingGuides.length > 0) {
        return { ...sec, guides: matchingGuides };
      }
      return null;
    }).filter((s): s is (typeof FIELD_MANUAL_SECTIONS)[number] => s !== null);
  }, [manualQuery]);

  const toggleManualSection = (id: string) => {
    setOpenManualIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Bug-Out Bag Checklist
  const [items, setItems] = useState<BugOutItem[]>(() => {
    try {
      const saved = localStorage.getItem(BUG_OUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_BUG_OUT_BAG;
  });

  const [bagFilter, setBagFilter] = useState<'all' | 'unpacked' | 'packed'>(
    'all'
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] =
    useState<BugOutItem['category']>('Tools & Signal');
  const [newItemQty, setNewItemQty] = useState('1x');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BUG_OUT_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage error
    }
  }, [items]);

  // Hardware camera LED torch helpers
  const acquireTorchTrack = async (): Promise<MediaStreamTrack | null> => {
    if (trackRef.current && trackRef.current.readyState === 'live') {
      return trackRef.current;
    }
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setTorchHardwareAvailable(false);
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track) {
        stream.getTracks().forEach((t) => t.stop());
        setTorchHardwareAvailable(false);
        return null;
      }

      const caps = track.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      if (caps && 'torch' in caps && caps.torch) {
        streamRef.current = stream;
        trackRef.current = track;
        setTorchHardwareAvailable(true);
        return track;
      }

      try {
        await track.applyConstraints({
          advanced: [{ torch: true } as MediaTrackConstraintSet],
        });
        streamRef.current = stream;
        trackRef.current = track;
        setTorchHardwareAvailable(true);
        return track;
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        setTorchHardwareAvailable(false);
        return null;
      }
    } catch {
      setTorchHardwareAvailable(false);
      return null;
    }
  };

  const setHardwareTorch = async (on: boolean): Promise<boolean> => {
    const track = on ? await acquireTorchTrack() : trackRef.current;
    if (!track) return false;
    try {
      await track.applyConstraints({
        advanced: [{ torch: on } as MediaTrackConstraintSet],
      });
      return true;
    } catch {
      return false;
    }
  };

  const releaseTorchCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
  };

  const stopAudioTone = () => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
    } catch {
      // Ignore already stopped
    }
  };

  const setAudioTone = (on: boolean) => {
    if (!sosAudioEnabled || !on) {
      stopAudioTone();
      return;
    }
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      stopAudioTone();
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.value = 820;
      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      oscRef.current = osc;
    } catch {
      // Ignore audio policy block
    }
  };

  // 3kHz Acoustic SOS Whistle Engine (Web Audio OscillatorNode)
  const stopWhistleEngine = () => {
    if (whistleTimerRef.current) {
      clearTimeout(whistleTimerRef.current);
      whistleTimerRef.current = null;
    }
    try {
      if (whistleOscRef.current) {
        whistleOscRef.current.stop();
        whistleOscRef.current.disconnect();
        whistleOscRef.current = null;
      }
      if (whistleGainRef.current) {
        whistleGainRef.current.disconnect();
        whistleGainRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  useEffect(() => {
    if (!whistleActive) {
      stopWhistleEngine();
      return;
    }

    try {
      if (!whistleCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        whistleCtxRef.current = new AudioCtx();
      }
      const ctx = whistleCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopWhistleEngine();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000, ctx.currentTime); // Piercing 3kHz rescue whistle frequency
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      whistleOscRef.current = osc;
      whistleGainRef.current = gain;

      if (whistlePattern === 'continuous') {
        gain.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.03);
      } else {
        // 3-blast international rescue whistle SOS loop
        let idx = 0;
        const unitMs = 190;
        const runStep = () => {
          if (!whistleGainRef.current || !whistleCtxRef.current) return;
          const [lit, units] = SOS_SEQUENCE[idx];
          const now = whistleCtxRef.current.currentTime;
          whistleGainRef.current.gain.setTargetAtTime(lit ? 0.65 : 0.0, now, 0.01);
          idx = (idx + 1) % SOS_SEQUENCE.length;
          whistleTimerRef.current = setTimeout(runStep, units * unitMs);
        };
        runStep();
      }
    } catch {
      setWhistleActive(false);
    }

    return () => {
      stopWhistleEngine();
    };
  }, [whistleActive, whistlePattern]);

  // Toggle steady flashlight
  const handleToggleFlashlight = async () => {
    setTorchNotice(null);
    if (sosActive) {
      setSosActive(false);
    }

    if (flashlightOn) {
      await setHardwareTorch(false);
      releaseTorchCamera();
      setFlashlightOn(false);
      setScreenLampOpen(false);
      return;
    }

    const ok = await setHardwareTorch(true);
    if (ok) {
      setFlashlightOn(true);
      setTorchNotice('Rear Camera LED Torch active.');
    } else {
      setFlashlightOn(true);
      setScreenLampOpen(true);
      setTorchNotice(
        'Camera LED unavailable on this device — activated Full-Screen White Lamp fallback.'
      );
    }
  };

  // SOS Morse loop
  useEffect(() => {
    if (!sosActive) {
      setSosLit(false);
      setSosLabel('··· ——— ···');
      stopAudioTone();
      if (!flashlightOn) {
        setHardwareTorch(false).then(() => releaseTorchCamera());
      }
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stepIndex = 0;
    const unitMs = 180;

    const runStep = async () => {
      if (cancelled) return;
      const [lit, units, symbol] = SOS_SEQUENCE[stepIndex];
      setSosLit(lit);
      setSosLabel(symbol);
      setAudioTone(lit);

      if (torchHardwareAvailable !== false) {
        await setHardwareTorch(lit);
      }

      stepIndex = (stepIndex + 1) % SOS_SEQUENCE.length;
      timer = setTimeout(runStep, units * unitMs);
    };

    runStep();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopAudioTone();
    };
  }, [sosActive, sosAudioEnabled]);

  // Full-screen strobe interval
  useEffect(() => {
    if (!strobeActive) {
      setStrobePhase(0);
      return;
    }
    const id = setInterval(() => {
      setStrobePhase((p) => (p + 1) % 4);
    }, strobeSpeedMs);
    return () => clearInterval(id);
  }, [strobeActive, strobeSpeedMs]);

  // Cleanup camera & audio on unmount
  useEffect(() => {
    return () => {
      stopAudioTone();
      stopWhistleEngine();
      releaseTorchCamera();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (whistleCtxRef.current) {
        whistleCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleBagItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAddBagItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const added: BugOutItem = {
      id: `custom-${Date.now()}`,
      label: newItemName.trim(),
      category: newItemCategory,
      qty: newItemQty.trim() || '1x',
      checked: false,
      custom: true,
    };
    setItems((prev) => [added, ...prev]);
    setNewItemName('');
    setNewItemQty('1x');
  };

  const handleDeleteBagItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetChecklist = () => {
    setItems(DEFAULT_BUG_OUT_BAG);
    setConfirmReset(false);
  };

  const checkedCount = useMemo(
    () => items.filter((i) => i.checked).length,
    [items]
  );
  const readinessPct = items.length
    ? Math.round((checkedCount / items.length) * 100)
    : 0;

  const filteredItems = useMemo(() => {
    if (bagFilter === 'packed') return items.filter((i) => i.checked);
    if (bagFilter === 'unpacked') return items.filter((i) => !i.checked);
    return items;
  }, [items, bagFilter]);

  const strobeBg = useMemo(() => {
    if (strobeMode === 'red-white') {
      if (strobePhase === 0) return '#FF3B30';
      if (strobePhase === 2) return '#FFFFFF';
      return '#000000';
    }
    if (strobeMode === 'red') {
      return strobePhase % 2 === 0 ? '#FF3B30' : '#000000';
    }
    return strobePhase % 2 === 0 ? '#FFFFFF' : '#000000';
  }, [strobeMode, strobePhase]);

  const hasActiveSignal = flashlightOn || sosActive || whistleActive;

  const subTabs: Array<{
    id: ToolsSubTab;
    label: string;
    icon: React.ReactNode;
    activeDot?: boolean;
  }> = [
    {
      id: 'signals',
      label: 'Signals & Torch',
      icon: <Flashlight className="w-3.5 h-3.5 shrink-0" />,
      activeDot: hasActiveSignal,
    },
    {
      id: 'guard',
      label: 'Night Guard',
      icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'manual',
      label: 'Manual & Knots',
      icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'vault',
      label: 'Vault & Gear',
      icon: <Lock className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-3 pb-24 space-y-4">
        {/* 4 Horizontal Pill Sub-Tabs */}
        <div
          role="tablist"
          aria-label="Survival Tools Categories"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
        >
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(tab.id)}
                className={`shrink-0 min-h-[40px] px-3 sm:px-4 rounded-full border text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#FFB300] border-[#FFB300] text-black'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#C8C8C8] hover:border-[#FFB300]/70 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.activeDot && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#FF3B30]' : 'bg-[#FF3B30]'
                    }`}
                    aria-label="Signal active"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* SUB-TAB 1: SIGNALS & TORCH */}
        {activeSubTab === 'signals' && (
          <div className="space-y-4">
            {/* Quick OLED Blackout Banner whenever Torch, SOS Beacon, or 3kHz Whistle is running */}
            {hasActiveSignal && (
              <button
                type="button"
                onClick={() => setOledBlackout(true)}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-black border border-[#FFB300] text-[#FFB300] hover:bg-[#171200] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>
                  Blackout OLED Screen (Keep{' '}
                  {[
                    flashlightOn ? 'Torch' : null,
                    whistleActive ? '3kHz Whistle' : null,
                    sosActive ? 'SOS Beacon' : null,
                  ]
                    .filter(Boolean)
                    .join(' + ')}{' '}
                  Running)
                </span>
              </button>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Flashlight & Screen Lamp */}
              <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                    LED Flashlight
                  </h1>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    Camera LED torch with bright screen-flash fallback
                  </p>
                </div>
                <Flashlight
                  className={`w-6 h-6 shrink-0 ${
                    flashlightOn ? 'text-[#FFB300]' : 'text-[#737373]'
                  }`}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleFlashlight}
                  className={`min-h-[52px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                    flashlightOn
                      ? 'bg-[#FFB300] text-black'
                      : 'bg-[#141414] border border-[#2C2C2C] text-[#F5F5F5] hover:border-[#FFB300]'
                  }`}
                >
                  <Flashlight className="w-4 h-4 shrink-0" />
                  <span>{flashlightOn ? 'Turn Torch OFF' : 'Torch ON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreenLampOpen(true)}
                  className="min-h-[52px] px-4 rounded-xl bg-black border border-[#2A2A2A] text-sm font-semibold text-[#F5F5F5] hover:border-[#FFB300] flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                >
                  <Sun className="w-4 h-4 text-[#FFB300] shrink-0" />
                  <span>Screen Lamp</span>
                </button>
              </div>

              {torchNotice && (
                <p className="mt-3 text-xs text-[#A3A3A3] leading-relaxed">
                  {torchNotice}
                </p>
              )}
            </section>

            {/* 3kHz Acoustic SOS Whistle */}
            <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                    3kHz Acoustic SOS Whistle
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    High-penetration 3,000 Hz Web Audio rescue distress tone
                  </p>
                </div>
                <Megaphone
                  className={`w-6 h-6 shrink-0 ${
                    whistleActive ? 'text-[#FFB300]' : 'text-[#737373]'
                  }`}
                />
              </div>

              <div className="mt-3 flex items-center gap-1 p-1 rounded-xl bg-black border border-[#222222]">
                <button
                  type="button"
                  onClick={() => setWhistlePattern('sos')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold transition cursor-pointer ${
                    whistlePattern === 'sos'
                      ? 'bg-[#FFB300] text-black'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  SOS Pattern (3kHz)
                </button>
                <button
                  type="button"
                  onClick={() => setWhistlePattern('continuous')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold transition cursor-pointer ${
                    whistlePattern === 'continuous'
                      ? 'bg-[#FFB300] text-black'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  Continuous Blast
                </button>
              </div>

              <button
                type="button"
                onClick={() => setWhistleActive((v) => !v)}
                className={`mt-3 w-full min-h-[50px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                  whistleActive
                    ? 'bg-[#FF3B30] text-white'
                    : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
                }`}
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                <span>
                  {whistleActive
                    ? 'STOP 3kHz Whistle'
                    : 'Activate 3kHz Acoustic SOS Whistle'}
                </span>
              </button>
            </section>

            {/* SOS Morse Code Blinker */}
            <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                    SOS Morse Code Beacon
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    Standard international distress signal (··· ——— ···)
                  </p>
                </div>
                <Radio
                  className={`w-6 h-6 shrink-0 ${
                    sosActive ? 'text-[#FF3B30]' : 'text-[#737373]'
                  }`}
                />
              </div>

              <div
                className={`mt-4 h-18 rounded-xl border flex flex-col items-center justify-center transition-colors duration-75 ${
                  sosLit
                    ? 'bg-[#FFB300] border-[#FFB300] text-black'
                    : 'bg-black border-[#242424] text-[#F5F5F5]'
                }`}
              >
                <div className="font-mono text-xl font-bold tracking-widest">
                  {sosLabel}
                </div>
                <div
                  className={`text-[11px] font-medium mt-0.5 ${
                    sosLit ? 'text-black/80' : 'text-[#737373]'
                  }`}
                >
                  {sosActive ? 'Transmitting SOS Loop' : 'Beacon Standby'}
                </div>
              </div>

              <div className="mt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (flashlightOn) {
                      setFlashlightOn(false);
                      setScreenLampOpen(false);
                    }
                    setSosActive((v) => !v);
                  }}
                  className={`flex-1 min-h-[46px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                    sosActive
                      ? 'bg-[#FF3B30] text-white'
                      : 'bg-[#170605] border border-[#FF3B30]/60 text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white'
                  }`}
                >
                  <Radio className="w-4 h-4 shrink-0" />
                  <span>{sosActive ? 'Stop SOS Beacon' : 'Start SOS Blinker'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSosAudioEnabled((v) => !v)}
                  className={`min-h-[46px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
                    sosAudioEnabled
                      ? 'bg-[#171200] border-[#FFB300] text-[#FFB300]'
                      : 'bg-black border-[#262626] text-[#A3A3A3]'
                  }`}
                  aria-label="Toggle SOS audible 820Hz beep"
                >
                  {sosAudioEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Tone ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Full-Screen Red/White Emergency Strobe */}
            <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                    Emergency Screen Strobe
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    High-visibility rescue & perimeter hazard beacon
                  </p>
                </div>
                <AlertOctagon className="w-6 h-6 text-[#FF3B30] shrink-0" />
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'red-white', label: 'Red / White' },
                    { id: 'red', label: 'Red Tactical' },
                    { id: 'white', label: 'White Flash' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setStrobeMode(m.id)}
                    className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      strobeMode === m.id
                        ? 'bg-[#1C0706] border-[#FF3B30] text-[#F5F5F5]'
                        : 'bg-black border-[#242424] text-[#A3A3A3]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-[#A3A3A3]">Strobe Rate</span>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-black border border-[#222222]">
                  {[
                    { ms: 350, label: 'Slow' },
                    { ms: 180, label: 'Medium' },
                    { ms: 95, label: 'Rapid' },
                  ].map((spd) => (
                    <button
                      key={spd.ms}
                      type="button"
                      onClick={() => setStrobeSpeedMs(spd.ms)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                        strobeSpeedMs === spd.ms
                          ? 'bg-[#FF3B30] text-white font-semibold'
                          : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStrobeActive(true)}
                className="mt-3.5 w-full min-h-[48px] px-4 rounded-xl bg-[#FF3B30] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#FF5247] active:scale-[0.98] transition cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Launch Full-Screen Strobe</span>
              </button>
              <p className="mt-2 text-[11px] text-[#737373]">
                Photosensitivity notice: produces rapid high-contrast flashes.
                Tap anywhere on screen to exit immediately.
              </p>
            </section>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: NIGHT GUARD (Kept mounted via CSS so armed alarm stays active across sub-tab switches) */}
        <div className={activeSubTab === 'guard' ? 'block' : 'hidden'}>
          <NightPerimeterGuard />
        </div>

        {/* SUB-TAB 4: VAULT & GEAR */}
        {activeSubTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-5">
              {/* PIN-Encrypted Survivor Black Box Vault (AES-256-GCM) */}
              <SurvivorBlackBoxVault />

              {/* Ration & Water Calculator */}
              <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                    Ration & Water Calculator
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    Calculate exact survival horizon for your group offline
                  </p>
                </div>
                <Calculator className="w-6 h-6 text-[#FFB300] shrink-0" />
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="calc-people"
                    className="block text-xs text-[#A3A3A3] mb-1"
                  >
                    People
                  </label>
                  <input
                    id="calc-people"
                    type="number"
                    min={1}
                    max={50}
                    value={rationState.people}
                    onChange={(e) =>
                      setRationState((prev) => ({
                        ...prev,
                        people: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl bg-black border border-[#262626] font-mono text-sm text-[#F5F5F5] tabular-nums focus:outline-none focus:border-[#FFB300]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="calc-water"
                    className="block text-xs text-[#A3A3A3] mb-1"
                  >
                    Water (Liters)
                  </label>
                  <input
                    id="calc-water"
                    type="number"
                    min={0}
                    step={0.5}
                    value={rationState.waterLiters}
                    onChange={(e) =>
                      setRationState((prev) => ({
                        ...prev,
                        waterLiters: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl bg-black border border-[#262626] font-mono text-sm text-[#F5F5F5] tabular-nums focus:outline-none focus:border-[#FFB300]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="calc-food"
                      className="text-xs text-[#A3A3A3]"
                    >
                      Food Supply
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRationState((prev) => ({
                          ...prev,
                          foodUnit: prev.foodUnit === 'kcal' ? 'days' : 'kcal',
                          foodAmount:
                            prev.foodUnit === 'kcal'
                              ? Math.max(
                                  1,
                                  Math.round(prev.foodAmount / 2000)
                                )
                              : Math.max(1000, prev.foodAmount * 2000),
                        }))
                      }
                      className="text-[11px] font-semibold text-[#FFB300] hover:underline cursor-pointer"
                    >
                      {rationState.foodUnit === 'kcal'
                        ? 'Switch to Person-Days'
                        : 'Switch to kcal'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="calc-food"
                      type="number"
                      min={0}
                      step={rationState.foodUnit === 'kcal' ? 500 : 1}
                      value={rationState.foodAmount}
                      onChange={(e) =>
                        setRationState((prev) => ({
                          ...prev,
                          foodAmount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[44px] pl-3 pr-14 rounded-xl bg-black border border-[#262626] font-mono text-sm text-[#F5F5F5] tabular-nums focus:outline-none focus:border-[#FFB300]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#737373]">
                      {rationState.foodUnit === 'kcal' ? 'kcal' : 'p-days'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity tier selector */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(Object.keys(ACTIVITY_NEEDS) as ActivityTier[]).map((tierKey) => {
                  const t = ACTIVITY_NEEDS[tierKey];
                  const active = rationState.activity === tierKey;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() =>
                        setRationState((prev) => ({ ...prev, activity: tierKey }))
                      }
                      className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-[#171200] border-[#FFB300] text-[#F5F5F5]'
                          : 'bg-black border-[#222222] text-[#A3A3A3]'
                      }`}
                    >
                      <div className="text-[11px] font-semibold truncate">
                        {t.label}
                      </div>
                      <div className="font-mono text-[10px] text-[#737373] tabular-nums">
                        {t.litersPerPersonDay}L · {t.kcalPerPersonDay} kcal
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Calculated Survival Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 pt-4 border-t border-[#1E1E1E]">
                <div className="rounded-xl bg-black border border-[#222222] p-3">
                  <div className="text-[11px] text-[#737373]">Water Horizon</div>
                  <div
                    className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                      rationResults.waterDays < 3
                        ? 'text-[#FF3B30]'
                        : 'text-[#FFB300]'
                    }`}
                  >
                    {rationResults.waterDays.toFixed(1)}d
                  </div>
                  <div className="font-mono text-[10px] text-[#737373] tabular-nums mt-0.5">
                    {rationResults.dailyWaterNeed.toFixed(1)} L/day group
                  </div>
                </div>

                <div className="rounded-xl bg-black border border-[#222222] p-3">
                  <div className="text-[11px] text-[#737373]">Food Horizon</div>
                  <div
                    className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                      rationResults.foodDays < 3
                        ? 'text-[#FF3B30]'
                        : 'text-[#F5F5F5]'
                    }`}
                  >
                    {rationResults.foodDays.toFixed(1)}d
                  </div>
                  <div className="font-mono text-[10px] text-[#737373] tabular-nums mt-0.5">
                    {rationResults.dailyKcalNeed.toLocaleString()} kcal/day
                  </div>
                </div>

                <div className="rounded-xl bg-black border border-[#222222] p-3">
                  <div className="text-[11px] text-[#737373]">
                    Limiting Factor
                  </div>
                  <div
                    className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                      rationResults.limitingDays < 3
                        ? 'text-[#FF3B30]'
                        : 'text-[#FFB300]'
                    }`}
                  >
                    {rationResults.limitingDays.toFixed(1)}d
                  </div>
                  <div className="text-[10px] text-[#A3A3A3] mt-0.5">
                    {rationResults.bottleneck === 'Balanced'
                      ? 'Balanced supply'
                      : `${rationResults.bottleneck} runs out first`}
                  </div>
                </div>
              </div>
            </section>
            </div>

            {/* Persistent Bug-Out Bag Checklist */}
            <div className="lg:col-span-7">
            <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                    Bug-Out Bag Checklist
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A3A3A3] font-mono tabular-nums">
                    {checkedCount} / {items.length} packed · {readinessPct}% ready
                  </p>
                </div>

                {confirmReset ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetChecklist}
                      className="min-h-[36px] px-3 rounded-lg bg-[#FF3B30] text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-[#1A1A1A] text-xs text-[#A3A3A3] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="min-h-[36px] px-3 rounded-lg border border-[#262626] text-xs text-[#A3A3A3] hover:text-[#FFB300] hover:border-[#FFB300] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset List</span>
                  </button>
                )}
              </div>

              <div className="mt-3 w-full h-2.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    readinessPct === 100 ? 'bg-[#00E676]' : 'bg-[#FFB300]'
                  }`}
                  style={{ width: `${readinessPct}%` }}
                />
              </div>

              <div className="mt-4 flex items-center gap-1 p-1 rounded-xl bg-black border border-[#222222] self-start">
                {(
                  [
                    { id: 'all', label: `All (${items.length})` },
                    {
                      id: 'unpacked',
                      label: `Remaining (${items.length - checkedCount})`,
                    },
                    { id: 'packed', label: `Packed (${checkedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBagFilter(f.id)}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      bagFilter === f.id
                        ? 'bg-[#FFB300] text-black'
                        : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleAddBagItem}
                className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-2"
              >
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Add gear item (e.g., Hand-Crank Radio)"
                  className="sm:col-span-6 min-h-[44px] px-3 rounded-xl bg-black border border-[#262626] text-sm text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
                />
                <select
                  aria-label="Gear category"
                  value={newItemCategory}
                  onChange={(e) =>
                    setNewItemCategory(e.target.value as BugOutItem['category'])
                  }
                  className="sm:col-span-3 min-h-[44px] px-2.5 rounded-xl bg-black border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                >
                  <option value="Water">Water</option>
                  <option value="Medical">Medical</option>
                  <option value="Fire & Shelter">Fire & Shelter</option>
                  <option value="Tools & Signal">Tools & Signal</option>
                  <option value="Food & Nav">Food & Nav</option>
                </select>
                <div className="sm:col-span-3 flex gap-2">
                  <input
                    type="text"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder="Qty"
                    className="w-16 sm:flex-1 min-h-[44px] px-2.5 rounded-xl bg-black border border-[#262626] text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                  />
                  <button
                    type="submit"
                    disabled={!newItemName.trim()}
                    className="flex-1 sm:flex-none min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#FFB300] text-black font-bold flex items-center justify-center hover:bg-[#FFC433] disabled:opacity-40 transition cursor-pointer"
                    aria-label="Add item to Bug-Out Bag"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="mt-4 divide-y divide-[#1A1A1A] max-h-[380px] overflow-y-auto pr-1">
                {filteredItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#737373]">
                    {bagFilter === 'unpacked'
                      ? 'All Bug-Out Bag essentials are packed and accounted for.'
                      : 'No items in this filter.'}
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleBagItem(item.id)}
                        className="flex-1 min-h-[44px] flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <span
                          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition ${
                            item.checked
                              ? 'bg-[#FFB300] border-[#FFB300] text-black'
                              : 'bg-black border-[#3A3A3A] group-hover:border-[#FFB300]'
                          }`}
                        >
                          {item.checked && (
                            <Check className="w-4 h-4 stroke-[3]" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-medium leading-snug ${
                              item.checked
                                ? 'line-through text-[#666666]'
                                : 'text-[#F5F5F5]'
                            }`}
                          >
                            {item.label}
                          </div>
                          <div className="text-[11px] text-[#737373] mt-0.5 flex items-center gap-1.5">
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-[#A3A3A3]">
                              {item.qty}
                            </span>
                          </div>
                        </div>
                      </button>

                      {item.custom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBagItem(item.id)}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#737373] hover:text-[#FF3B30] transition cursor-pointer shrink-0"
                          aria-label={`Remove ${item.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: MANUAL & KNOTS */}
        {activeSubTab === 'manual' && (
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-[#FFB300] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                  Field Survival Manual
                </h2>
                <p className="text-xs text-[#A3A3A3]">
                  100% offline reference · Water Purification, First Aid &
                  Trauma, Fire Starting, Shelter, Navigation
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search manual: bleach, tourniquet, Polaris..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-black border border-[#262626] text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
              />
            </div>
          </div>

          {/* Interactive Visual Survival Blueprints (Tactical SVG Step Diagrams) */}
          <div className="mt-4">
            <SurvivalBlueprints />
          </div>

          <div className="mt-5 divide-y divide-[#1D1D1D] border-t border-[#1D1D1D]">
            {filteredManualSections.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#737373]">
                No field manual entry matched &ldquo;{manualQuery}&rdquo;.
              </p>
            ) : (
              filteredManualSections.map((section) => {
                const isOpen =
                  manualQuery.trim().length > 0 ||
                  openManualIds.includes(section.id);
                return (
                  <div key={section.id} className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleManualSection(section.id)}
                      aria-expanded={isOpen}
                      className="w-full min-h-[54px] py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-xl font-bold tracking-wide text-[#F5F5F5] group-hover:text-[#FFB300] transition">
                          {section.category}
                        </div>
                        <div className="text-xs text-[#737373]">
                          {section.summary} · {section.guides.length} guides
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-[#A3A3A3] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#FFB300]' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {section.guides.map((guide) => (
                          <article
                            key={guide.title}
                            className="rounded-xl bg-black border border-[#222222] p-4"
                          >
                            <h3 className="text-sm font-bold text-[#FFB300]">
                              {guide.title}
                            </h3>
                            <ol className="mt-2.5 space-y-2 text-xs text-[#E5E5E5] leading-relaxed">
                              {guide.steps.map((step, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span className="font-mono text-[11px] text-[#737373] font-semibold mt-0.5 shrink-0">
                                    {String(idx + 1).padStart(2, '0')}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                            {guide.warning && (
                              <p className="mt-3 pt-2.5 border-t border-[#1F1F1F] text-[11px] text-[#FF3B30] font-medium leading-relaxed">
                                Warning: {guide.warning}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
        )}
      </div>

      {/* Full-Screen Bright White Screen Lamp Fallback Overlay */}
      {screenLampOpen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-end p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen white emergency lamp"
        >
          <button
            type="button"
            onClick={() => {
              setScreenLampOpen(false);
              if (torchHardwareAvailable === false) {
                setFlashlightOn(false);
              }
            }}
            className="min-h-[54px] px-8 rounded-2xl bg-black text-white font-bold text-sm flex items-center gap-2 shadow-2xl cursor-pointer"
          >
            <X className="w-5 h-5" />
            <span>Close Screen Lamp</span>
          </button>
        </div>
      )}

      {/* Full-Screen Red/White Emergency Strobe Overlay */}
      {strobeActive && (
        <div
          onClick={() => setStrobeActive(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-end p-8 select-none cursor-pointer"
          style={{ backgroundColor: strobeBg }}
          role="dialog"
          aria-modal="true"
          aria-label="Emergency strobe active. Tap anywhere to exit."
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStrobeActive(false);
            }}
            className="min-h-[56px] px-8 rounded-2xl bg-black/90 border-2 border-[#FFB300] text-[#FFB300] font-bold text-base flex items-center gap-2.5 shadow-2xl cursor-pointer"
          >
            <X className="w-5 h-5" />
            <span>TAP TO STOP STROBE</span>
          </button>
        </div>
      )}

      {/* Pure #000000 OLED Blackout Screen Overlay (Keeps Torch / SOS / 3kHz Whistle Running) */}
      {oledBlackout && (
        <div
          onClick={() => setOledBlackout(false)}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-8 select-none cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="OLED Blackout Screen active. Tap anywhere to wake display."
        >
          <div className="text-[11px] font-mono text-[#3A1A00] uppercase tracking-widest text-center">
            OLED BLACKOUT ·{' '}
            {[
              flashlightOn ? 'TORCH ON' : null,
              whistleActive ? '3kHz WHISTLE ON' : null,
              sosActive ? `SOS ${sosLabel}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'STANDBY'}
          </div>
          <div className="text-xs font-mono text-[#2E2E2E]">
            Tap anywhere to wake screen
          </div>
        </div>
      )}
    </>
  );
};
