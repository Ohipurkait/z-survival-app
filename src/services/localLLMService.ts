import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm';
import { TACTICAL_MEDIC_SYSTEM_PROMPT } from '../data/survivalRuleEngine';
import { notifyOfflineReadinessChanged } from '../hooks/useOfflineReadiness';

export interface LocalModelOption {
  id: string;
  matchPrefix: string;
  label: string;
  sizeLabel: string;
  summary: string;
}

export const LOCAL_MODEL_OPTIONS: LocalModelOption[] = [
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    matchPrefix: 'Qwen2.5-1.5B-Instruct',
    label: 'Qwen 2.5 1.5B (Fast)',
    sizeLabel: '~1.1 GB',
    summary: 'Fast quantized model ideal for smartphones & quick field answers',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    matchPrefix: 'Llama-3.2-3B-Instruct',
    label: 'Llama 3.2 3B (Tactical)',
    sizeLabel: '~2.2 GB',
    summary: 'Deeper medical & field reasoning for high-RAM phones and laptops',
  },
];

const INSTALLED_MODEL_KEY = 'apex_installed_llm_model_v1';

interface GPUAdapterLike {
  requestAdapter?: () => Promise<unknown | null>;
}

class LocalLLMService {
  private engine: MLCEngineInterface | null = null;
  private loadedModelId: string | null = null;
  private loadingPromise: Promise<void> | null = null;

  public getSavedModelId(): string | null {
    try {
      return localStorage.getItem(INSTALLED_MODEL_KEY);
    } catch {
      return null;
    }
  }

  public isLoaded(): boolean {
    return this.engine !== null && this.loadedModelId !== null;
  }

  public getLoadedModelId(): string | null {
    return this.loadedModelId;
  }

  public checkWebGPUSupport(): { supported: boolean; reason?: string } {
    if (typeof navigator === 'undefined') {
      return { supported: false, reason: 'Browser environment unavailable.' };
    }
    const nav = navigator as Navigator & { gpu?: GPUAdapterLike };
    if (!nav.gpu) {
      return {
        supported: false,
        reason:
          'WebGPU is not supported on this device or browser. Use Chrome 113+, Edge, or Safari 18+ for local LLM acceleration. The 62-protocol Offline Survival Rule-Engine below works 100% offline right now.',
      };
    }
    return { supported: true };
  }

  public async verifyWebGPUAdapter(): Promise<{
    supported: boolean;
    reason?: string;
  }> {
    const syncCheck = this.checkWebGPUSupport();
    if (!syncCheck.supported) return syncCheck;

    try {
      const nav = navigator as Navigator & { gpu?: GPUAdapterLike };
      if (nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
          return {
            supported: false,
            reason:
              'No compatible WebGPU hardware adapter found on this device. The 62-protocol Offline Survival Rule-Engine remains 100% active offline.',
          };
        }
      }
      return { supported: true };
    } catch {
      return {
        supported: false,
        reason:
          'WebGPU initialization was blocked on this device. Use the built-in 62-protocol Offline Survival Rule-Engine below.',
      };
    }
  }

  private async resolveModelId(option: LocalModelOption): Promise<string> {
    const webllm = await import('@mlc-ai/web-llm');
    const list = webllm.prebuiltAppConfig?.model_list ?? [];
    const exact = list.find((m) => m.model_id === option.id);
    if (exact) return exact.model_id;

    const fallback =
      list.find(
        (m) =>
          m.model_id.startsWith(option.matchPrefix) &&
          m.model_id.includes('q4f16_1')
      ) ||
      list.find(
        (m) =>
          m.model_id.startsWith(option.matchPrefix) &&
          m.model_id.includes('q4f32_1')
      ) ||
      list.find((m) => m.model_id.startsWith(option.matchPrefix));

    return fallback ? fallback.model_id : option.id;
  }

  public async isModelCached(option: LocalModelOption): Promise<boolean> {
    try {
      const webllm = await import('@mlc-ai/web-llm');
      const resolvedId = await this.resolveModelId(option);
      const appConfig = {
        ...webllm.prebuiltAppConfig,
        useIndexedDBCache: true,
      };
      return await webllm.hasModelInCache(resolvedId, appConfig);
    } catch {
      return false;
    }
  }

  public async loadModel(
    option: LocalModelOption,
    onProgress: (percent: number, text: string) => void
  ): Promise<string> {
    const gpuCheck = await this.verifyWebGPUAdapter();
    if (!gpuCheck.supported) {
      throw new Error(gpuCheck.reason);
    }

    if (this.engine && this.loadedModelId === option.id) {
      onProgress(100, 'Local AI Brain ready');
      return this.loadedModelId;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.loadedModelId || option.id;
    }

    this.loadingPromise = (async () => {
      try {
        onProgress(2, 'Initializing local WebGPU runtime...');
        const webllm = await import('@mlc-ai/web-llm');
        const resolvedId = await this.resolveModelId(option);

        if (this.engine) {
          await this.engine.unload();
          this.engine = null;
          this.loadedModelId = null;
        }

        const appConfig = {
          ...webllm.prebuiltAppConfig,
          useIndexedDBCache: true,
        };

        const engine = await webllm.CreateMLCEngine(resolvedId, {
          appConfig,
          initProgressCallback: (report: InitProgressReport) => {
            const pct = Math.max(
              2,
              Math.min(100, Math.round((report.progress || 0) * 100))
            );
            onProgress(pct, report.text || 'Downloading quantized weights...');
          },
        });

        this.engine = engine;
        this.loadedModelId = resolvedId;
        try {
          localStorage.setItem(INSTALLED_MODEL_KEY, resolvedId);
        } catch {
          // Ignore quota errors
        }
        notifyOfflineReadinessChanged();
        onProgress(100, 'AI Brain installed & ready offline');
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
    return this.loadedModelId || option.id;
  }

  public async streamAnswer(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    onToken: (fullText: string) => void
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('Local AI Brain is not loaded yet.');
    }

    const messages = [
      { role: 'system' as const, content: TACTICAL_MEDIC_SYSTEM_PROMPT },
      ...history.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const chunks = await this.engine.chat.completions.create({
      messages,
      temperature: 0.35,
      max_tokens: 650,
      stream: true,
    });

    let accumulated = '';
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulated += delta;
        onToken(accumulated);
      }
    }

    return accumulated.trim() || 'No response generated. Try rephrasing your question.';
  }

  public async interrupt(): Promise<void> {
    if (this.engine) {
      await this.engine.interruptGenerate();
    }
  }

  public async unload(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.interruptGenerate();
      } catch {
        // Ignore if not generating
      }
      try {
        await this.engine.unload();
      } catch {
        // Ignore unload error
      }
      this.engine = null;
      this.loadedModelId = null;
    }
  }
}

export const localLLMService = new LocalLLMService();
