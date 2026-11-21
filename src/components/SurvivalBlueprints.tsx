import React, { useState } from 'react';
import {
  Compass,
  Droplets,
  Flame,
  Layers,
  Sun,
  Tent,
} from 'lucide-react';

type BlueprintId = 'water-filter' | 'solar-still' | 'knots' | 'a-frame';

interface BlueprintStep {
  title: string;
  detail: string;
}

const BLUEPRINT_STEPS: Record<BlueprintId, BlueprintStep[]> = {
  'water-filter': [
    {
      title: '1. Cut Bottle & Plug Neck',
      detail:
        'Cut the bottom off a clean 1.5–2L plastic bottle, invert it, and stuff a folded cotton cloth or bandage tightly into the neck (with cap loosened or punctured) so media cannot fall through.',
    },
    {
      title: '2. Pack Crushed Wood Charcoal (6–8 cm)',
      detail:
        'Crush fully burned hardwood campfire charcoal (never briquettes with chemical lighter fluid) into fine grains, rinse briefly, and pack tightly above the cloth plug to adsorb chemicals and odors.',
    },
    {
      title: '3. Layer Fine Sand (5 cm)',
      detail:
        'Add clean fine river sand on top of the charcoal to trap silt, microscopic debris, and cysts.',
    },
    {
      title: '4. Top With Coarse Gravel & Boil Output',
      detail:
        'Finish with 4–5 cm of coarse pebbles to stop heavy mud from clogging the sand. CRITICAL: Filtration clarifies water ONLY — ALWAYS boil the filtered water 1 full minute or bleach-treat before drinking.',
    },
  ],
  'solar-still': [
    {
      title: '1. Dig Pit & Line With Wet Foliage',
      detail:
        'In a sunny open spot, dig a pit ~90 cm wide × 50 cm deep. Line the outer slope with crushed non-toxic green leaves, damp soil, or contaminated/salt water (keep the center dry).',
    },
    {
      title: '2. Place Clean Catch Cup in Center',
      detail:
        'Set a clean metal cup or cut bottle base firmly at the deepest center point. If you have tubing, tape one end to the cup bottom and run the other outside the pit so you can sip without breaking the seal.',
    },
    {
      title: '3. Seal Clear Plastic Sheet & Drop Center Stone',
      detail:
        'Stretch a clear plastic sheet loosely over the pit, bury its outer perimeter tightly with soil/rocks, and place a fist-sized stone in the exact center to form a low V-cone directly over the cup.',
    },
    {
      title: '4. Harvest Distilled Condensation',
      detail:
        'Solar heat evaporates pure water vapor onto the underside of the plastic, which runs down the cone and drips pure distilled water into the cup (0.5–1L/day). Never let plastic touch the cup rim.',
    },
  ],
  knots: [
    {
      title: '1. Bowline: Form Overhand Loop ("Rabbit Hole")',
      detail:
        'Leave ~30 cm working tail. Twist a small loop in the standing line so the working side crosses ON TOP of the standing line.',
    },
    {
      title: '2. Bowline: Up Through Hole & Around Tree',
      detail:
        'Pass the working end UP from underneath through the loop, then wrap it behind and around the main standing line ("around the tree").',
    },
    {
      title: '3. Bowline: Back Down Hole & Dress Tight',
      detail:
        'Tuck the working end back DOWN through the original loop parallel to itself, then pull the standing line and loop tight. Forms a non-slip rescue loop that unties easily even after heavy load.',
    },
    {
      title: '4. Clove Hitch: Fast Anchor on Tree / Ridgepole',
      detail:
        'Wrap rope around the pole, cross over itself to form an "X", make a second wrap around the pole, and tuck the working end directly underneath the diagonal cross. Pull both ends taut — ideal for shelter ridgepoles.',
    },
  ],
  'a-frame': [
    {
      title: '1. Lash Sturdy Ridgepole at Waist Height',
      detail:
        'Anchor one end of a 2.5–3m strong pole into a tree fork or lashed tripod ~90–100 cm high, sloping down to the ground in the rear so the interior fits your body snugly (small air volume = warmer).',
    },
    {
      title: '2. Lean 45° Side Rib Branches',
      detail:
        'Line both sides of the ridgepole with sturdy rib sticks angled at ~45° to form a steep A-frame skeleton capable of shedding rain and supporting heavy insulation.',
    },
    {
      title: '3. Build 15+ cm Dry Ground Bedding FIRST',
      detail:
        'Pile dry leaves, pine needles, or ferns at least 15–20 cm thick (compressed) across the sleeping floor. Bare earth drains body heat 3× faster than cold night air.',
    },
    {
      title: '4. Pile 60 cm+ Debris Insulation & Block Wind',
      detail:
        'Shingle smaller twigs over the ribs, then pack 60–90 cm of dry leaves/moss over the entire shell (arm-length thick for freezing weather). Stuff your pack or a leaf plug into the low entrance.',
    },
  ],
};

export const SurvivalBlueprints: React.FC = () => {
  const [activeId, setActiveId] = useState<BlueprintId>('water-filter');
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = BLUEPRINT_STEPS[activeId];

  const handleSelectBlueprint = (id: BlueprintId) => {
    setActiveId(id);
    setActiveStep(0);
  };

  return (
    <div className="rounded-2xl bg-black border border-[#242424] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#FFB300] shrink-0" />
          <div>
            <h3 className="font-display text-xl font-bold tracking-wide text-[#F5F5F5]">
              Interactive Visual Survival Blueprints
            </h3>
            <p className="text-[11px] text-[#737373]">
              Tap any numbered step to highlight exact build layers & knot passes
            </p>
          </div>
        </div>

        {/* Blueprint Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'water-filter', label: 'Water Filter', icon: Droplets },
              { id: 'solar-still', label: 'Solar Still', icon: Sun },
              { id: 'knots', label: 'Knots', icon: Compass },
              { id: 'a-frame', label: 'A-Frame', icon: Tent },
            ] as const
          ).map((b) => {
            const Icon = b.icon;
            const selected = activeId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBlueprint(b.id)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  selected
                    ? 'bg-[#FFB300] text-black font-bold'
                    : 'bg-[#0E0E0E] border border-[#242424] text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Blueprint SVG Canvas + Interactive Step Guide */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: High-Contrast Tactical CAD SVG Diagram */}
        <div className="lg:col-span-6 rounded-xl bg-[#050505] border border-[#222222] p-3">
          {activeId === 'water-filter' && (
            <svg
              viewBox="0 0 360 270"
              className="w-full h-auto"
              role="img"
              aria-label="DIY Charcoal and Sand Water Filter cross-section blueprint"
            >
              {/* Grid lines */}
              <defs>
                <pattern
                  id="bp-grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#141414"
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect width="360" height="270" fill="url(#bp-grid)" />

              {/* Dirty water pour */}
              <path
                d="M 120 18 L 138 42 M 136 14 L 146 42 M 152 18 L 154 42"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <text
                x="140"
                y="12"
                textAnchor="middle"
                fill="#38BDF8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="700"
              >
                TURBID WATER IN
              </text>

              {/* Layer 4: Coarse Gravel (Step 3) */}
              <rect
                x="92"
                y="46"
                width="96"
                height="34"
                fill={activeStep === 3 ? '#FFB300' : '#262626'}
                fillOpacity={activeStep === 3 ? '0.32' : '0.65'}
                stroke={activeStep === 3 ? '#FFB300' : '#525252'}
                strokeWidth={activeStep === 3 ? '2' : '1'}
              />
              {[104, 120, 138, 156, 172, 114, 132, 148, 166].map((cx, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={i < 5 ? 58 : 70}
                  r="4"
                  fill="#737373"
                />
              ))}

              {/* Layer 3: Fine Sand (Step 2) */}
              <rect
                x="92"
                y="80"
                width="96"
                height="36"
                fill={activeStep === 2 ? '#FFB300' : '#856404'}
                fillOpacity={activeStep === 2 ? '0.4' : '0.35'}
                stroke={activeStep === 2 ? '#FFB300' : '#665010'}
                strokeWidth={activeStep === 2 ? '2' : '1'}
              />

              {/* Layer 2: Crushed Charcoal (Step 1) */}
              <rect
                x="92"
                y="116"
                width="96"
                height="46"
                fill={activeStep === 1 ? '#FFB300' : '#171717'}
                fillOpacity={activeStep === 1 ? '0.28' : '0.95'}
                stroke={activeStep === 1 ? '#FFB300' : '#404040'}
                strokeWidth={activeStep === 1 ? '2' : '1'}
              />
              {[102, 118, 134, 152, 168, 110, 126, 144, 162, 176].map(
                (x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y={i < 5 ? 126 : 144}
                    width="6"
                    height="5"
                    fill="#404040"
                  />
                )
              )}

              {/* Layer 1: Cloth Plug in Bottle Neck (Step 0) */}
              <path
                d="M 92 162 L 126 196 L 154 196 L 188 162 Z"
                fill={activeStep === 0 ? '#FFB300' : '#333333'}
                fillOpacity={activeStep === 0 ? '0.4' : '0.55'}
                stroke={activeStep === 0 ? '#FFB300' : '#737373'}
                strokeWidth={activeStep === 0 ? '2' : '1'}
              />

              {/* Outer Inverted Bottle Outline */}
              <path
                d="M 90 36 L 90 162 L 125 198 L 125 212 L 155 212 L 155 198 L 190 162 L 190 36"
                fill="none"
                stroke="#F5F5F5"
                strokeWidth="2.2"
              />

              {/* Filtered drips + Boil catch pot */}
              <line
                x1="140"
                y1="214"
                x2="140"
                y2="236"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <path
                d="M 105 234 L 105 258 L 175 258 L 175 234"
                fill="#082F49"
                fillOpacity="0.6"
                stroke="#38BDF8"
                strokeWidth="1.8"
              />
              <text
                x="140"
                y="251"
                textAnchor="middle"
                fill="#FF3B30"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                MUST BOIL 1 MIN
              </text>

              {/* Callout Labels on Right */}
              {[
                { y: 65, step: 3, text: '04 COARSE GRAVEL (4cm)' },
                { y: 100, step: 2, text: '03 FINE SAND (5cm)' },
                { y: 140, step: 1, text: '02 WOOD CHARCOAL (7cm)' },
                { y: 185, step: 0, text: '01 COTTON CLOTH PLUG' },
              ].map((lbl) => (
                <g key={lbl.text}>
                  <line
                    x1="190"
                    y1={lbl.y}
                    x2="212"
                    y2={lbl.y}
                    stroke={activeStep === lbl.step ? '#FFB300' : '#525252'}
                    strokeWidth="1.2"
                  />
                  <text
                    x="216"
                    y={lbl.y + 3}
                    fill={activeStep === lbl.step ? '#FFB300' : '#A3A3A3'}
                    fontSize="9.5"
                    fontWeight={activeStep === lbl.step ? '700' : '500'}
                    fontFamily="monospace"
                  >
                    {lbl.text}
                  </text>
                </g>
              ))}
            </svg>
          )}

          {activeId === 'solar-still' && (
            <svg
              viewBox="0 0 360 270"
              className="w-full h-auto"
              role="img"
              aria-label="Solar Water Still cross-section blueprint"
            >
              {/* Sun rays */}
              <circle cx="310" cy="34" r="14" fill="#FFB300" />
              <path
                d="M 288 46 L 240 82 M 298 54 L 265 95 M 278 36 L 210 65"
                stroke="#FFB300"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x="230"
                y="26"
                fill="#FFB300"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="700"
              >
                SOLAR HEAT
              </text>

              {/* Ground surface + 90cm pit */}
              <path
                d="M 10 115 L 65 115 L 115 225 L 245 225 L 295 115 L 350 115"
                fill="#0D0A07"
                stroke={activeStep === 0 ? '#FFB300' : '#737373'}
                strokeWidth={activeStep === 0 ? '2.4' : '1.8'}
              />

              {/* Green Foliage / Wet Matter inside pit (Step 0) */}
              <ellipse
                cx="118"
                cy="202"
                rx="22"
                ry="10"
                fill="#22C55E"
                fillOpacity={activeStep === 0 ? '0.65' : '0.3'}
                stroke="#22C55E"
                strokeWidth="1.2"
              />
              <ellipse
                cx="242"
                cy="202"
                rx="22"
                ry="10"
                fill="#22C55E"
                fillOpacity={activeStep === 0 ? '0.65' : '0.3'}
                stroke="#22C55E"
                strokeWidth="1.2"
              />

              {/* Clear Plastic Sheet Cone (Step 2) */}
              <path
                d="M 55 114 L 180 158 L 305 114"
                fill="none"
                stroke={activeStep === 2 ? '#FFB300' : '#38BDF8'}
                strokeWidth={activeStep === 2 ? '2.8' : '2'}
              />
              {/* Perimeter Anchor Rocks */}
              <ellipse cx="56" cy="110" rx="11" ry="6" fill="#525252" />
              <ellipse cx="304" cy="110" rx="11" ry="6" fill="#525252" />
              {/* Center Weight Pebble */}
              <ellipse
                cx="180"
                cy="151"
                rx="10"
                ry="7"
                fill={activeStep === 2 ? '#FFB300' : '#A3A3A3'}
              />

              {/* Condensation Drips & Vapor Arrows (Step 3) */}
              <path
                d="M 122 186 Q 128 158 148 148 M 238 186 Q 232 158 212 148"
                fill="none"
                stroke={activeStep === 3 ? '#38BDF8' : '#38BDF8'}
                strokeOpacity={activeStep === 3 ? '1' : '0.5'}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1="180"
                y1="162"
                x2="180"
                y2="186"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="3 3"
              />

              {/* Center Catch Cup (Step 1) */}
              <path
                d="M 162 186 L 166 222 L 194 222 L 198 186"
                fill={activeStep === 1 ? '#FFB300' : '#082F49'}
                fillOpacity={activeStep === 1 ? '0.45' : '0.8'}
                stroke={activeStep === 1 ? '#FFB300' : '#F5F5F5'}
                strokeWidth="2"
              />
              {/* Optional Sipping Tube */}
              <path
                d="M 186 218 Q 250 218 282 135 L 332 108"
                fill="none"
                stroke={activeStep === 3 ? '#FFB300' : '#737373'}
                strokeWidth="1.6"
                strokeDasharray="4 2"
              />

              {/* Blueprint Annotations */}
              <text
                x="180"
                y="96"
                textAnchor="middle"
                fill={activeStep === 2 ? '#FFB300' : '#A3A3A3'}
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                03 CLEAR PLASTIC + CENTER STONE
              </text>
              <text
                x="180"
                y="246"
                textAnchor="middle"
                fill={activeStep === 1 ? '#FFB300' : '#F5F5F5'}
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                02 CATCH CUP · PIT 90cm WIDE × 50cm DEEP
              </text>
              <text
                x="34"
                y="210"
                fill={activeStep === 0 ? '#22C55E' : '#737373'}
                fontSize="8.5"
                fontFamily="monospace"
              >
                01 GREEN LEAVES
              </text>
              <text
                x="266"
                y="96"
                fill={activeStep === 3 ? '#FFB300' : '#737373'}
                fontSize="8.5"
                fontFamily="monospace"
              >
                04 SIP TUBE
              </text>
            </svg>
          )}

          {activeId === 'knots' && (
            <svg
              viewBox="0 0 360 270"
              className="w-full h-auto"
              role="img"
              aria-label="Bowline rescue loop and Clove Hitch knot schematic"
            >
              {/* Left Panel: Bowline (Steps 0, 1, 2) */}
              <rect
                x="8"
                y="8"
                width="172"
                height="254"
                rx="10"
                fill="#0A0A0A"
                stroke={activeStep < 3 ? '#FFB300' : '#222222'}
                strokeWidth={activeStep < 3 ? '1.6' : '1'}
              />
              <text
                x="94"
                y="28"
                textAnchor="middle"
                fill={activeStep < 3 ? '#FFB300' : '#A3A3A3'}
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
              >
                BOWLINE (NON-SLIP LOOP)
              </text>

              {/* Standing line ("Tree") */}
              <path
                d="M 88 44 L 88 106 C 88 128 60 128 60 106 C 60 88 112 88 112 110 C 112 132 82 142 64 166 C 48 188 54 228 94 228 C 134 228 140 190 120 162"
                fill="none"
                stroke={activeStep === 0 ? '#FFB300' : '#F5F5F5'}
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Working end ("Rabbit" out of hole, around tree, back down) */}
              <path
                d="M 120 162 C 108 144 96 130 96 112 C 96 90 70 68 88 64 C 108 60 112 82 88 108 L 80 144"
                fill="none"
                stroke={
                  activeStep === 1 || activeStep === 2 ? '#22C55E' : '#38BDF8'
                }
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Step markers */}
              <circle cx="88" cy="108" r="7" fill="#000" stroke="#FFB300" />
              <text
                x="88"
                y="111"
                textAnchor="middle"
                fill="#FFB300"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                1
              </text>
              <text
                x="94"
                y="248"
                textAnchor="middle"
                fill="#737373"
                fontSize="8.5"
                fontFamily="monospace"
              >
                UP HOLE → AROUND TREE → DOWN
              </text>

              {/* Right Panel: Clove Hitch (Step 3) */}
              <rect
                x="188"
                y="8"
                width="164"
                height="254"
                rx="10"
                fill="#0A0A0A"
                stroke={activeStep === 3 ? '#FFB300' : '#222222'}
                strokeWidth={activeStep === 3 ? '1.6' : '1'}
              />
              <text
                x="270"
                y="28"
                textAnchor="middle"
                fill={activeStep === 3 ? '#FFB300' : '#A3A3A3'}
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
              >
                CLOVE HITCH (ANCHOR)
              </text>

              {/* Vertical Ridgepole / Tree Post */}
              <rect
                x="252"
                y="46"
                width="36"
                height="182"
                rx="6"
                fill="#1D160F"
                stroke="#525252"
                strokeWidth="1.5"
              />
              {/* First wrap + diagonal X */}
              <path
                d="M 210 110 L 292 126"
                stroke={activeStep === 3 ? '#FFB300' : '#F5F5F5'}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Diagonal cross-over */}
              <path
                d="M 290 126 L 248 164"
                stroke={activeStep === 3 ? '#FFB300' : '#F5F5F5'}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Second wrap tucked under diagonal */}
              <path
                d="M 248 164 L 292 168 L 328 182"
                stroke={activeStep === 3 ? '#22C55E' : '#38BDF8'}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <text
                x="270"
                y="248"
                textAnchor="middle"
                fill="#737373"
                fontSize="8.5"
                fontFamily="monospace"
              >
                WRAP → CROSS X → TUCK UNDER
              </text>
            </svg>
          )}

          {activeId === 'a-frame' && (
            <svg
              viewBox="0 0 360 270"
              className="w-full h-auto"
              role="img"
              aria-label="A-Frame Thermal Debris Shelter blueprint"
            >
              {/* Ground line */}
              <line
                x1="14"
                y1="226"
                x2="346"
                y2="226"
                stroke="#525252"
                strokeWidth="2"
              />

              {/* Outer 60cm Debris Insulation Shell (Step 3) */}
              <polygon
                points="180,38 52,226 308,226"
                fill={activeStep === 3 ? '#FFB300' : '#261C0E'}
                fillOpacity={activeStep === 3 ? '0.28' : '0.75'}
                stroke={activeStep === 3 ? '#FFB300' : '#6B532C'}
                strokeWidth={activeStep === 3 ? '2.4' : '1.5'}
                strokeDasharray="6 3"
              />

              {/* Inner A-Frame Rib Sticks at 45 deg (Step 1) */}
              <polyline
                points="94,226 180,92 266,226"
                fill="#050505"
                stroke={activeStep === 1 ? '#FFB300' : '#F5F5F5'}
                strokeWidth={activeStep === 1 ? '4' : '3'}
              />

              {/* Center Ridgepole End (Step 0) */}
              <circle
                cx="180"
                cy="92"
                r="11"
                fill={activeStep === 0 ? '#FFB300' : '#525252'}
                stroke="#000"
                strokeWidth="2"
              />

              {/* 15cm Dry Leaf Ground Insulation Bed (Step 2) */}
              <rect
                x="104"
                y="204"
                width="152"
                height="20"
                rx="4"
                fill={activeStep === 2 ? '#22C55E' : '#1E3A1E'}
                fillOpacity={activeStep === 2 ? '0.75' : '0.8'}
                stroke={activeStep === 2 ? '#FFB300' : '#22C55E'}
                strokeWidth="1.5"
              />

              {/* Survivor thermal core silhouette */}
              <circle cx="180" cy="186" r="11" fill="#333333" stroke="#FFB300" />
              <text
                x="180"
                y="189"
                textAnchor="middle"
                fill="#FFB300"
                fontSize="7.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                BODY
              </text>

              {/* Callout Annotations */}
              <text
                x="180"
                y="24"
                textAnchor="middle"
                fill={activeStep === 3 ? '#FFB300' : '#A3A3A3'}
                fontSize="9.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                04 DEBRIS INSULATION SHELL (60–90cm THICK)
              </text>
              <text
                x="202"
                y="95"
                fill={activeStep === 0 ? '#FFB300' : '#A3A3A3'}
                fontSize="9"
                fontWeight="700"
                fontFamily="monospace"
              >
                01 RIDGEPOLE (95cm H)
              </text>
              <text
                x="248"
                y="165"
                fill={activeStep === 1 ? '#FFB300' : '#A3A3A3'}
                fontSize="9"
                fontFamily="monospace"
              >
                02 45° RIBS
              </text>
              <text
                x="180"
                y="250"
                textAnchor="middle"
                fill={activeStep === 2 ? '#22C55E' : '#A3A3A3'}
                fontSize="9.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                03 15cm+ DRY LEAF BED (BLOCKS GROUND COLD)
              </text>
            </svg>
          )}
        </div>

        {/* Right: Interactive Step Selector Cards */}
        <div className="lg:col-span-6 space-y-2">
          {steps.map((step, idx) => {
            const isSelected = activeStep === idx;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#171200] border-[#FFB300]'
                    : 'bg-[#0A0A0A] border-[#1F1F1F] hover:border-[#333333]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-[#FFB300]' : 'text-[#F5F5F5]'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="font-mono text-[10px] text-[#737373] shrink-0">
                    STEP 0{idx + 1}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#D4D4D4] leading-relaxed">
                  {step.detail}
                </p>
              </button>
            );
          })}

          {activeId === 'water-filter' && (
            <div className="rounded-xl bg-[#190605] border border-[#FF3B30]/45 px-3 py-2 text-[11px] text-[#FF3B30] flex items-center gap-2 font-medium">
              <Flame className="w-4 h-4 shrink-0" />
              <span>
                Reminder: Charcoal/sand removes dirt & chemicals, NOT viruses or
                bacteria. Always boil filtered water.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
