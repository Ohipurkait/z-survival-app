import {
  getProtocolById,
  queryOfflineRuleEngine,
} from '../data/survivalRuleEngine';

export const VISION_MODEL_ID = 'Xenova/mobilenet_v2_1.0_224';
const VISION_CACHED_KEY = 'apex_vision_model_cached_v1';

export type ScanFocusMode = 'auto' | 'plant' | 'wound';

export interface VisionPrediction {
  label: string;
  score: number;
}

export interface TacticalScanAdvice {
  category: string;
  threatLevel: 'SAFE' | 'CAUTION' | 'DANGER';
  headline: string;
  steps: string[];
  protocolId?: string;
  protocolTitle?: string;
}

export interface ScanResult {
  mode: 'mobilenet-v2' | 'heuristic-fallback';
  predictions: VisionPrediction[];
  advice: TacticalScanAdvice;
  timestamp: string;
}

type ImageClassificationPipeline = (
  image: string,
  options?: { topk?: number }
) => Promise<Array<{ label: string; score: number }>>;

interface RuleMatchEntry {
  keywords: string[];
  category: string;
  threatLevel: 'SAFE' | 'CAUTION' | 'DANGER';
  headline: string;
  steps: string[];
  protocolId?: string;
}

const VISION_TACTICAL_RULES: RuleMatchEntry[] = [
  {
    keywords: [
      'mushroom',
      'agaric',
      'bolete',
      'fungus',
      'stinkhorn',
      'earthstar',
      'gyromitra',
      'hen-of-the-woods',
      'coral fungus',
    ],
    category: 'Wild Fungus / Mushroom',
    threatLevel: 'DANGER',
    headline: 'DO NOT EAT — High Lethal Toxicity Risk',
    steps: [
      'Never consume wild mushrooms in a survival emergency; mushrooms provide almost zero calories while amatoxin species cause fatal liver failure 24–72 hours later.',
      'Even boiling or roasting does NOT destroy lethal mushroom toxins.',
      'Wash hands thoroughly after handling unknown fungi before touching food or eyes.',
    ],
    protocolId: 'edible-plants',
  },
  {
    keywords: [
      'snake',
      'viper',
      'cobra',
      'mamba',
      'python',
      'boa',
      'sidewinder',
      'horned viper',
      'diamondback',
      'water snake',
      'garter',
      'vine snake',
      'hognose',
    ],
    category: 'Venomous / Reptile Hazard',
    threatLevel: 'DANGER',
    headline: 'Keep ≥2 Meters Clear — Snakebite Protocol Ready',
    steps: [
      'Back away slowly; never attempt to pin, kill, or handle even an apparently dead snake (reflex strikes persist).',
      'If bitten: immobilize the limb below heart level, remove rings/watches immediately, keep victim calm and still.',
      'NEVER cut the wound, suck venom, apply ice, or use a tight arterial tourniquet.',
    ],
    protocolId: 'snakebite',
  },
  {
    keywords: [
      'spider',
      'scorpion',
      'centipede',
      'tick',
      'wasp',
      'hornet',
      'bee',
      'tarantula',
      'black widow',
      'ant',
      'mosquito',
    ],
    category: 'Arthropod / Insect Vector',
    threatLevel: 'CAUTION',
    headline: 'Check Bites, Stings & Vector-Borne Disease Risk',
    steps: [
      'Avoid bare-hand contact; shake out boots, sleeping gear, and clothing before use.',
      'For stings: scrape stinger sideways with a blade edge (do not squeeze venom sac), wash with soap, apply cool compress.',
      'Watch for anaphylaxis (throat swelling, wheezing, hives) or spreading necrosis/fever over 24–48 hours.',
    ],
    protocolId: 'insect-stings',
  },
  {
    keywords: [
      'plant',
      'leaf',
      'flower',
      'berry',
      'daisy',
      'rapeseed',
      'hip',
      'acorn',
      'corn',
      'cabbage',
      'broccoli',
      'fern',
      'moss',
      'cactus',
      'tree',
      'vine',
      'buckeye',
      'fig',
      'pomegranate',
      'banana',
      'lemon',
      'orange',
      'apple',
      'strawberry',
      'pineapple',
      'herb',
      'pot',
    ],
    category: 'Botanical / Forage Specimen',
    threatLevel: 'CAUTION',
    headline: 'Verify Before Eating — Apply Universal Edibility Test',
    steps: [
      'REJECT immediately if milky/discolored sap, bitter/soapy taste, shiny three-leaf clusters, fine hairs/spines, or white/yellow berries are present.',
      'Test only ONE plant part at a time: crush on inner wrist (15 min) → touch to lip (15 min) → chew tiny piece without swallowing (15 min) → swallow small piece and wait 8 hours.',
      'If nausea, burning, or cramps appear at any step, spit out, rinse mouth, and induce fluids/charcoal.',
    ],
    protocolId: 'edible-plants',
  },
  {
    keywords: [
      'bottle',
      'jug',
      'pitcher',
      'cup',
      'mug',
      'bucket',
      'canteen',
      'barrel',
      'water',
      'lake',
      'river',
      'pond',
      'stream',
      'fountain',
      'well',
      'basin',
    ],
    category: 'Water Vessel / Source',
    threatLevel: 'CAUTION',
    headline: 'Filter & Disinfect Before Drinking',
    steps: [
      'Pre-filter turbid water through folded cloth or an improvised charcoal/sand bottle filter.',
      'Bring to a rolling boil for 1 full minute (3 minutes above 2,000m elevation), OR add 2 drops unscented 5–6% bleach per liter and wait 30 minutes.',
      'Clear PET plastic bottles can also perform SODIS solar disinfection (6 hours direct sunlight, or 2 days if overcast).',
    ],
    protocolId: 'purify-water',
  },
  {
    keywords: [
      'knife',
      'cleaver',
      'hatchet',
      'ax',
      'axe',
      'machete',
      'scissors',
      'blade',
      'sword',
      'saw',
      'hammer',
      'wrench',
      'screwdriver',
      'shovel',
      'crowbar',
    ],
    category: 'Cutting / Field Tool',
    threatLevel: 'SAFE',
    headline: 'High-Value Survival Tool — Maintain Edge & Hygiene',
    steps: [
      'Sterilize blades over flame or with alcohol/bleach before any medical or food-prep use.',
      'Always cut away from femoral arteries (inner thighs) and wrist tendons; fatigue causes severe field lacerations.',
      'Dry steel completely and wipe with a thin film of oil or lip balm to prevent rust in wet conditions.',
    ],
    protocolId: 'deep-wound',
  },
  {
    keywords: [
      'bandage',
      'band aid',
      'gauze',
      'syringe',
      'pill',
      'medicine',
      'stethoscope',
      'mask',
      'glove',
      'cotton',
      'swab',
      'bottle',
    ],
    category: 'Medical / First-Aid Supply',
    threatLevel: 'SAFE',
    headline: 'Salvage & Keep Sterile in Waterproof Pouch',
    steps: [
      'Check expiration dates and intact sterile seals; damaged packaging can still be used for non-sterile outer pressure wraps.',
      'Prioritize hemorrhage control items (gauze, elastic wraps, tape) and oral rehydration / antiseptic supplies.',
      'Label improvised dosages clearly and store dry, away from heat and direct sunlight.',
    ],
    protocolId: 'deep-wound',
  },
  {
    keywords: [
      'match',
      'lighter',
      'candle',
      'torch',
      'lantern',
      'flashlight',
      'wood',
      'log',
      'charcoal',
      'stove',
      'fire',
      'flame',
      'battery',
    ],
    category: 'Fire / Light / Energy Gear',
    threatLevel: 'SAFE',
    headline: 'Conserve Ignition & Power — Prepare Dry Tinder First',
    steps: [
      'Never strike a match or ferro rod until dry tinder, pencil-thin kindling, and thumb-thick fuelwood are staged.',
      'Store lighters and batteries in waterproof bags close to body heat in cold weather (cold drains lithium/alkaline cells rapidly).',
      'Use low-lumen or red light at night to protect night vision and avoid signaling your location.',
    ],
    protocolId: 'start-fire',
  },
  {
    keywords: [
      'can',
      'tin',
      'bread',
      'meat',
      'fish',
      'rice',
      'soup',
      'jar',
      'chocolate',
      'peanut',
      'nut',
      'cracker',
      'ration',
      'food',
      'egg',
    ],
    category: 'Food / Ration Item',
    threatLevel: 'CAUTION',
    headline: 'Inspect Seal Integrity Before Consumption',
    steps: [
      'DISCARD any bulging, leaking, deeply rusted, or foul-smelling cans immediately (botulism risk is fatal).',
      'Prioritize eating perishable foods first; save high-calorie sealed dry goods and fats for travel.',
      'Never eat dry protein/rations if water is critically scarce — digestion consumes body water.',
    ],
    protocolId: 'food-preservation',
  },
  {
    keywords: [
      'dog',
      'wolf',
      'coyote',
      'bear',
      'boar',
      'rat',
      'mouse',
      'bat',
      'monkey',
      'cat',
      'fox',
    ],
    category: 'Animal / Bite & Rabies Risk',
    threatLevel: 'DANGER',
    headline: 'Avoid Bites — High Rabies & Infection Hazard',
    steps: [
      'Do not corner stray or wild animals; store all food sealed and elevated away from sleeping areas.',
      'If bitten: immediately scrub the wound vigorously with soap and clean running water for 15 full minutes.',
      'Leave animal bite puncture wounds OPEN to drain (do not glue or stitch shut) and flush with povidone-iodine if available.',
    ],
    protocolId: 'animal-bite',
  },
  {
    keywords: [
      'tent',
      'blanket',
      'sleeping bag',
      'tarp',
      'umbrella',
      'backpack',
      'jacket',
      'coat',
      'poncho',
      'rope',
      'knot',
    ],
    category: 'Shelter / Load-Bearing Gear',
    threatLevel: 'SAFE',
    headline: 'Insulate From Ground First — Block Wind & Rain',
    steps: [
      'Cold ground steals body heat 3× faster than air; always place foam, cardboard, or 15cm of dry leaves underneath before sleeping.',
      'Pitch shelter away from dry riverbeds (flash floods) and dead overhead branches ("widowmakers").',
      'Keep spare paracord and waterproof layers accessible at the top of your pack.',
    ],
    protocolId: 'emergency-shelter',
  },
  {
    keywords: [
      'radio',
      'walkie',
      'compass',
      'map',
      'binocular',
      'watch',
      'whistle',
      'mirror',
      'phone',
      'solar',
    ],
    category: 'Comms & Navigation Gear',
    threatLevel: 'SAFE',
    headline: 'Protect Electronics & Preserve Battery Reserve',
    steps: [
      'Keep phone in Airplane Mode with dim AMOLED screen to extend battery life 4–6×.',
      'Use the Comms tab Acoustic Modem or QR Burst when cell towers are down, and lock waypoints on the Offline Map.',
      'Store backup compass away from magnets, speakers, and steel knives.',
    ],
    protocolId: 'navigation-no-compass',
  },
];

function matchPredictionsToAdvice(
  predictions: VisionPrediction[],
  focusMode: ScanFocusMode
): TacticalScanAdvice {
  // Explicit wound triage focus mode override
  if (focusMode === 'wound') {
    const proto = getProtocolById('deep-wound');
    return {
      category: 'Field Wound & Trauma Triage',
      threatLevel: 'DANGER',
      headline: 'Control Bleeding First (MARCH) — Inspect for Infection',
      steps: [
        'Active bleeding: apply firm continuous direct pressure for 10 full minutes without peeking; apply tourniquet 5–8 cm above limb wound if bright-red spurting blood.',
        'Once controlled, irrigate thoroughly with boiled cooled water or saline (1 tsp salt per 1L boiled water).',
        'Watch for red flags: spreading redness, throbbing heat, pus, foul odor, red streaks up the limb, or fever (sepsis). Leave dirty/bite wounds open with moist sterile dressing.',
      ],
      protocolId: proto?.id,
      protocolTitle: proto?.title,
    };
  }

  const combinedLabels = predictions
    .map((p) => p.label.toLowerCase())
    .join(' , ');

  for (const rule of VISION_TACTICAL_RULES) {
    if (rule.keywords.some((kw) => combinedLabels.includes(kw))) {
      const proto = rule.protocolId
        ? getProtocolById(rule.protocolId)
        : undefined;
      return {
        category: rule.category,
        threatLevel: rule.threatLevel,
        headline: rule.headline,
        steps: rule.steps,
        protocolId: proto?.id,
        protocolTitle: proto?.title,
      };
    }
  }

  // Plant focus fallback if MobileNet labeled a generic organic surface
  if (focusMode === 'plant') {
    const proto = getProtocolById('edible-plants');
    return {
      category: 'Unidentified Plant / Foliage',
      threatLevel: 'CAUTION',
      headline: 'Unverified Specimen — Do Not Eat Without Edibility Test',
      steps: [
        'Never rely solely on visual similarity; many toxic plants mimic edible wild greens and berries.',
        'Discard anything with milky sap, almond/peach odor, three-leaved shiny clusters, or bitter/soapy taste.',
        'Run the 8-hour Universal Edibility Test on one small part at a time, and prioritize boiling safe greens.',
      ],
      protocolId: proto?.id,
      protocolTitle: proto?.title,
    };
  }

  // Generic survival rule-engine query fallback
  const topLabel = predictions[0]?.label || 'Unknown Object';
  const fallbackText = queryOfflineRuleEngine(topLabel);
  const firstLines = fallbackText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('NO EXACT'))
    .slice(0, 3);

  return {
    category: 'General Field Object',
    threatLevel: 'SAFE',
    headline: `Identified: ${topLabel} — Assess Salvage & Utility Value`,
    steps:
      firstLines.length >= 2
        ? firstLines
        : [
            `Inspect "${topLabel}" for secondary survival utility: container, cordage, insulation, reflective signaling, or metal salvage.`,
            'Do not consume unknown liquids, powders, or botanicals without positive verification and purification.',
            'Log useful salvage caches as GPS Waypoints on the Offline Map tab.',
          ],
  };
}

/**
 * Zero-download visual heuristic analyzer used if the user scans before
 * caching the 4MB MobileNetV2 model in Airplane Mode.
 */
export function runOfflineHeuristicScan(
  canvas: HTMLCanvasElement,
  focusMode: ScanFocusMode
): ScanResult {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let redRatio = 0;
  let greenRatio = 0;
  let brightRatio = 0;

  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let redPx = 0;
    let greenPx = 0;
    let brightPx = 0;
    const total = w * h || 1;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 110 && r > g * 1.45 && r > b * 1.45) redPx++;
      if (g > 75 && g > r * 1.15 && g > b * 1.15) greenPx++;
      if ((r + g + b) / 3 > 190) brightPx++;
    }
    const sampled = total / 4 || 1;
    redRatio = Math.min(1, redPx / sampled);
    greenRatio = Math.min(1, greenPx / sampled);
    brightRatio = Math.min(1, brightPx / sampled);
  }

  const predictions: VisionPrediction[] = [];
  let effectiveFocus = focusMode;

  if (focusMode === 'wound' || (focusMode === 'auto' && redRatio > 0.14)) {
    effectiveFocus = 'wound';
    predictions.push({
      label:
        redRatio > 0.25
          ? 'High Red/Blood Saturation (Trauma / Erythema)'
          : 'Localized Redness / Tissue Area',
      score: Math.min(0.95, 0.55 + redRatio),
    });
  } else if (
    focusMode === 'plant' ||
    (focusMode === 'auto' && greenRatio > 0.18)
  ) {
    effectiveFocus = 'plant';
    predictions.push({
      label: 'Chlorophyll / Wild Foliage Specimen',
      score: Math.min(0.94, 0.52 + greenRatio),
    });
  } else {
    predictions.push({
      label:
        brightRatio > 0.35
          ? 'Reflective / Light-Colored Field Item'
          : 'Unclassified Field Object (Download Vision Brain for 1,000-Class AI)',
      score: 0.62,
    });
  }

  return {
    mode: 'heuristic-fallback',
    predictions,
    advice: matchPredictionsToAdvice(predictions, effectiveFocus),
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

class LocalVisionService {
  private classifier: ImageClassificationPipeline | null = null;

  public isLoaded(): boolean {
    return this.classifier !== null;
  }

  public isMarkedCached(): boolean {
    try {
      return localStorage.getItem(VISION_CACHED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  public async loadModel(
    onProgress: (pct: number, detail: string) => void
  ): Promise<void> {
    if (this.classifier) {
      onProgress(100, 'MobileNetV2 Vision Brain ready offline');
      return;
    }

    onProgress(4, 'Initializing local Transformers.js vision engine...');
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
        let loaded = 0;
        let total = 0;
        fileProgress.forEach((v) => {
          loaded += v.loaded;
          total += v.total;
        });
        const pct = Math.max(6, Math.min(99, Math.round((loaded / total) * 100)));
        onProgress(pct, `Caching ${info.file}...`);
      } else if (info.status === 'progress' && typeof info.progress === 'number') {
        onProgress(
          Math.max(6, Math.min(99, Math.round(info.progress))),
          `Downloading ${info.file || 'MobileNetV2 weights'}...`
        );
      } else if (info.status === 'ready') {
        onProgress(100, 'MobileNetV2 ready offline');
      }
    };

    try {
      const pipe = await transformers.pipeline(
        'image-classification',
        VISION_MODEL_ID,
        {
          dtype: 'q8',
          progress_callback: handleProgress,
        }
      );
      this.classifier = pipe as unknown as ImageClassificationPipeline;
    } catch {
      // Fallback to default precision ONNX if quantized variant is unavailable
      const pipe = await transformers.pipeline(
        'image-classification',
        VISION_MODEL_ID,
        {
          progress_callback: handleProgress,
        }
      );
      this.classifier = pipe as unknown as ImageClassificationPipeline;
    }

    try {
      localStorage.setItem(VISION_CACHED_KEY, 'true');
    } catch {
      // Ignore storage error
    }
    onProgress(100, 'MobileNetV2 Vision Brain cached offline');
  }

  public async classifyCanvas(
    canvas: HTMLCanvasElement,
    focusMode: ScanFocusMode
  ): Promise<ScanResult> {
    if (!this.classifier) {
      return runOfflineHeuristicScan(canvas, focusMode);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const raw = await this.classifier(dataUrl, { topk: 4 });
    const predictions: VisionPrediction[] = Array.isArray(raw)
      ? raw.map((item) => ({
          label: item.label,
          score: item.score,
        }))
      : [];

    return {
      mode: 'mobilenet-v2',
      predictions,
      advice: matchPredictionsToAdvice(predictions, focusMode),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  public async unload(): Promise<void> {
    if (this.classifier) {
      const disposable = this.classifier as unknown as {
        dispose?: () => Promise<void> | void;
      };
      try {
        if (typeof disposable.dispose === 'function') {
          await disposable.dispose();
        }
      } catch {
        // Ignore dispose error
      }
      this.classifier = null;
    }
  }
}

export const localVisionService = new LocalVisionService();
