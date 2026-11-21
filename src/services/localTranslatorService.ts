import {
  LANGUAGE_BY_CODE,
  type LanguageCode,
} from '../data/emergencyPhrases';
import { notifyOfflineReadinessChanged } from '../hooks/useOfflineReadiness';

export const UNIFIED_TRANSLATOR_MODEL_ID = 'Xenova/nllb-200-distilled-600M';
const CACHED_PAIRS_KEY = 'apex_cached_translator_pairs_v1';
const UNIFIED_PACK_TOKEN = 'nllb-200-pan-india-v1';

type TranslationPipeline = (
  text: string,
  options?: {
    src_lang?: string;
    tgt_lang?: string;
    max_new_tokens?: number;
  }
) => Promise<Array<{ translation_text: string }>>;

class LocalTranslatorService {
  private unifiedPipeline: TranslationPipeline | null = null;

  public isUnifiedModelCached(): boolean {
    try {
      const raw = localStorage.getItem(CACHED_PAIRS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.includes(UNIFIED_PACK_TOKEN);
    } catch {
      return false;
    }
  }

  private markUnifiedModelCached(): void {
    try {
      localStorage.setItem(
        CACHED_PAIRS_KEY,
        JSON.stringify([UNIFIED_PACK_TOKEN])
      );
    } catch {
      // Ignore storage error
    }
    notifyOfflineReadinessChanged();
  }

  public isLoaded(): boolean {
    return this.unifiedPipeline !== null;
  }

  public async loadUnifiedModel(
    onProgress: (percent: number, detail: string) => void
  ): Promise<void> {
    if (this.unifiedPipeline) {
      onProgress(100, 'Pan-India NLLB-200 Translator ready offline');
      return;
    }

    onProgress(2, 'Loading local Transformers.js multilingual runtime...');
    const transformers = await import('@huggingface/transformers');
    transformers.env.allowLocalModels = false;
    transformers.env.useBrowserCache = true;

    const fileProgress = new Map<string, { loaded: number; total: number }>();

    const handleProgress = (info: {
      status?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => {
      if (info.file && typeof info.total === 'number' && info.total > 0) {
        fileProgress.set(info.file, {
          loaded: info.loaded ?? 0,
          total: info.total,
        });
        let totalLoaded = 0;
        let totalBytes = 0;
        fileProgress.forEach((v) => {
          totalLoaded += v.loaded;
          totalBytes += v.total;
        });
        const pct = Math.max(
          4,
          Math.min(99, Math.round((totalLoaded / totalBytes) * 100))
        );
        onProgress(pct, `Caching ${info.file}...`);
      } else if (info.status === 'progress' && typeof info.progress === 'number') {
        onProgress(
          Math.max(4, Math.min(99, Math.round(info.progress))),
          `Downloading ${info.file || 'NLLB-200 quantized weights'}...`
        );
      } else if (info.status === 'ready') {
        onProgress(100, 'Pan-India NLLB-200 ready offline');
      }
    };

    try {
      const pipe = await transformers.pipeline(
        'translation',
        UNIFIED_TRANSLATOR_MODEL_ID,
        {
          dtype: 'q8',
          progress_callback: handleProgress,
        }
      );
      this.unifiedPipeline = pipe as unknown as TranslationPipeline;
    } catch {
      // Fallback to default precision if q8 shard name differs in browser build
      const pipe = await transformers.pipeline(
        'translation',
        UNIFIED_TRANSLATOR_MODEL_ID,
        {
          progress_callback: handleProgress,
        }
      );
      this.unifiedPipeline = pipe as unknown as TranslationPipeline;
    }

    this.markUnifiedModelCached();
    onProgress(100, 'All 12 Indian & English languages ready offline');
  }

  public async translate(
    source: LanguageCode,
    target: LanguageCode,
    text: string
  ): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (source === target) return trimmed;

    if (!this.unifiedPipeline) {
      throw new Error(
        'Offline multilingual translator is not loaded yet. Tap "Download Pan-India Translator" first.'
      );
    }

    const srcMeta = LANGUAGE_BY_CODE[source];
    const tgtMeta = LANGUAGE_BY_CODE[target];

    const result = await this.unifiedPipeline(trimmed, {
      src_lang: srcMeta.nllbCode,
      tgt_lang: tgtMeta.nllbCode,
      max_new_tokens: 256,
    });

    if (Array.isArray(result) && result[0]?.translation_text) {
      return result[0].translation_text;
    }
    return '';
  }

  public async unload(): Promise<void> {
    if (this.unifiedPipeline) {
      const disposable = this.unifiedPipeline as unknown as {
        dispose?: () => Promise<void> | void;
      };
      try {
        if (typeof disposable.dispose === 'function') {
          await disposable.dispose();
        }
      } catch {
        // Ignore runtime dispose error
      }
      this.unifiedPipeline = null;
    }
  }
}

export const localTranslatorService = new LocalTranslatorService();

export function speakText(
  text: string,
  langCode: string,
  rate = 0.9
): { ok: boolean; error?: string; usedVoiceLang?: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      ok: false,
      error: 'Voice playback (SpeechSynthesis) is unavailable in this browser.',
    };
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const lowerTarget = langCode.toLowerCase();
    const baseLang = lowerTarget.split('-')[0];

    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === lowerTarget) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(`${baseLang}-`)) ||
      voices.find((v) => v.lang.toLowerCase() === baseLang);

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
    return {
      ok: true,
      usedVoiceLang: matchingVoice?.lang || langCode,
    };
  } catch {
    return { ok: false, error: 'Could not start speech synthesis.' };
  }
}
