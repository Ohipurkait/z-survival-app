import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Languages,
  Maximize2,
  Moon,
  Search,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import {
  EMERGENCY_PHRASES,
  INDIC_LANGUAGES,
  LANGUAGE_BY_CODE,
  SUPPORTED_LANGUAGES,
  type IndicLanguageCode,
  type LanguageCode,
  type PhraseCategory,
} from '../../data/emergencyPhrases';
import {
  UNIFIED_TRANSLATOR_MODEL_ID,
  localTranslatorService,
  speakText,
} from '../../services/localTranslatorService';

interface FlashCardState {
  nativeText: string;
  romanText?: string;
  englishText: string;
  langCode: LanguageCode;
  urgent?: boolean;
}

export const TranslatorTab: React.FC = () => {
  // Unified NLLB-200 bidirectional language selector
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en');
  const [targetLang, setTargetLang] = useState<LanguageCode>('hi');

  const [isLoaded, setIsLoaded] = useState<boolean>(() =>
    localTranslatorService.isLoaded()
  );
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [sleepSecLeft, setSleepSecLeft] = useState<number>(120);
  const lastActivityRef = useRef<number>(Date.now());
  const [isCached, setIsCached] = useState<boolean>(() =>
    localTranslatorService.isUnifiedModelCached()
  );
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloadDetail, setDownloadDetail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSleepTranslator = async () => {
    await localTranslatorService.unload();
    setIsLoaded(false);
    setIsSleeping(true);
  };

  // Auto-sleep Transformers.js NLLB-200 model after 2 minutes idle to free RAM/battery
  useEffect(() => {
    if (!isLoaded || isTranslating) return;
    lastActivityRef.current = Date.now();
    setSleepSecLeft(120);

    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const rem = Math.max(0, 120 - elapsed);
      setSleepSecLeft(rem);
      if (rem <= 0) {
        window.clearInterval(id);
        handleSleepTranslator();
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [isLoaded, isTranslating]);

  // Pan-India Phraseboard state
  const [phraseLang, setPhraseLang] = useState<IndicLanguageCode>('hi');
  const [phraseCategory, setPhraseCategory] = useState<'all' | PhraseCategory>(
    'all'
  );
  const [phraseSearch, setPhraseSearch] = useState('');
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Full-screen "Show Card" visual communication modal
  const [activeCard, setActiveCard] = useState<FlashCardState | null>(null);
  const [cardDaylightMode, setCardDaylightMode] = useState(false);

  const filteredPhrases = useMemo(() => {
    const q = phraseSearch.trim().toLowerCase();
    return EMERGENCY_PHRASES.filter((p) => {
      if (phraseCategory !== 'all' && p.category !== phraseCategory) {
        return false;
      }
      if (!q) return true;
      const entry = p.translations[phraseLang];
      return (
        p.en.toLowerCase().includes(q) ||
        entry.native.toLowerCase().includes(q) ||
        entry.roman.toLowerCase().includes(q)
      );
    });
  }, [phraseCategory, phraseSearch, phraseLang]);

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText('');
    }
    setErrorMsg(null);
  };

  const handleDownloadUnifiedPack = async () => {
    if (downloading) return;
    setErrorMsg(null);
    setDownloading(true);
    setDownloadPct(2);
    setDownloadDetail('Preparing Pan-India NLLB-200 quantized pack...');
    try {
      await localTranslatorService.loadUnifiedModel((pct, detail) => {
        setDownloadPct(pct);
        setDownloadDetail(detail);
      });
      lastActivityRef.current = Date.now();
      setSleepSecLeft(120);
      setIsLoaded(true);
      setIsSleeping(false);
      setIsCached(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to download unified NLLB-200 pack. Check connection for initial cache.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleTranslate = async () => {
    const clean = sourceText.trim();
    if (!clean || isTranslating) return;
    if (sourceLang === targetLang) {
      setTranslatedText(clean);
      return;
    }

    setErrorMsg(null);
    setIsTranslating(true);
    try {
      if (!localTranslatorService.isLoaded()) {
        if (isCached) {
          setDownloading(true);
          await localTranslatorService.loadUnifiedModel((pct, detail) => {
            setDownloadPct(pct);
            setDownloadDetail(detail);
          });
          setDownloading(false);
          lastActivityRef.current = Date.now();
          setSleepSecLeft(120);
          setIsLoaded(true);
          setIsSleeping(false);
        } else {
          throw new Error(
            'Tap "Download Pan-India Offline Translator" first to cache the unified 12-language model locally.'
          );
        }
      }

      lastActivityRef.current = Date.now();
      setSleepSecLeft(120);
      const result = await localTranslatorService.translate(
        sourceLang,
        targetLang,
        clean
      );
      setTranslatedText(result);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Local offline translation failed.'
      );
    } finally {
      setIsTranslating(false);
      setDownloading(false);
    }
  };

  const handleSpeak = (id: string, text: string, lang: LanguageCode) => {
    if (!text.trim()) return;
    const speechCode = LANGUAGE_BY_CODE[lang].speechCode;
    const res = speakText(text, speechCode, speechRate);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSpeakingId(id);
    setTimeout(() => {
      setSpeakingId((prev) => (prev === id ? null : prev));
    }, 2600);
  };

  const handleCopyOutput = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const activePhraseLangMeta = LANGUAGE_BY_CODE[phraseLang];

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Unified 12-Language Pan-India Offline AI Translator */}
        <section className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                  Pan-India AI Translator
                </h1>
                <p className="mt-1 text-xs text-[#A3A3A3]">
                  1 unified offline pack · English + 11 Indian languages (NLLB-200)
                </p>
              </div>
              <Languages className="w-6 h-6 text-[#FFB300] shrink-0" />
            </div>

            {/* Bidirectional Language Pickers + Swap */}
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select
                aria-label="Source language"
                value={sourceLang}
                onChange={(e) => {
                  const next = e.target.value as LanguageCode;
                  setSourceLang(next);
                  if (next === targetLang) {
                    setTargetLang(next === 'en' ? 'hi' : 'en');
                  }
                  setErrorMsg(null);
                }}
                disabled={downloading}
                className="w-full min-h-[46px] px-2.5 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                    {lang.code !== 'en' ? ` (${lang.nativeName})` : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSwapLanguages}
                disabled={downloading}
                className="min-h-[46px] min-w-[44px] rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#FFB300] flex items-center justify-center hover:border-[#FFB300] transition cursor-pointer shrink-0"
                aria-label="Swap source and target languages"
                title="Swap languages"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <select
                aria-label="Target language"
                value={targetLang}
                onChange={(e) => {
                  const next = e.target.value as LanguageCode;
                  setTargetLang(next);
                  if (next === sourceLang) {
                    setSourceLang(next === 'en' ? 'hi' : 'en');
                  }
                  setErrorMsg(null);
                }}
                disabled={downloading}
                className="w-full min-h-[46px] px-2.5 rounded-xl bg-black border border-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                    {lang.code !== 'en' ? ` (${lang.nativeName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Single Unified Offline Download / Wake Translator CTA */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleDownloadUnifiedPack}
                disabled={downloading}
                className={`flex-1 min-h-[48px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                  isLoaded
                    ? 'bg-[#121212] border border-[#FFB300] text-[#FFB300]'
                    : 'bg-[#FFB300] text-black hover:bg-[#FFC433]'
                } disabled:opacity-65`}
              >
                {isLoaded ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>All 12 Languages Ready</span>
                  </>
                ) : isSleeping ? (
                  <>
                    <Moon className="w-4 h-4 shrink-0" />
                    <span>Wake Translator (From Cache)</span>
                  </>
                ) : downloading ? (
                  <>
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="font-mono tabular-nums">
                      Caching Pack ({downloadPct}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0" />
                    <span>
                      {isCached
                        ? 'Load Cached Pan-India Translator'
                        : 'Download Pan-India Offline Translator'}
                    </span>
                  </>
                )}
              </button>

              {isLoaded && (
                <button
                  type="button"
                  onClick={handleSleepTranslator}
                  className="min-h-[48px] px-3 rounded-xl bg-black border border-[#2C2C2C] text-xs font-semibold text-[#A3A3A3] hover:border-[#FFB300] hover:text-[#FFB300] flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                  title="Unload NLLB-200 from RAM to save battery"
                >
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                  <span>Sleep</span>
                </button>
              )}
            </div>

            {isLoaded && (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#737373] tabular-nums">
                <span>Auto-sleep frees RAM when idle</span>
                <span className="text-[#FFB300]">
                  {Math.floor(sleepSecLeft / 60)}:
                  {String(sleepSecLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            <p className="mt-2 text-[11px] text-[#737373]">
              Model: <span className="font-mono text-[#A3A3A3]">{UNIFIED_TRANSLATOR_MODEL_ID}</span>{' '}
              (q8 quantized · 1 download covers all 12 languages bidirectionally)
            </p>

            {downloading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A3A3A3] truncate pr-2">
                    {downloadDetail}
                  </span>
                  <span className="font-mono text-[#FFB300] tabular-nums shrink-0">
                    {downloadPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-full bg-[#FFB300] transition-all duration-150"
                    style={{ width: `${downloadPct}%` }}
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3 flex items-start gap-2 text-xs text-[#F5F5F5]">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Box */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[#A3A3A3] mb-1.5">
                <span>
                  {LANGUAGE_BY_CODE[sourceLang].name} Input
                </span>
                {sourceText && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceText('');
                      setTranslatedText('');
                    }}
                    className="text-[#737373] hover:text-[#F5F5F5] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={`Type ${LANGUAGE_BY_CODE[sourceLang].name} text to translate to ${LANGUAGE_BY_CODE[targetLang].name}...`}
                className="w-full p-3 rounded-xl bg-black border border-[#262626] text-sm text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300] resize-none"
              />
              <button
                type="button"
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating || downloading}
                className="mt-2.5 w-full min-h-[44px] rounded-xl bg-[#1A1A1A] border border-[#303030] text-sm font-semibold text-[#F5F5F5] hover:border-[#FFB300] hover:text-[#FFB300] disabled:opacity-40 transition cursor-pointer"
              >
                {isTranslating
                  ? `Translating to ${LANGUAGE_BY_CODE[targetLang].name}...`
                  : `Translate to ${LANGUAGE_BY_CODE[targetLang].name} (${LANGUAGE_BY_CODE[targetLang].nativeName})`}
              </button>
            </div>

            {/* Output Box with Copy, Speak & Full-Screen Show Card */}
            <div className="mt-4 rounded-xl bg-black border border-[#222222] p-3.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[#737373] mb-2">
                <span>
                  {LANGUAGE_BY_CODE[targetLang].name} (
                  {LANGUAGE_BY_CODE[targetLang].nativeName})
                </span>
                {translatedText && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyOutput}
                      className="inline-flex items-center gap-1 text-[#A3A3A3] hover:text-[#FFB300] cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-[#FFB300]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSpeak('output-speech', translatedText, targetLang)
                      }
                      className="inline-flex items-center gap-1 text-[#FFB300] font-semibold cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Speak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCard({
                          nativeText: translatedText,
                          englishText: sourceText.trim(),
                          langCode: targetLang,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[#F5F5F5] hover:text-[#FFB300] font-semibold cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="min-h-[60px] text-lg font-medium text-[#F5F5F5] leading-relaxed">
                {translatedText || (
                  <span className="text-sm text-[#525252]">
                    Translated text will appear here. Works 100% in Airplane Mode
                    across all 12 languages once the unified pack is cached.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Pan-India Zero-Download Emergency Survival Phraseboard */}
        <section className="lg:col-span-7 rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
                Pan-India Emergency Phraseboard
              </h2>
              <p className="text-xs text-[#A3A3A3]">
                {EMERGENCY_PHRASES.length} critical phrases · 11 Indian scripts +
                Romanized pronunciation · Zero download
              </p>
            </div>

            {/* Voice speed toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black border border-[#222222]">
              <button
                type="button"
                onClick={() => setSpeechRate(0.72)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  speechRate === 0.72
                    ? 'bg-[#FFB300] text-black font-bold'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                Slow 0.7×
              </button>
              <button
                type="button"
                onClick={() => setSpeechRate(0.9)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  speechRate === 0.9
                    ? 'bg-[#FFB300] text-black font-bold'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                Normal
              </button>
            </div>
          </div>

          {/* 11 Indian Language Selector Strip */}
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
            {INDIC_LANGUAGES.map((lang) => {
              const active = phraseLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setPhraseLang(lang.code as IndicLanguageCode)}
                  className={`min-h-[46px] px-2 py-1.5 rounded-xl border text-center transition cursor-pointer ${
                    active
                      ? 'bg-[#FFB300] border-[#FFB300] text-black'
                      : 'bg-black border-[#222222] text-[#F5F5F5] hover:border-[#404040]'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight truncate">
                    {lang.nativeName}
                  </div>
                  <div
                    className={`text-[10px] leading-tight mt-0.5 truncate ${
                      active ? 'text-black/80 font-semibold' : 'text-[#737373]'
                    }`}
                  >
                    {lang.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category Filter + Search */}
          <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black border border-[#222222] overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All (16)' },
                  { id: 'medical', label: 'Medical' },
                  { id: 'water-food', label: 'Water & Food' },
                  { id: 'danger-shelter', label: 'Danger & Shelter' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPhraseCategory(cat.id)}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    phraseCategory === cat.id
                      ? 'bg-[#1F1F1F] text-[#F5F5F5]'
                      : 'text-[#737373] hover:text-[#F5F5F5]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={phraseSearch}
                onChange={(e) => setPhraseSearch(e.target.value)}
                placeholder="Search water, hurt, road..."
                className="w-full min-h-[40px] pl-8 pr-3 rounded-xl bg-black border border-[#242424] text-xs text-[#F5F5F5] placeholder:text-[#737373] focus:outline-none focus:border-[#FFB300]"
              />
            </div>
          </div>

          {/* Active Language Voice Hint */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#737373] px-0.5">
            <span>
              Showing{' '}
              <strong className="text-[#F5F5F5]">
                {activePhraseLangMeta.name} ({activePhraseLangMeta.nativeName})
              </strong>{' '}
              · Voice tag <span className="font-mono">{activePhraseLangMeta.speechCode}</span>
            </span>
            <span className="font-mono tabular-nums">
              {filteredPhrases.length} phrases
            </span>
          </div>

          {/* Phrase List */}
          <div className="mt-2 divide-y divide-[#1A1A1A] flex-1">
            {filteredPhrases.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#737373]">
                No emergency phrase matched &ldquo;{phraseSearch}&rdquo;.
              </p>
            ) : (
              filteredPhrases.map((phrase) => {
                const entry = phrase.translations[phraseLang];
                const isSpeaking = speakingId === phrase.id;
                return (
                  <div
                    key={phrase.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        {phrase.urgent && (
                          <span className="font-mono text-[10px] font-bold uppercase text-[#FF3B30] shrink-0">
                            URGENT
                          </span>
                        )}
                        <span className="text-[#A3A3A3]">{phrase.en}</span>
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[#F5F5F5] leading-snug">
                        {entry.native}
                      </div>
                      <div className="mt-0.5 text-xs text-[#FFB300] font-medium leading-snug">
                        {entry.roman}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(phrase.id, entry.native, phraseLang)
                        }
                        className={`flex-1 sm:flex-none min-h-[44px] px-3.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-[0.96] cursor-pointer whitespace-nowrap ${
                          isSpeaking
                            ? 'bg-[#FFB300] border-[#FFB300] text-black'
                            : 'bg-black border-[#2A2A2A] text-[#FFB300] hover:border-[#FFB300]'
                        }`}
                        aria-label={`Speak ${activePhraseLangMeta.name} for: ${phrase.en}`}
                      >
                        <Volume2 className="w-4 h-4 shrink-0" />
                        <span>{isSpeaking ? 'Speaking' : 'Speak'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCardDaylightMode(false);
                          setActiveCard({
                            nativeText: entry.native,
                            romanText: entry.roman,
                            englishText: phrase.en,
                            langCode: phraseLang,
                            urgent: phrase.urgent,
                          });
                        }}
                        className="flex-1 sm:flex-none min-h-[44px] px-3.5 rounded-xl bg-[#141414] border border-[#2C2C2C] text-xs font-bold text-[#F5F5F5] hover:border-[#FFB300] hover:text-[#FFB300] flex items-center justify-center gap-1.5 transition active:scale-[0.96] cursor-pointer whitespace-nowrap"
                        aria-label={`Show full-screen card for: ${phrase.en}`}
                      >
                        <Maximize2 className="w-4 h-4 shrink-0" />
                        <span>Show Card</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Full-Screen High-Contrast Visual "Show Card" Modal */}
      {activeCard && (
        <div
          className={`fixed inset-0 z-50 flex flex-col justify-between p-5 sm:p-8 select-none ${
            cardDaylightMode ? 'bg-white text-black' : 'bg-black text-[#F5F5F5]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen emergency translation card"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
              <span
                className={
                  activeCard.urgent
                    ? 'text-[#FF3B30]'
                    : cardDaylightMode
                      ? 'text-black'
                      : 'text-[#FFB300]'
                }
              >
                {LANGUAGE_BY_CODE[activeCard.langCode].name} (
                {LANGUAGE_BY_CODE[activeCard.langCode].nativeName})
              </span>
              {activeCard.urgent && (
                <span className="text-[#FF3B30]">· EMERGENCY</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCardDaylightMode((v) => !v)}
                className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  cardDaylightMode
                    ? 'bg-black text-white border-black'
                    : 'bg-[#141414] text-[#F5F5F5] border-[#2C2C2C]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{cardDaylightMode ? 'AMOLED Dark' : 'Sun Contrast'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCard(null)}
                className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center cursor-pointer ${
                  cardDaylightMode
                    ? 'bg-neutral-100 text-black border-neutral-300'
                    : 'bg-[#141414] text-[#F5F5F5] border-[#2C2C2C]'
                }`}
                aria-label="Close full-screen card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Giant Native Script Readout */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-2 py-6">
            <div
              className={`text-4xl sm:text-6xl font-bold leading-snug tracking-tight ${
                activeCard.urgent
                  ? cardDaylightMode
                    ? 'text-[#D70015]'
                    : 'text-[#FFB300]'
                  : cardDaylightMode
                    ? 'text-black'
                    : 'text-white'
              }`}
            >
              {activeCard.nativeText}
            </div>

            {activeCard.romanText && (
              <div
                className={`mt-6 text-lg sm:text-2xl font-semibold leading-relaxed ${
                  cardDaylightMode ? 'text-neutral-700' : 'text-[#FFB300]/90'
                }`}
              >
                {activeCard.romanText}
              </div>
            )}

            <div
              className={`mt-5 pt-4 border-t text-sm sm:text-base max-w-2xl ${
                cardDaylightMode
                  ? 'border-neutral-300 text-neutral-600'
                  : 'border-[#242424] text-[#A3A3A3]'
              }`}
            >
              {activeCard.englishText}
            </div>
          </div>

          {/* Bottom 1-Tap Speak & Close Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={() =>
                handleSpeak('fullscreen-card', activeCard.nativeText, activeCard.langCode)
              }
              className="flex-1 min-h-[56px] px-6 rounded-2xl bg-[#FFB300] text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-[#FFC433] active:scale-[0.98] transition cursor-pointer"
            >
              <Volume2 className="w-5 h-5 shrink-0" />
              <span>Speak Aloud ({LANGUAGE_BY_CODE[activeCard.langCode].name})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCard(null)}
              className={`min-h-[56px] px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer ${
                cardDaylightMode
                  ? 'bg-black text-white'
                  : 'bg-[#161616] border border-[#2C2C2C] text-[#F5F5F5]'
              }`}
            >
              <X className="w-5 h-5 shrink-0" />
              <span>Close Card</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
