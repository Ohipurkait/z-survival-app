import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  Copy,
  Download,
  Droplets,
  Flame,
  HeartPulse,
  Leaf,
  Moon,
  ScanEye,
  Search,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import { OfflineCameraScannerModal } from '../OfflineCameraScannerModal';
import { localVisionService } from '../../services/localVisionService';
import {
  OFFLINE_PROTOCOLS,
  QUICK_PROTOCOLS,
  getProtocolById,
  queryOfflineRuleEngine,
  searchOfflineProtocols,
  type ProtocolCategory,
  type QuickSurvivalProtocol,
  type SurvivalProtocol,
} from '../../data/survivalRuleEngine';
import {
  LOCAL_MODEL_OPTIONS,
  localLLMService,
  type LocalModelOption,
} from '../../services/localLLMService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'rule-engine' | 'local-ai';
  timestamp: string;
}

const CHAT_STORAGE_KEY = 'apex_medic_chat_v1';

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const PROTOCOL_ICONS: Record<string, React.ReactNode> = {
  'purify-water': <Droplets className="w-4 h-4 text-[#FFB300] shrink-0" />,
  'deep-wound': <HeartPulse className="w-4 h-4 text-[#FF3B30] shrink-0" />,
  'edible-plants': <Leaf className="w-4 h-4 text-[#FFB300] shrink-0" />,
  'start-fire': <Flame className="w-4 h-4 text-[#FFB300] shrink-0" />,
};

const CATEGORIES: Array<'All' | ProtocolCategory> = [
  'All',
  'Trauma & Bleeding',
  'Medical & Illness',
  'Environmental',
  'Water & Food',
  'Fire, Shelter & Field',
];

export const AIMedicTab: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<LocalModelOption>(
    LOCAL_MODEL_OPTIONS[0]
  );
  const [webGpuStatus, setWebGpuStatus] = useState<
    'checking' | 'supported' | 'unsupported'
  >('checking');
  const [webGpuReason, setWebGpuReason] = useState<string | null>(null);

  const [engineState, setEngineState] = useState<
    'idle' | 'downloading' | 'ready' | 'sleeping' | 'error'
  >(localLLMService.isLoaded() ? 'ready' : 'idle');
  const [isCachedLocally, setIsCachedLocally] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadDetail, setDownloadDetail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(120);
  const lastActivityRef = useRef<number>(Date.now());
  const [aiSetupExpanded, setAiSetupExpanded] = useState<boolean>(
    () => !localLLMService.isLoaded() && !localLLMService.getSavedModelId()
  );

  // 62-Protocol Offline Rule-Engine Search
  const [protocolSearch, setProtocolSearch] = useState('');
  const [protocolCategory, setProtocolCategory] =
    useState<'All' | ProtocolCategory>('All');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        source: 'rule-engine',
        timestamp: formatTime(),
        content: `Z SURVIVAL FIELD MEDIC READY (${OFFLINE_PROTOCOLS.length} OFFLINE PROTOCOLS ACTIVE)

Tap any quick guide, open the Offline Camera Scanner, search the ${OFFLINE_PROTOCOLS.length}-protocol Rule-Engine, or ask any trauma/survival question for instant zero-network instructions.

On WebGPU-capable phones and laptops, expand "Local AI Brain" to cache a local quantized LLM directly in IndexedDB for Airplane Mode reasoning.`,
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const endOfChatRef = useRef<HTMLDivElement | null>(null);

  // Proactive WebGPU capability check on mount
  useEffect(() => {
    let active = true;
    localLLMService.verifyWebGPUAdapter().then((res) => {
      if (!active) return;
      if (res.supported) {
        setWebGpuStatus('supported');
        setWebGpuReason(null);
      } else {
        setWebGpuStatus('unsupported');
        setWebGpuReason(
          res.reason ||
            'WebGPU is unavailable on this browser. The built-in 62-protocol Offline Rule-Engine is active and requires zero download.'
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (webGpuStatus !== 'unsupported') {
      localLLMService.isModelCached(selectedModel).then((cached) => {
        if (active) setIsCachedLocally(cached);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedModel, webGpuStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isGenerating]);

  const filteredProtocols = useMemo(() => {
    const base = protocolSearch.trim()
      ? searchOfflineProtocols(protocolSearch)
      : OFFLINE_PROTOCOLS;
    if (protocolCategory === 'All') return base;
    return base.filter((p) => p.category === protocolCategory);
  }, [protocolSearch, protocolCategory]);

  const handleSleepAiNow = async () => {
    await localLLMService.unload();
    await localVisionService.unload();
    setEngineState('sleeping');
  };

  // AI Medic Auto-Sleep: unload WebLLM / Vision from GPU & RAM after 2 min (120s) inactivity
  useEffect(() => {
    if (engineState !== 'ready' || isGenerating) return;
    lastActivityRef.current = Date.now();
    setSleepRemainingSec(120);

    const intervalId = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, 120 - elapsedSec);
      setSleepRemainingSec(remaining);
      if (remaining <= 0) {
        window.clearInterval(intervalId);
        handleSleepAiNow();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [engineState, isGenerating]);

  const handleDownloadBrain = async () => {
    if (webGpuStatus === 'unsupported') return;
    setErrorMessage(null);
    setEngineState('downloading');
    setDownloadProgress(2);
    setDownloadDetail('Checking WebGPU & preparing local cache...');
    try {
      await localLLMService.loadModel(selectedModel, (pct, text) => {
        setDownloadProgress(pct);
        setDownloadDetail(text);
      });
      lastActivityRef.current = Date.now();
      setSleepRemainingSec(120);
      setEngineState('ready');
      setIsCachedLocally(true);
      setAiSetupExpanded(false);
    } catch (err) {
      setEngineState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to load local AI brain. Offline Rule-Engine remains 100% active.'
      );
    }
  };

  const openProtocolInChat = (protocol: SurvivalProtocol) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: protocol.title,
      source: 'rule-engine',
      timestamp: formatTime(),
    };
    const assistantMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      content: protocol.response,
      source: 'rule-engine',
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  };

  const submitQuery = async (
    promptText: string,
    quickProtocol?: QuickSurvivalProtocol
  ) => {
    const clean = promptText.trim();
    if (!clean || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      source: engineState === 'ready' ? 'local-ai' : 'rule-engine',
      timestamp: formatTime(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    lastActivityRef.current = Date.now();
    setSleepRemainingSec(120);

    if (engineState === 'ready' && localLLMService.isLoaded()) {
      const assistantId = `a-${Date.now() + 1}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          source: 'local-ai',
          timestamp: formatTime(),
        },
      ]);
      setIsGenerating(true);

      try {
        await localLLMService.streamAnswer(
          nextHistory.map((m) => ({ role: m.role, content: m.content })),
          (streamedText) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: streamedText } : m
              )
            );
          }
        );
      } catch {
        const direct = quickProtocol
          ? getProtocolById(quickProtocol.protocolId)?.response
          : undefined;
        const fallback = direct || queryOfflineRuleEngine(clean);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fallback, source: 'rule-engine' }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const directProtocol = quickProtocol
      ? getProtocolById(quickProtocol.protocolId)
      : undefined;
    const ruleAnswer = directProtocol
      ? directProtocol.response
      : queryOfflineRuleEngine(clean);

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      content: ruleAnswer,
      source: 'rule-engine',
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleStopGenerating = async () => {
    await localLLMService.interrupt();
    setIsGenerating(false);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        source: engineState === 'ready' ? 'local-ai' : 'rule-engine',
        timestamp: formatTime(),
        content:
          engineState === 'ready'
            ? 'Field log cleared. Local AI Medic Brain is active offline.'
            : `Field log cleared. All ${OFFLINE_PROTOCOLS.length} offline survival protocols are active.`,
      },
    ]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Local AI Brain Installer / Graceful WebGPU Fallback + 62-Protocol Search */}
      <aside className="lg:col-span-5 space-y-4">
        {/* Collapsible Local AI Brain Setup Card (Auto-collapses once installed/cached) */}
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4">
          <button
            type="button"
            onClick={() => setAiSetupExpanded((v) => !v)}
            aria-expanded={aiSetupExpanded}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Brain
                className={`w-5 h-5 shrink-0 ${
                  engineState === 'ready' || isCachedLocally
                    ? 'text-[#00E676]'
                    : 'text-[#FFB300]'
                }`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h1 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
                    Local AI Brain
                  </h1>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      engineState === 'ready' || isCachedLocally
                        ? 'text-[#00E676]'
                        : 'text-[#FFB300]'
                    }`}
                  >
                    {engineState === 'ready'
                      ? 'ACTIVE · OFFLINE'
                      : engineState === 'sleeping'
                        ? 'SLEEPING (CACHED)'
                        : engineState === 'downloading'
                          ? `${downloadProgress}%`
                          : isCachedLocally
                            ? 'CACHED'
                            : webGpuStatus === 'unsupported'
                              ? 'RULE-ENGINE'
                              : 'OPTIONAL'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] truncate">
                  {engineState === 'ready'
                    ? `${selectedModel.label} · Auto-sleep ${Math.floor(sleepRemainingSec / 60)}:${String(sleepRemainingSec % 60).padStart(2, '0')}`
                    : `${OFFLINE_PROTOCOLS.length} offline medical & survival protocols active`}
                </p>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-[#A3A3A3] shrink-0 transition-transform ${
                aiSetupExpanded ? 'rotate-180 text-[#FFB300]' : ''
              }`}
            />
          </button>

          {/* Compact 1-tap Wake / Sleep strip when collapsed & sleeping */}
          {!aiSetupExpanded && engineState === 'sleeping' && (
            <button
              type="button"
              onClick={handleDownloadBrain}
              className="mt-3 w-full min-h-[42px] px-3 rounded-xl bg-[#FFB300] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 shrink-0" />
              <span>Wake AI Brain (From Local Cache)</span>
            </button>
          )}

          {aiSetupExpanded && (
            <div className="mt-3.5 pt-3.5 border-t border-[#1D1D1D]">
              {webGpuStatus === 'unsupported' ? (
                <div className="rounded-xl bg-[#161000] border border-[#FFB300]/45 p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#FFB300] shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-[#F5F5F5]">
                      <div className="font-bold text-[#FFB300]">
                        WebGPU Unavailable — Offline Rule-Engine Mode
                      </div>
                      <p className="mt-1 text-[#D4D4D4]">{webGpuReason}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Model selector cards — clean wrapping, zero "..." truncation */}
                  <div className="grid grid-cols-2 gap-2">
                    {LOCAL_MODEL_OPTIONS.map((opt) => {
                      const active = selectedModel.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={engineState === 'downloading'}
                          onClick={() => setSelectedModel(opt)}
                          className={`min-h-[58px] px-3 py-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                            active
                              ? 'bg-[#171200] border-[#FFB300] text-[#F5F5F5]'
                              : 'bg-black border-[#222222] text-[#A3A3A3] hover:border-[#3A3A3A]'
                          } disabled:opacity-50`}
                        >
                          <div className="text-xs font-bold leading-snug break-words text-[#F5F5F5]">
                            {opt.label}
                          </div>
                          <div className="font-mono text-[11px] text-[#A3A3A3] tabular-nums mt-1">
                            {opt.sizeLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Primary Download / Wake AI Brain CTA */}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBrain}
                      disabled={
                        engineState === 'downloading' ||
                        webGpuStatus === 'checking'
                      }
                      className={`flex-1 min-h-[46px] px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                        engineState === 'ready'
                          ? 'bg-black border border-[#00E676] text-[#00E676]'
                          : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
                      } disabled:opacity-65`}
                    >
                      {engineState === 'ready' ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>AI Brain Ready Offline</span>
                        </>
                      ) : engineState === 'sleeping' ? (
                        <>
                          <Moon className="w-4 h-4 shrink-0" />
                          <span>Wake AI (From Cache)</span>
                        </>
                      ) : engineState === 'downloading' ? (
                        <>
                          <Download className="w-4 h-4 shrink-0" />
                          <span className="font-mono tabular-nums">
                            Installing ({downloadProgress}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 shrink-0" />
                          <span>
                            {isCachedLocally
                              ? 'Load Cached AI Brain'
                              : 'Download & Install AI Brain'}
                          </span>
                        </>
                      )}
                    </button>

                    {engineState === 'ready' && (
                      <button
                        type="button"
                        onClick={handleSleepAiNow}
                        className="min-h-[46px] px-3 rounded-xl bg-black border border-[#2C2C2C] text-xs font-semibold text-[#A3A3A3] hover:border-[#FFB300] hover:text-[#FFB300] flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                        title="Unload AI from GPU/RAM immediately to save battery"
                      >
                        <Moon className="w-3.5 h-3.5 shrink-0" />
                        <span>Sleep</span>
                      </button>
                    )}
                  </div>

                  {engineState === 'ready' && (
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#737373] tabular-nums">
                      <span>Auto-sleep frees GPU/RAM when idle</span>
                      <span className="text-[#00E676]">
                        {Math.floor(sleepRemainingSec / 60)}:
                        {String(sleepRemainingSec % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  {engineState === 'sleeping' && (
                    <p className="mt-2 text-[11px] text-[#A3A3A3]">
                      AI Brain unloaded after inactivity to save battery. Tap{' '}
                      <strong className="text-[#FFB300]">Wake AI</strong> anytime
                      to reload locally with zero internet.
                    </p>
                  )}

                  {engineState === 'downloading' && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#A3A3A3] truncate pr-2">
                          {downloadDetail || 'Downloading from HuggingFace CDN...'}
                        </span>
                        <span className="font-mono text-[#FFB300] font-semibold tabular-nums shrink-0">
                          {downloadProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                        <div
                          className="h-full bg-[#FFB300] transition-all duration-200"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="mt-3 rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3 flex items-start gap-2.5 text-xs text-[#F5F5F5]">
                      <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{errorMessage}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* Instant Quick Survival Buttons */}
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-wide text-[#F5F5F5]">
              Instant Field Guides
            </h2>
            <span className="text-xs text-[#737373]">1-tap emergency</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {QUICK_PROTOCOLS.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                onClick={() => submitQuery(protocol.prompt, protocol)}
                disabled={isGenerating}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-left flex items-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                  protocol.severity === 'critical'
                    ? 'bg-[#160505] border-[#FF3B30]/50 hover:border-[#FF3B30] text-[#F5F5F5]'
                    : 'bg-black border-[#242424] hover:border-[#FFB300] text-[#F5F5F5]'
                } disabled:opacity-50`}
              >
                {PROTOCOL_ICONS[protocol.id]}
                <span className="text-xs font-semibold leading-tight">
                  {protocol.label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="mt-2.5 w-full min-h-[48px] px-4 rounded-xl bg-[#171200] border border-[#FFB300] text-[#FFB300] hover:bg-[#FFB300] hover:text-black text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <ScanEye className="w-4 h-4 shrink-0" />
            <span>Scan Object / Plant / Wound (Offline AI Camera)</span>
          </button>
        </section>

        {/* Searchable 62-Protocol Offline Rule-Engine Index */}
        <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#FFB300] shrink-0" />
              <h2 className="font-display text-lg font-bold tracking-wide text-[#F5F5F5]">
                Offline Protocol Search
              </h2>
            </div>
            <span className="font-mono text-xs text-[#FFB300] tabular-nums">
              {filteredProtocols.length}/{OFFLINE_PROTOCOLS.length}
            </span>
          </div>

          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={protocolSearch}
              onChange={(e) => setProtocolSearch(e.target.value)}
              placeholder="Search 62 protocols: snakebite, chest, ORS, knots..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-black border border-[#262626] text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
            />
          </div>

          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setProtocolCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  protocolCategory === cat
                    ? 'bg-[#FFB300] text-black font-bold'
                    : 'bg-black border border-[#222222] text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-2.5 max-h-[240px] overflow-y-auto divide-y divide-[#181818]">
            {filteredProtocols.length === 0 ? (
              <p className="py-5 text-center text-xs text-[#737373]">
                No protocol matched &ldquo;{protocolSearch}&rdquo;. Try broader
                keywords like bleed, water, burn, cold, or fire.
              </p>
            ) : (
              filteredProtocols.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProtocolInChat(p)}
                  className="w-full py-2.5 px-1 text-left flex items-center justify-between gap-2 hover:bg-[#121212] transition cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#FFB300] truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-[#737373]">
                      {p.category}
                      {p.severity === 'critical' && (
                        <span className="text-[#FF3B30]"> · Critical</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#737373] group-hover:text-[#FFB300] shrink-0">
                    Open
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </aside>

      {/* Right Column: Tactical Field Chat Terminal */}
      <section className="lg:col-span-7 flex flex-col rounded-2xl bg-[#0A0A0A] border border-[#222222] min-h-[480px] lg:min-h-[680px] max-h-[82dvh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
          <div className="text-xs text-[#A3A3A3] flex items-center gap-2">
            <span className="font-semibold text-[#F5F5F5]">Field Medic Log</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#FFB300]">
              {engineState === 'ready'
                ? 'Local WebLLM'
                : `${OFFLINE_PROTOCOLS.length}-Protocol Rule-Engine`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearChat}
            className="min-h-[36px] px-2.5 rounded-lg text-xs text-[#A3A3A3] hover:text-[#FF3B30] hover:bg-[#171717] flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Messages stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 text-[11px] text-[#737373] mb-1 px-1">
                  <span>
                    {isUser
                      ? 'You'
                      : msg.source === 'local-ai'
                        ? 'Z Survival AI'
                        : 'Offline Rule-Engine'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[94%] sm:max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#FFB300] text-black font-medium'
                      : 'bg-black border border-[#242424] text-[#F5F5F5]'
                  }`}
                >
                  {msg.content || (isGenerating ? 'Analyzing field protocol...' : '')}
                  {!isUser && msg.content && (
                    <div className="mt-3 pt-2 border-t border-[#1A1A1A] flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#FFB300] transition cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#FFB300]" />
                            <span className="text-[#FFB300]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy steps</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endOfChatRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(input);
          }}
          className="p-3 border-t border-[#222222] bg-black/60 rounded-b-2xl flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="min-h-[46px] min-w-[46px] rounded-xl bg-[#121212] border border-[#2A2A2A] text-[#FFB300] hover:border-[#FFB300] flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Scan Object, Plant, or Wound with Offline Camera"
            title="Offline Camera Scanner"
          >
            <ScanEye className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask medic: sucking chest wound, snakebite, ORS, fallout..."
            className="flex-1 min-h-[46px] px-3.5 rounded-xl bg-[#0F0F0F] border border-[#262626] text-sm text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={handleStopGenerating}
              className="min-h-[46px] min-w-[46px] px-4 rounded-xl bg-[#FF3B30] text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#FF5247] transition cursor-pointer shrink-0"
              aria-label="Stop generating"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="min-h-[46px] min-w-[46px] px-4 rounded-xl bg-[#FFB300] text-black font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-[#FFC433] disabled:opacity-40 transition cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          )}
        </form>
      </section>

      <OfflineCameraScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSendReportToMedic={(promptTitle, reportBody) => {
          const userMsg: ChatMessage = {
            id: `u-scan-${Date.now()}`,
            role: 'user',
            content: promptTitle,
            source: 'rule-engine',
            timestamp: formatTime(),
          };
          const assistantMsg: ChatMessage = {
            id: `a-scan-${Date.now() + 1}`,
            role: 'assistant',
            content: reportBody,
            source: 'rule-engine',
            timestamp: formatTime(),
          };
          setMessages((prev) => [...prev, userMsg, assistantMsg]);
        }}
      />
    </div>
  );
};
