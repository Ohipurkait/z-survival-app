export const TACTICAL_MEDIC_SYSTEM_PROMPT = `You are Z SURVIVAL MEDIC, an offline tactical field medic and emergency survival specialist operating in a post-collapse grid-down environment with no hospitals or emergency services.

Rules:
1. Be direct, calm, and zero-fluff. Every word must be actionable.
2. Start with immediate life-saving priority actions first (Stop bleeding, airway, hypothermia, water, shelter).
3. Use crisp numbered steps with concrete measurements (e.g., boil 1 full minute, 2 drops unscented 5-6% bleach per liter, tourniquet 2-3 inches above wound).
4. Explicitly state critical warnings or red flags (e.g., never remove impaled objects, never drink stagnant water without boiling/disinfection, watch for septic shock).
5. Suggest practical improvised substitutes using common field gear (cloth strips, clean plastic bags, sticks, charcoal, salt/sugar).`;

export type ProtocolCategory =
  | 'Trauma & Bleeding'
  | 'Medical & Illness'
  | 'Environmental'
  | 'Water & Food'
  | 'Fire, Shelter & Field';

export interface SurvivalProtocol {
  id: string;
  title: string;
  category: ProtocolCategory;
  severity: 'critical' | 'essential';
  keywords: string[];
  response: string;
}

export interface QuickSurvivalProtocol {
  id: string;
  label: string;
  prompt: string;
  severity: 'critical' | 'essential';
  protocolId: string;
}

export const OFFLINE_PROTOCOLS: SurvivalProtocol[] = [
  // ================= TRAUMA & BLEEDING (12) =================
  {
    id: 'deep-wound',
    title: 'Severe Bleeding & Deep Wound (MARCH)',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['wound', 'bleed', 'blood', 'cut', 'laceration', 'tourniquet', 'stab', 'artery', 'bandage', 'hemorrhage', 'deep'],
    response: `SEVERE BLEEDING & DEEP WOUND PROTOCOL (MARCH)

1. Stop Massive Bleeding Immediately
- Expose the wound fully to see the exact bleeding point.
- Apply firm continuous direct pressure with both hands over clean gauze/cloth for 10 full minutes. Never lift cloth to peek — stack fresh cloth directly on top if blood soaks through.

2. Wound Packing (Deep Thigh, Groin, Armpit, Neck Base)
- Pack clean gauze or cloth strips tightly into the wound cavity down to the bleeding vessel, then hold firm continuous pressure for 5 minutes.

3. Improvised Tourniquet (Bright-Red Spurting Limb Bleeding)
- Place a wide cloth strap (≥5 cm wide, never wire) 5–8 cm ABOVE the wound (closer to torso, never over a joint).
- Tie an overhand knot, insert a strong stick windlass, twist until bleeding stops completely, and tie the stick down.
- Write the EXACT time applied on the patient's forehead. Do NOT loosen once tightened.

4. Clean & Monitor
- Once bleeding stops, flush heavily with boiled cooled water or saline (1 tsp salt per 1L boiled water).
- Leave ragged, dirty, or bite wounds OPEN with moist loose gauze to drain. Watch for shock (pale clammy skin, fast weak pulse) and spreading redness/pus.`,
  },
  {
    id: 'sucking-chest-wound',
    title: 'Open / Sucking Chest Wound',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['chest', 'lung', 'sucking', 'puncture', 'rib', 'pneumothorax', 'bubbling', 'shot', 'gunshot'],
    response: `OPEN / SUCKING CHEST WOUND PROTOCOL

1. Seal Immediately on Exhalation
- Have the patient exhale forcefully, then slap a clean non-porous airtight barrier (plastic bag, foil wrapper, chest seal) directly over the wound.

2. Tape 3 Sides Only (Improvised Flutter Valve)
- Tape top, left, and right edges tightly to the skin, leaving the BOTTOM edge untaped so trapped air and blood can escape on exhalation without sucking air back in on inhalation.

3. Check for Exit Wound & Position
- Always inspect the patient's back for an exit wound and seal it the same way.
- Position patient sitting slightly upright or leaning onto the injured side to help the uninjured lung expand.
- WARNING: If breathing rapidly worsens with bulging neck veins (tension pneumothorax), briefly lift one corner of the seal on exhalation ("burp the seal") to release trapped pressure.`,
  },
  {
    id: 'head-injury',
    title: 'Head Injury & Concussion Triage',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['head', 'concussion', 'skull', 'brain', 'unconscious', 'knocked out', 'pupil', 'dizzy'],
    response: `HEAD INJURY & CONCUSSION PROTOCOL

1. Stabilize Neck & Airway
- Assume neck/spinal injury until proven otherwise; keep head aligned and still. If unconscious and breathing, gently log-roll onto their side (recovery position) to prevent choking on vomit.

2. Control Scalp Bleeding Gently
- Scalp cuts bleed heavily. Apply gentle broad pressure — NEVER press hard directly over a depressed or spongy skull fracture.

3. Red-Flag Monitoring (Every 15 Minutes)
- Watch for unequal pupils, clear/bloody fluid leaking from ears or nose (do NOT plug), worsening confusion, slurred speech, repeated vomiting, seizures, or inability to wake.
- Keep patient resting in dark quiet cover, elevate head slightly (15–30°), and avoid alcohol or sedatives.`,
  },
  {
    id: 'impaled-object',
    title: 'Impaled Object Stabilization',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['impaled', 'knife', 'rebar', 'glass', 'arrow', 'stick', 'embedded', 'spear'],
    response: `IMPALED OBJECT PROTOCOL

1. DO NOT REMOVE THE OBJECT
- Pulling an embedded blade, glass shard, or branch releases internal tamponade pressure and can cause instant fatal hemorrhage. (Only exception: object piercing the cheek and blocking the airway.)

2. Stabilize in Place
- Control bleeding around the entry point with gentle direct pressure next to the object.
- Build thick donut-shaped pads of folded cloth/bandages around the base of the object and tape/wrap them firmly so the object cannot wobble during movement.`,
  },
  {
    id: 'amputation',
    title: 'Field Amputation & Tissue Preservation',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['amputation', 'severed', 'finger', 'limb', 'chopped', 'cut off'],
    response: `AMPUTATION PROTOCOL

1. Stop Stump Bleeding First
- For major limb amputation: apply a tourniquet immediately 5–8 cm above the stump and record time.
- For finger/toe: apply firm direct pressure with sterile gauze and elevate above heart level.

2. Preserve Severed Part (If Reattachment Possible)
- Rinse gently with clean water/saline without scrubbing. Wrap in damp sterile gauze, seal inside a waterproof plastic bag, and place that bag inside a second container of cool water/ice.
- NEVER place severed tissue directly on ice or submerged loose in water.`,
  },
  {
    id: 'internal-bleeding-shock',
    title: 'Hemorrhagic Shock & Internal Bleeding',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['shock', 'internal', 'pale', 'clammy', 'weak pulse', 'abdominal', 'faint', 'cold sweat'],
    response: `SHOCK & INTERNAL BLEEDING PROTOCOL

1. Recognize Early Shock
- Rapid weak pulse (>110 bpm), pale cold clammy skin, rapid shallow breathing, extreme thirst, anxiety or confusion, rigid/swollen tender abdomen.

2. Field Stabilization
- Stop all visible external bleeding immediately.
- Lay patient flat on an insulated surface (blanket, cardboard, pack) — hypothermia dramatically accelerates fatal clotting failure.
- Cover patient warmly to preserve core temperature. Elevate legs 20–30 cm ONLY if there is no head, neck, chest, or leg fracture.
- Do NOT give food or large gulps of water if abdominal injury or vomiting is present; moisten lips with damp cloth.`,
  },
  {
    id: 'crush-injury',
    title: 'Crush Injury & Rubble Extraction',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['crush', 'rubble', 'collapsed', 'pinned', 'trapped', 'concrete', 'debris'],
    response: `CRUSH INJURY PROTOCOL

1. Time-Critical Check
- If a limb has been heavily pinned for LESS than 15 minutes: safely lift debris and treat bleeding/fractures normally.
- If pinned for MORE than 1–2 hours: lifting the weight releases toxic potassium and muscle breakdown products into the bloodstream (Crush Syndrome), which can stop the heart within minutes.

2. Prolonged Crush Mitigation
- Before lifting prolonged (>2 hr) crushing weight off a limb in an austere setting, hydrate the conscious patient aggressively with clean water/ORS (no potassium supplements) and consider pre-placing a snug tourniquet above the crush zone if no medical support exists. Monitor breathing closely after release.`,
  },
  {
    id: 'eye-injury',
    title: 'Eye Trauma & Chemical Flush',
    category: 'Trauma & Bleeding',
    severity: 'essential',
    keywords: ['eye', 'chemical', 'dust', 'blind', 'cornea', 'pepper', 'acid', 'splash'],
    response: `EYE INJURY & FLUSH PROTOCOL

1. Chemical Splash / Smoke / Debris
- Immediately flush continuously with clean lukewarm water or saline for 20 full minutes, tilting the head so runoff flows AWAY from the uninjured eye. Hold eyelids gently open while flushing.

2. Penetrating / Blunt Eye Trauma
- NEVER rub or put pressure on an injured eyeball. Never pull out an embedded splinter/glass.
- Tape a rigid shield (cut paper cup bottom or folded cardboard cone) over the eye socket so nothing touches the eye, and loosely cover BOTH eyes to stop sympathetic eye movement.`,
  },
  {
    id: 'nosebleed-severe',
    title: 'Severe Nosebleed Control',
    category: 'Trauma & Bleeding',
    severity: 'essential',
    keywords: ['nosebleed', 'nose', 'epistaxis', 'bleeding nose'],
    response: `SEVERE NOSEBLEED PROTOCOL

1. Lean Forward — Never Tilt Head Back
- Sit upright and lean forward slightly so blood drains forward instead of down the throat (swallowing blood causes vomiting).

2. Continuous 15-Minute Pinch
- Pinch the soft lower flesh of the nose firmly against the nasal septum for 15 unbroken minutes without releasing to check. Breathe through the mouth.
- Apply a cold wet cloth across the bridge of the nose and back of the neck. Avoid blowing or picking nose for 24 hours after it stops.`,
  },
  {
    id: 'spinal-immobilization',
    title: 'Neck & Spinal Injury Immobilization',
    category: 'Trauma & Bleeding',
    severity: 'critical',
    keywords: ['spine', 'neck', 'back', 'paralyzed', 'fall', 'numb', 'tingling'],
    response: `SPINAL IMMOBILIZATION PROTOCOL

1. Suspect Spine Injury After
- Any fall >2m, vehicle crash, blunt head trauma, or tingling/numbness/weakness in arms or legs.

2. Manual Inline Stabilization
- Instruct the patient not to nod or shake their head. Place rolled clothing, boots, or packs firmly on both sides of the head and neck to block side-to-side movement.
- Do NOT move the patient unless fire, collapse, or direct threat makes staying fatal. If movement is mandatory, use a synchronized 3–4 person log-roll keeping head, shoulders, and hips locked in one straight line.`,
  },
  {
    id: 'dental-emergency',
    title: 'Field Dental Emergency & Knocked-Out Tooth',
    category: 'Trauma & Bleeding',
    severity: 'essential',
    keywords: ['tooth', 'dental', 'abscess', 'toothache', 'jaw', 'gum'],
    response: `FIELD DENTAL EMERGENCY PROTOCOL

1. Knocked-Out Adult Tooth
- Handle ONLY by the white crown (never touch or scrub the root). Gently rinse dirt with clean water/saline and press it straight back into the socket within 30 minutes, biting gently on clean gauze. If unable to reinsert, keep inside cheek or milk/saline.

2. Severe Toothache / Swelling
- Rinse frequently with warm saltwater (1/2 tsp salt per cup boiled cooled water). Clove oil (tiny dab on cotton) numbs exposed nerve pain.
- WARNING: Rapid facial/neck swelling with fever or difficulty swallowing indicates a spreading deep abscess — requires urgent systemic antibiotics.`,
  },
  {
    id: 'fracture',
    title: 'Fractures, Dislocations & Improvised Splints',
    category: 'Trauma & Bleeding',
    severity: 'essential',
    keywords: ['break', 'broken', 'fracture', 'bone', 'sprain', 'splint', 'ankle', 'leg', 'arm', 'dislocation'],
    response: `FRACTURE & IMPROVISED SPLINT PROTOCOL

1. Check Circulation First (PMS)
- Check Pulse, Movement, and Sensation below the break BEFORE and AFTER splinting.

2. Immobilize in Position Found
- Pad the limb with soft cloth, then strap two rigid supports (sticks, trekking poles, rolled magazines, cardboard) spanning ABOVE and BELOW the adjacent joints.
- Never tie knots directly over the break. Re-check circulation; loosen slightly if toes/fingers turn cold, pale, or numb.

3. Open (Compound) Fracture
- Rinse gently with clean boiled water without pushing bone back in, cover with moist sterile gauze, control bleeding around the bone, and splint firmly.`,
  },

  // ================= MEDICAL & ILLNESS (14) =================
  {
    id: 'burns',
    title: 'Thermal & Chemical Burn Care',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['burn', 'scald', 'blister', 'flame', 'acid', 'fire burn', 'boiling water'],
    response: `FIELD BURN TREATMENT PROTOCOL

1. Stop the Burning Process
- Cool immediately with clean cool (NOT ice) running water for 15–20 minutes.
- Remove rings, watches, and tight clothing BEFORE swelling develops. Never peel off clothing melted onto skin.

2. Protect Without Trapping Heat
- NEVER pop intact blisters. NEVER apply butter, oil, toothpaste, or ash.
- Wrap loosely with sterile non-stick gauze or clean plastic cling film (prevents excruciating air exposure and moisture loss).

3. Hydrate Aggressively
- Large burns lose massive fluid rapidly. Give frequent sips of Oral Rehydration Solution (1L clean water + 6 tsp sugar + 1/2 tsp salt).`,
  },
  {
    id: 'dehydration-ors',
    title: 'Severe Dehydration & WHO ORS Formula',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['dehydrat', 'ors', 'diarrhea', 'vomit', 'electrolyte', 'salt', 'thirst', 'dysentery'],
    response: `DEHYDRATION & FIELD ORS PROTOCOL

1. Exact WHO Homemade ORS Ratio
Mix into 1 Liter of boiled/purified cooled water:
- 6 level teaspoons of sugar
- 1/2 level teaspoon of table salt
Taste check: must taste NO saltier than tears. Excess salt causes dangerous hypernatremia.

2. Administration
- If nauseated or vomiting, give 1 small spoonful every 2 minutes instead of gulping.
- Track urine color: dark amber or zero urination for >8 hours indicates severe dehydration requiring immediate rest and continuous oral rehydration.`,
  },
  {
    id: 'bite-rabies',
    title: 'Animal / Human Bite & Infection Control',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['bite', 'zombie', 'infect', 'dog', 'rabies', 'scratch', 'human bite', 'saliva'],
    response: `BITE & INFECTION CONTROL PROTOCOL

1. Immediate 15-Minute Mechanical Flush
- Scrub and flush the wound vigorously with soap and clean running water for 15 FULL MINUTES — this single step cuts viral and bacterial load drastically.
- Irrigate with diluted povidone-iodine or antiseptic around and inside the wound.

2. Leave Puncture Bites OPEN
- Do NOT suture or glue puncture bites closed (traps anaerobic bacteria deep inside). Pack loosely with clean moist gauze and change dressings twice daily.
- Trace any redness border with a pen + timestamp to detect spreading infection early.`,
  },
  {
    id: 'snakebite',
    title: 'Venomous Snakebite Field Protocol',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['snake', 'snakebite', 'cobra', 'viper', 'krait', 'venom', 'fang'],
    response: `VENOMOUS SNAKEBITE PROTOCOL

1. Immobilize & Stay Calm
- Panic accelerates heart rate and spreads venom. Keep the victim completely still and lying down.
- Remove rings, bracelets, and tight boots immediately before swelling begins.
- Splint the bitten limb gently at or slightly below heart level (like a fracture).

2. STRICTLY FORBIDDEN ACTIONS
- NEVER cut the wound.
- NEVER suck out venom by mouth.
- NEVER apply a tight arterial tourniquet (causes limb necrosis).
- NEVER apply ice or electric shock.
- Note snake color/pattern from a safe distance and prioritize rapid evacuation while monitoring airway and breathing.`,
  },
  {
    id: 'wound-infection-sepsis',
    title: 'Wound Infection & Sepsis Triage',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['sepsis', 'pus', 'infected', 'red streaks', 'abscess', 'fever', 'antibiotic', 'cellulitis'],
    response: `WOUND INFECTION & SEPSIS PROTOCOL

1. Identify Local vs Systemic Infection
- Local: spreading redness (outline with pen + time), heat, swelling, throbbing pain, cloudy pus.
- Systemic Sepsis (Life-Threatening): red streaks traveling up limb, fever >38.5°C or <36°C, rapid pulse, confusion, shivering, rapid breathing.

2. Field Wound Care
- Gently reopen superficial pus pockets with boiled/flame-sterilized blade ONLY if clearly fluctuant and bulging, flush heavily with warm boiled saltwater, and apply warm clean wet compresses 20 min 3×/day to promote drainage.
- Keep patient aggressively hydrated with ORS and cool fevers with damp cloths on armpits/groin.`,
  },
  {
    id: 'choking-cpr',
    title: 'Choking (Heimlich) & Airway Rescue',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['choking', 'heimlich', 'airway', 'cpr', 'breathing', 'cardiac', 'pulse', 'unresponsive'],
    response: `CHOKING & AIRWAY RESCUE PROTOCOL

1. Conscious Choking Adult/Child (Cannot Cough or Speak)
- Deliver 5 sharp back blows between the shoulder blades leaning forward.
- Stand behind them, place fist thumb-side just above the navel, grasp with other hand, and pull sharp INWARD & UPWARD abdominal thrusts (5×). Alternate 5 back blows / 5 thrusts until object clears.
- Solo self-rescue: thrust upper abdomen firmly over a sturdy chair back or rock edge.

2. Unresponsive & Not Breathing (Hands-Only CPR)
- Place heel of hand on center of chest (lower half of breastbone), lock elbows, push hard (5–6 cm deep) and fast (100–120 compressions/min), allowing full chest recoil.`,
  },
  {
    id: 'anaphylaxis',
    title: 'Severe Allergic Reaction (Anaphylaxis)',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['allergy', 'anaphylaxis', 'bee', 'wasp', 'hives', 'swollen throat', 'epipen', 'wheezing'],
    response: `ANAPHYLAXIS PROTOCOL

1. Immediate Signs
- Swelling of lips/tongue/throat, hoarse voice, wheezing, widespread hives, dizziness/fainting after a sting, food, or drug.

2. Emergency Actions
- If epinephrine auto-injector (EpiPen) is available: inject immediately into outer mid-thigh through clothing, hold 3–10 seconds. Repeat after 5–15 min if symptoms persist.
- Scrape out bee stingers sideways with a card edge (do not squeeze venom sac with tweezers).
- Give oral antihistamine (diphenhydramine/cetirizine) ONLY if patient can swallow safely. Position upright if wheezing, or flat with legs elevated if faint/dizzy.`,
  },
  {
    id: 'food-poisoning',
    title: 'Food Poisoning & Waterborne GI Illness',
    category: 'Medical & Illness',
    severity: 'essential',
    keywords: ['food poisoning', 'stomach', 'nausea', 'cramp', 'cholera', 'giardia', 'spoiled'],
    response: `FOOD POISONING & GI PROTOCOL

1. Hydration Is Survival
- Death from GI illness comes from dehydration, not the toxin. Start WHO ORS immediately (1L boiled water + 6 tsp sugar + 1/2 tsp salt) in tiny frequent sips.

2. Charcoal & Rest
- Activated charcoal (if in kit, 25–50g adult dose within 1 hour of ingestion) binds certain toxins; never use for corrosive chemicals or petroleum.
- Rest stomach from solid food until vomiting stops for 6+ hours, then resume bland starches (plain rice, boiled oats, banana). Isolate patient's waste 60m away from water sources.`,
  },
  {
    id: 'scorpion-spider',
    title: 'Scorpion Sting & Spider Bite Care',
    category: 'Medical & Illness',
    severity: 'essential',
    keywords: ['scorpion', 'spider', 'sting', 'insect', 'tick', 'leech'],
    response: `SCORPION, SPIDER & TICK PROTOCOL

1. Scorpion / Spider Bite
- Wash thoroughly with soap and water. Apply a cool damp compress (10 min on / 10 min off) to reduce throbbing pain. Elevate limb slightly.
- Monitor for neurotoxic signs (muscle twitching, drooling, blurred vision, slurred speech, breathing trouble).

2. Tick & Leech Removal
- Ticks: grasp with fine tweezers flat against the skin and pull straight upward with steady pressure — never twist, burn, or smother with oil (makes tick regurgitate pathogens).
- Leeches: slide a fingernail under the mouth sucker to break seal; do not rip off or burn. Clean with antiseptic.`,
  },
  {
    id: 'fever-management',
    title: 'High Fever & Infection Cooling',
    category: 'Medical & Illness',
    severity: 'essential',
    keywords: ['fever', 'temperature', 'malaria', 'dengue', 'chills', 'sweating', 'hot'],
    response: `FIELD FEVER MANAGEMENT PROTOCOL

1. Safe Cooling
- Remove excess heavy layers and move to shade/ventilation.
- Apply lukewarm-to-cool damp cloths to forehead, neck, armpits, and groin. Avoid ice baths (causes violent shivering that raises core heat).

2. Fluids & Red Flags
- Fever rapidly burns water reserves — push ORS and clear broths continuously.
- Red flags: stiff neck with severe headache, rash that doesn't fade when pressed with glass, persistent vomiting, bleeding gums/nose (dengue danger), or confusion.`,
  },
  {
    id: 'asthma-breathing',
    title: 'Asthma Attack & Breathing Distress',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['asthma', 'inhaler', 'wheeze', 'shortness of breath', 'panic', 'hyperventilat'],
    response: `BREATHING DISTRESS / ASTHMA PROTOCOL

1. Immediate Positioning & Calm
- Sit patient upright leaning slightly forward ("tripod position" with hands on knees). Never force an asthma patient to lie flat.
- Remove from smoke, dust, or cold dry air immediately.

2. Inhaler & Field Improvisation
- Use rescue bronchodilator inhaler (salbutamol/albuterol): 2 puffs spaced 1 minute apart (repeat up to 3 rounds if severe).
- If NO inhaler exists: warm strong caffeinated tea/coffee provides mild natural bronchodilation; inhale warm steam from boiled water and coach slow pursed-lip exhales (inhale 2 sec, exhale 4 sec).`,
  },
  {
    id: 'diabetic-hypoglycemia',
    title: 'Low Blood Sugar (Hypoglycemia) Emergency',
    category: 'Medical & Illness',
    severity: 'critical',
    keywords: ['diabetes', 'diabetic', 'sugar', 'insulin', 'hypoglycemia', 'shaking', 'sweaty'],
    response: `HYPOGLYCEMIA (LOW BLOOD SUGAR) PROTOCOL

1. Rapid Signs
- Sudden shakiness, cold sweats, irritability, confusion, slurred speech, or sudden collapse in a diabetic or starved survivor.

2. Rule of 15 (If Conscious & Swallowing)
- Immediately give 15g fast sugar: 3–4 glucose tablets, 1 tbsp honey/sugar dissolved in water, or half cup sweet juice.
- Wait 15 minutes; repeat if still shaky/confused. Follow with protein + complex carbs once recovered.
- If unconscious: do NOT pour liquids into mouth — rub a tiny smear of honey/sugar paste inside the lower cheek while in recovery position.`,
  },
  {
    id: 'sprain-strain',
    title: 'Ankle Sprain & Soft Tissue Triage',
    category: 'Medical & Illness',
    severity: 'essential',
    keywords: ['sprain', 'twisted', 'ankle', 'knee', 'swollen', 'strain', 'bruise'],
    response: `SPRAIN & SOFT TISSUE PROTOCOL (RICE)

1. Boot Rule in the Field
- If you must walk out immediately after twisting an ankle, KEEP YOUR BOOT LACED TIGHT for external compression until you reach safe camp (once removed, swelling may prevent getting it back on).

2. At Camp (RICE)
- Rest and offload weight with a walking stick.
- Ice / Cold creek water soak 15–20 min every 2 hours.
- Compress with figure-8 elastic wrap (snug, not cutting off toe circulation).
- Elevate above heart level while resting.`,
  },
  {
    id: 'blisters-footcare',
    title: 'Field Foot Care & Blister Prevention',
    category: 'Medical & Illness',
    severity: 'essential',
    keywords: ['blister', 'foot', 'feet', 'shoe', 'boot', 'hiking', 'hotspot'],
    response: `FIELD FOOT CARE PROTOCOL

1. Stop Hotspots Immediately
- Feet are your primary evacuation vehicle. The second you feel rubbing ("hotspot"), stop, dry feet, and cover with moleskin, duct tape, or medical tape.

2. Blister Management
- Small intact blisters: leave unbroken, build a donut pad around them to relieve pressure.
- Large painful weight-bearing blisters likely to burst: clean with antiseptic, sterilize a needle in flame, pierce 2 tiny holes at the lower edge, gently press fluid out while LEAVING THE ROOF SKIN INTACT, apply antiseptic, and tape flat. Change into dry socks nightly.`,
  },

  // ================= ENVIRONMENTAL (10) =================
  {
    id: 'hypothermia',
    title: 'Hypothermia & Cold Exposure',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['cold', 'freeze', 'hypothermia', 'shiver', 'snow', 'himalaya', 'freezing', 'wet cold'],
    response: `HYPOTHERMIA PROTOCOL

1. Stop Heat Loss Immediately
- Get out of wind and OFF wet/frozen ground (lay on 15+ cm of dry leaves, pack, or foam).
- Strip wet clothes immediately and replace with dry wool/synthetic layers. Cover head and neck (huge heat loss zone).

2. Rewarm Core Gently
- Place warm (not scalding) water bottles wrapped in cloth against armpits, groin, and sides of chest. Skin-to-skin inside a dry sleeping bag works fast.
- Give warm sweet drinks ONLY if fully alert. Never give alcohol.
- WARNING: Handle severe hypothermia victims (stopped shivering, lethargic/confused) with extreme gentleness — rough jolting can trigger lethal heart arrhythmia.`,
  },
  {
    id: 'frostbite',
    title: 'Frostbite Field Management',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['frostbite', 'frozen fingers', 'frozen toes', 'waxy skin', 'black toes'],
    response: `FROSTBITE PROTOCOL

1. Critical Refreezing Rule
- NEVER thaw frostbitten tissue in the field if there is ANY chance it could refreeze before reaching permanent warm shelter (thaw-refreeze causes catastrophic tissue destruction).

2. Safe Rewarming (Only When Permanently Sheltered)
- Immerse affected fingers/toes in warm water (37–39°C / comfortable to your elbow) for 20–30 minutes until soft and flushed.
- NEVER rub with snow, never hold over open fire flames (numb skin burns instantly).
- Place dry sterile gauze between individual fingers/toes and protect blisters from rupturing.`,
  },
  {
    id: 'heatstroke',
    title: 'Heatstroke & Heat Exhaustion',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['heatstroke', 'heat', 'sunstroke', 'hot', 'overheat', 'sun', 'collapse heat'],
    response: `HEATSTROKE EMERGENCY PROTOCOL

1. Distinguish Heatstroke (Immediate Life Threat)
- Confusion, slurred speech, staggering, seizures, hot skin (dry OR soaked with sweat) = HEATSTROKE. Cool FIRST, move second!

2. Rapid Aggressive Cooling
- Move to full shade, strip outer clothing.
- Douse continuously with cool water and fan vigorously (evaporative cooling).
- Pack cold wet cloths onto neck, armpits, groin, and palms/soles.
- Give cool ORS ONLY if fully alert and coherent.`,
  },
  {
    id: 'trench-foot',
    title: 'Immersion / Trench Foot Prevention & Care',
    category: 'Environmental',
    severity: 'essential',
    keywords: ['trench foot', 'wet feet', 'monsoon', 'pruned', 'swamp', 'macerated'],
    response: `TRENCH FOOT PROTOCOL

1. Prevention in Monsoon / Wet Terrain
- Air-dry feet daily for at least 1 hour, sleep in strictly dry socks, and swap wet socks inside your shirt to dry with body heat.

2. Treatment
- Gently wash and air-dry feet. Warm gradually in dry air (never near hot fire or hot water).
- Do NOT rub/massage swollen numb feet or pop blisters. Keep feet elevated and completely dry until normal warmth and color return.`,
  },
  {
    id: 'altitude-sickness',
    title: 'High Altitude Sickness (AMS / HAPE / HACE)',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['altitude', 'mountain', 'himalaya', 'ams', 'hape', 'hace', 'oxygen', 'headache mountain'],
    response: `HIGH ALTITUDE SICKNESS PROTOCOL

1. Mild AMS (Headache, Nausea, Fatigue Above 2,500m)
- STOP ascending immediately. Rest, hydrate heavily, eat light carbs, avoid alcohol/sleeping pills.

2. HACE (Confusion, Staggering/Ataxia) or HAPE (Pink Frothy Cough, Blue Lips, Breathless at Rest)
- LIFE-THREATENING EMERGENCY: DESCEND IMMEDIATELY (even at night) by at least 500–1,000 meters! Descent is the only definitive cure when bottled oxygen isn't available. Keep patient warm and upright during evacuation.`,
  },
  {
    id: 'smoke-inhalation',
    title: 'Smoke Inhalation & Toxic Fumes',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['smoke', 'carbon monoxide', 'fumes', 'ash', 'cough', 'wildfire', 'soot'],
    response: `SMOKE INHALATION PROTOCOL

1. Evacuate to Fresh Air Immediately
- Stay low to the floor when escaping smoky structures (cooler cleaner air sits in the bottom 30 cm). Cover nose/mouth with damp cloth (filters soot, NOT carbon monoxide).

2. Airway Burn Red Flags
- Singed nose hairs, soot inside mouth/spit, hoarse voice, stridor (high-pitched breathing), or persistent cough indicate airway burns that can swell shut within hours. Keep patient upright in clean air, monitor breathing nonstop, and avoid exertion.`,
  },
  {
    id: 'lightning-safety',
    title: 'Lightning Storm Survival & Strike First Aid',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['lightning', 'thunder', 'storm', 'struck', 'electric'],
    response: `LIGHTNING SAFETY & STRIKE PROTOCOL

1. During a Storm Outdoors
- Avoid isolated tall trees, ridge crests, open water, metal fences, and shallow cave mouths.
- Move into low dense uniform brush or a hard-topped metal vehicle. If hair stands on end, crouch low on the balls of your feet (feet touching) on a dry backpack — never lie flat.

2. Treating a Strike Victim
- Victims carry ZERO residual electric charge — safe to touch immediately.
- Reverse triage: treat unresponsive/non-breathing victims FIRST with immediate CPR (lightning often stops breathing briefly while the heart can recover).`,
  },
  {
    id: 'drowning-rescue',
    title: 'Near-Drowning & Cold Water Rescue',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['drown', 'drowning', 'submerged', 'flood', 'river', 'water rescue'],
    response: `NEAR-DROWNING PROTOCOL

1. Reach, Throw, Row — Don't Go
- Extend a branch/pole or throw a buoyant object/rope before swimming in (panicking victims drag rescuers under).

2. Resuscitation
- Check breathing immediately on shore. If not breathing, start rescue breaths (2 initial breaths) + CPR (30 compressions : 2 breaths).
- Do NOT waste time trying to press water out of the stomach. Treat aggressively for hypothermia once breathing returns, and monitor for 24 hours for secondary lung fluid (persistent cough/breathlessness).`,
  },
  {
    id: 'snow-blindness',
    title: 'Snow Blindness & Severe Sunburn',
    category: 'Environmental',
    severity: 'essential',
    keywords: ['snow blindness', 'sunburn', 'glare', 'uv', 'goggles'],
    response: `SNOW BLINDNESS & SUNBURN PROTOCOL

1. Improvised Snow Goggles
- Cut narrow horizontal slits into cardboard, bark, or duct tape folded back-to-back and tie over eyes to block UV glare on snow/water.

2. Treating Snow Blindness (Corneal UV Burn)
- Symptoms hit 6–12 hours later (gritty burning pain, tearing, light sensitivity). Move into dark shelter, apply cool wet compresses over closed eyes, never rub eyes. Usually heals within 24–48 hours of complete rest.`,
  },
  {
    id: 'radiation-fallout',
    title: 'Nuclear / Fallout Sheltering (7-10 Rule)',
    category: 'Environmental',
    severity: 'critical',
    keywords: ['radiation', 'fallout', 'nuclear', 'ash', 'iodine', 'bunker'],
    response: `FALLOUT SHELTERING PROTOCOL (7-10 RULE)

1. Get Inside, Stay Inside, Stay Tuned
- Fallout arrives 10–30 minutes after a detonation. Get into the deepest basement or central interior rooms of thick concrete/brick buildings — maximize dense mass between you and the roof/ground.

2. Decontamination (Critical!)
- Strip outer dusty clothing before entering clean zone (removes ~90% of fallout).
- Wash skin/hair with soap and cool water — NEVER use hair conditioner (binds radioactive particles to hair!).

3. The 7-10 Decay Rule
- For every 7× increase in time after blast, radiation drops by ~90%: 7 hrs = 10%, 49 hrs (2 days) = 1%, 2 weeks = 0.1%. Stay sheltered minimum 48–72 hours before emerging.`,
  },

  // ================= WATER & FOOD (10) =================
  {
    id: 'purify-water',
    title: 'Water Purification (Boil, Bleach, SODIS)',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['water', 'purify', 'boil', 'filter', 'drink', 'bleach', 'sodis', 'river', 'rain'],
    response: `WATER PURIFICATION PROTOCOL

1. Pre-Filter Debris First
- Pour murky water through clean cloth, bandana, or a layered bottle filter (cloth -> crushed charcoal -> fine sand -> gravel).

2. Rolling Boil (Most Reliable)
- Full rolling boil for 1 full minute (3 full minutes above 2,000m elevation).

3. Unscented Household Bleach (5%–8.25%)
- Clear water: 2 drops per 1 liter (8 drops/gallon). Cloudy: 4 drops/liter. Stir and wait 30 full minutes. Must smell faintly of chlorine.

4. Zero-Fuel Solar Disinfection (SODIS)
- Fill clear PET plastic bottle (<2L) with clear water, shake 20 seconds, lay flat in full sun for 6 hours (48 hrs overcast).`,
  },
  {
    id: 'charcoal-water-filter',
    title: 'DIY Multi-Stage Charcoal Water Filter',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['charcoal', 'sand filter', 'muddy water', 'pond', 'gravel', 'bottle filter'],
    response: `IMPROVISED CHARCOAL WATER FILTER

1. Build Layers (Bottom Spout to Top)
- Cut bottom off a 2L plastic bottle, poke small holes in cap, invert.
- Layer 1 (Bottom): Tight clean cloth/bandana plug.
- Layer 2: 6 cm finely crushed hardwood campfire charcoal (adsorbs odors & some organics).
- Layer 3: 6 cm clean fine sand.
- Layer 4 (Top): 6 cm small washed pebbles/gravel.

2. Flush & Disinfect
- Run one batch through to rinse black charcoal dust, then collect clear filtered water.
- CRITICAL: Always BOIL or bleach-treat filtered water afterward — homemade filters do NOT trap microscopic viruses or bacteria.`,
  },
  {
    id: 'find-water',
    title: 'Finding Water in Dry & Urban Terrain',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['find water', 'dry', 'desert', 'solar still', 'dew', 'rainwater', 'urban water'],
    response: `WATER HARVESTING PROTOCOL

1. Urban Hidden Clean Water Sources
- Hot water heater tank (shut off inlet/power, drain from bottom spigot — 100–200L clean water).
- Toilet BACK cistern tank (NOT the bowl — safe only if no blue chemical tablets were used).
- Plumbing pipes: open highest faucet in building, drain from lowest basement tap.

2. Wilderness Water Sourcing
- Follow downhill drainage valleys, green vegetation strips, and morning bird flight paths.
- Collect morning dew by dragging absorbent cotton cloths through clean grass before sunrise.
- Dig in the outside bend of a dry sandy streambed where moisture collects deepest; let muddy seep settle, filter, and boil.`,
  },
  {
    id: 'edible-plants',
    title: 'Wild Edible Plants & Universal Edibility Test',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['plant', 'edible', 'forage', 'eat', 'food', 'berry', 'berries', 'mushroom', 'poison', 'wild'],
    response: `FIELD FORAGING & UNIVERSAL EDIBILITY PROTOCOL

1. High-Confidence Safe Staples (India & Temperate Zones)
- Dandelion (leaves, flowers, roasted roots), Amaranth/Chaulai (boiled leaves/seeds), Purslane/Kulfa (succulent stems/leaves), Young Bamboo Shoots (MUST boil 20+ min), Cattail shoots/roots, Plantain weed, Pine needle tea (true pines only — NEVER yew).

2. Instant Rejection Rules
- NEVER eat wild mushrooms unless 100% certain of exact species.
- Avoid milky/colored sap (except dandelion), white/yellow/green berries, umbrella-shaped flower heads (hemlock), and bitter-almond smells.

3. Universal Edibility Test (Non-Mushrooms Only)
- Test ONE plant part at a time: rub inner wrist (15m) -> touch lip (3m) -> hold on tongue (15m) -> chew tiny piece (15m) -> swallow and wait 8 FULL HOURS -> eat 1/4 cup cooked and wait 8 hours.`,
  },
  {
    id: 'food-preservation',
    title: 'Zero-Power Food Preservation (Smoking & Salting)',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['preserve', 'meat', 'smoke', 'jerky', 'salt', 'spoil', 'fridge', 'freezer', 'power out'],
    response: `OFF-GRID FOOD PRESERVATION PROTOCOL

1. Power-Outage Fridge Order
- Keep fridge/freezer closed (full freezer stays safe ~48 hrs). Eat perishables first (dairy/cooked meat), then frozen items, save canned/dry staples last.

2. Field Drying & Smoking Meat (Jerky)
- Trim ALL fat (fat goes rancid quickly). Slice lean meat thin (≤5 mm) against the grain.
- Rub with salt if available, hang on green hardwood racks 60–90 cm above low smoldering hardwood coals (avoid resinous pine/cedar) for 8–12 hours until leathery and snapping dry. Store in dry breathable cloth away from moisture.`,
  },
  {
    id: 'boil-without-metal',
    title: 'Boiling Water Without a Metal Pot',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['no pot', 'plastic bottle boil', 'hot rocks', 'stone boiling', 'cooking'],
    response: `BOILING WATER WITHOUT A METAL POT

1. Clear Plastic Bottle Method (Emergency Only)
- Fill a clear PET plastic bottle completely to the brim (no air pocket at top), leave cap loosely resting (NOT sealed tight), and suspend/set beside hot coals (not direct roaring flames). Water conducts heat away faster than plastic melts up to 100°C.

2. Stone Boiling (Wood Bowl / Bark / Pit)
- Heat dense dry non-river rocks in campfire coals until glowing hot. Use two green sticks as tongs to brush off ash and drop hot stones into a water-filled bark container or plastic-lined pit until water boils for 1+ minute.`,
  },
  {
    id: 'protein-trapping',
    title: 'Emergency Calories & Low-Energy Foraging',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['starving', 'calories', 'hunger', 'fish', 'insects', 'protein', 'rations'],
    response: `LOW-ENERGY CALORIE SURVIVAL PROTOCOL

1. Conserve Energy First
- Chasing game burns more calories than it yields. Prioritize passive harvesting: fishing lines (set-lines/gorge hooks), wild nuts/acorns (leach tannins in boiling water), cattail roots, and insects.

2. Safe High-Protein Insects (Cook Thoroughly!)
- Grasshoppers, crickets, cicadas, ants, and beetle grubs are safe when COOKED (removes parasites). Remove hard legs/wings from grasshoppers.
- Avoid brightly colored, hairy, foul-smelling, or disease-vector insects (flies, mosquitoes, ticks).`,
  },
  {
    id: 'rationing-water-food',
    title: 'Water & Calorie Rationing Discipline',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['ration', 'how long', 'how much water', 'starve', 'sip', 'budget'],
    response: `RATIONING DISCIPLINE PROTOCOL

1. Never Ration Water to the Point of Collapse
- "Ration your sweat, not your water." Rest in shade during peak heat (11:00–16:00), travel at dawn/dusk, breathe through your nose, and stop talking to cut moisture loss.
- Minimum survival water baseline: ~2.0–2.5L/day resting, 3.5–5L/day walking or hot weather.

2. Food vs Water Rule
- Digestion consumes water. If water is critically scarce (<1L/day), avoid high-protein/dry salty foods and stick to small carbohydrate rations until water is secured.`,
  },
  {
    id: 'poison-ingestion',
    title: 'Accidental Poisoning / Toxic Plant Ingestion',
    category: 'Water & Food',
    severity: 'critical',
    keywords: ['poisoned', 'swallowed', 'toxic', 'bleach', 'fuel', 'overdose'],
    response: `POISON INGESTION FIELD PROTOCOL

1. DO NOT Force Vomiting for Caustics or Fuels
- Never induce vomiting if the person swallowed bleach, acid, battery fluid, kerosene, petrol, or is drowsy/seizing (burns throat/lungs a second time).

2. Supportive Care
- Rinse mouth thoroughly and give small sips of clean water (if conscious and swallowing cleanly) for mild irritants.
- If a toxic plant/berry was eaten within 30 minutes and patient is fully awake: activated charcoal (if carried) helps bind alkaloids. Save a sample of the plant/vomit for identification and monitor airway closely.`,
  },
  {
    id: 'sanitation-hygiene',
    title: 'Camp Sanitation & Waste Isolation',
    category: 'Water & Food',
    severity: 'essential',
    keywords: ['toilet', 'hygiene', 'cathole', 'sanitation', 'soap', 'ash', 'disease', 'latrine'],
    response: `FIELD SANITATION PROTOCOL

1. Prevent Outbreaks in Camp
- Poor sanitation kills faster than trauma in prolonged survival. Dig catholes at least 20 cm deep and minimum 60 meters (200 ft) DOWNHILL from all water sources, camps, and trails. Cover completely with soil.

2. Wood Ash Handwashing (No Soap)
- Rub fine cooled white wood ash + clean water on hands for 30 seconds and rinse — alkaline ash lye cuts grease and disrupts pathogens cleanly. Always wash after waste handling and before cooking.`,
  },

  // ================= FIRE, SHELTER & FIELD (16) =================
  {
    id: 'start-fire',
    title: 'All-Weather Fire Starting Protocol',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['fire', 'flame', 'spark', 'tinder', 'warm', 'ferro', 'match', 'lighter', 'wood'],
    response: `TACTICAL FIRECRAFT PROTOCOL

1. Prep ALL Fuel First
- Clear bare earth to 1.5m radius (avoid river stones — can explode). Build 3 piles: Tinder (dry bark/grass/cotton), Kindling (dead standing twigs), Fuelwood (wrist-thick dry hardwood).

2. Wet Weather Secret
- Split dead standing hardwood to reach the dry inner heartwood and shave curly "feather sticks". Build on a flat stick platform above wet mud.

3. Ignition
- Ferro rod: hold striker steady near tinder and pull rod BACKWARD sharply.
- AA/9V Battery + Foil: cut hourglass strip (2 mm center waist), touch + and - terminals to ignite dry tinder in 2 seconds.`,
  },
  {
    id: 'dakota-fire-hole',
    title: 'Dakota Stealth Fire Hole (Low Smoke/Light)',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['dakota', 'stealth fire', 'no smoke', 'hide fire', 'tactical fire'],
    response: `DAKOTA STEALTH FIRE HOLE PROTOCOL

1. Excavation
- Dig main burn pit 30 cm wide × 30 cm deep.
- Dig an angled intake tunnel 30 cm upwind entering the very bottom of the burn pit.

2. Tactical Advantages
- Forced underground draft burns super-hot with half the wood, consumes smoke particles cleanly, conceals flame glow from horizontal sightlines at night, and resists high winds. Fill back with dirt and stomp flat before departing.`,
  },
  {
    id: 'bow-drill-fire',
    title: 'Primitive Friction Fire (Bow Drill)',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['bow drill', 'friction', 'no lighter', 'primitive fire', 'ember'],
    response: `BOW DRILL FRICTION FIRE PROTOCOL

1. Wood Selection
- Use dry, medium-soft non-resinous wood (willow, poplar, cedar, cottonwood) for BOTH the spindle (thumb-thick, 25 cm long) and fireboard (flat, 2 cm thick). Use a hard oiled stone or hardwood socket on top.

2. Execution
- Burn in a shallow divot first, then carve a 45° pie-slice notch reaching the center of the divot. Place a bark ember catch beneath the notch.
- Brace wrist firmly against shin, saw smooth full strokes with downward pressure until thick pungent smoke billows, then speed up 10 seconds to form a glowing black coal. Gently transfer coal to dry bird-nest tinder and blow softly into flame.`,
  },
  {
    id: 'shelter-debris',
    title: 'Emergency Shelter & Ground Insulation',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['shelter', 'camp', 'sleep', 'tarp', 'rain', 'bunker', 'hide', 'night', 'tent', 'debris hut'],
    response: `EMERGENCY SHELTER PROTOCOL

1. Site Check
- Avoid dry riverbeds (flash floods), dead overhead branches, and cold valley bottoms. Choose elevated wind-sheltered ground.

2. Insulate Underneath First
- Build a minimum 15 cm compressed mattress of dry leaves, pine needles, or cardboard before building walls.

3. Debris Hut / Tarp
- Keep interior space tightly sized to your body so body heat warms the pocket. Pile ≥60 cm of dry leaves over a ribbed frame for rain and cold protection.`,
  },
  {
    id: 'urban-shelter-security',
    title: 'Urban Shelter & Perimeter Barricading',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['urban', 'building', 'barricade', 'door', 'lock', 'hide', 'stealth', 'zombie', 'security'],
    response: `URBAN SHELTER & PERIMETER PROTOCOL

1. Room Selection
- Choose 2nd or 3rd floor rooms with solid doors and at least TWO exit routes (avoid ground floor break-in exposure and top floor heat/trap risk).
- Black out windows completely with blankets/cardboard BEFORE using any flashlight at night.

2. Silent Door Barricade & Early Warning
- Wedge wooden doorstops tightly under inward-opening doors and brace heavy furniture at an angle.
- Hang empty cans/keys on fishing line or paracord across stairwell entries as silent perimeter trip-alerts. Maintain strict noise and odor discipline.`,
  },
  {
    id: 'navigation-offgrid',
    title: 'Off-Grid Navigation (Sun, Stars & Pacing)',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['compass', 'north', 'lost', 'navigate', 'direction', 'sun', 'star', 'map', 'gps', 'polaris'],
    response: `OFF-GRID NAVIGATION PROTOCOL

1. Shadow-Stick Solar Compass
- Push a 1m stick upright into sunlit ground. Mark shadow tip (Point 1 = West). Wait 20 min, mark new tip (Point 2 = East). Stand with Point 1 left, Point 2 right -> facing TRUE NORTH (Northern Hemisphere).

2. Night Sky
- Follow the Big Dipper's two outer bowl stars 5× their span straight to Polaris (True North). Orion's Belt rises due East and sets due West.

3. Passive Phone GPS
- Your phone's GPS chip works passively in Airplane Mode with zero cell signal. Open the Offline Map tab for live coordinates and waypoint bearings.`,
  },
  {
    id: 'essential-knots',
    title: '4 Essential Survival Knots',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['knot', 'rope', 'paracord', 'bowline', 'taut-line', 'clove hitch', 'tie'],
    response: `4 ESSENTIAL SURVIVAL KNOTS

1. Bowline (Non-Slip Loop)
- Forms a strong fixed loop that never jams under heavy load and unties easily. Ideal for shelter anchors and rescue loops.

2. Taut-Line Hitch (Adjustable Guyline)
- Wrap working end around standing line twice inside the loop, then once outside. Slides to tighten tarp lines and locks under tension.

3. Clove Hitch (Fast Tree/Pole Anchor)
- Two opposing half-hitches around a pole/tree to start lashings quickly; back up with a half-hitch so it won't slip.

4. Square / Reef Knot (Joining Equal Ropes & Bandages)
- Right over left, then left over right. Flat against skin for tying triangular bandages — never use for heavy climbing loads.`,
  },
  {
    id: 'improvised-cordage',
    title: 'Making Natural Cordage in the Wild',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['cordage', 'string', 'vine', 'bark', 'rope making', 'lashing'],
    response: `NATURAL CORDAGE PROTOCOL

1. Best Plant Fibers
- Inner bark of dead willow, cedar, mulberry, stinging nettle stalks (strip outer green layer), yucca/agave leaves, or strong flexible green vines.

2. Reverse-Wrap 2-Ply Method
- Split fibers into two equal strands. Twist top strand clockwise away from you until tight, then fold it OVER the bottom strand counter-clockwise toward you. Repeat continuously — opposite tension locks fibers into strong break-resistant rope.`,
  },
  {
    id: 'emergency-signaling',
    title: 'Rescue Signaling & Ground-to-Air Codes',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['signal', 'sos', 'rescue', 'whistle', 'mirror', 'helicopter', 'morse', 'flare'],
    response: `EMERGENCY SIGNALING PROTOCOL

1. Universal Rule of Threes
- Three of anything signals distress worldwide: 3 whistle blasts (use the 3kHz Acoustic Whistle in Tools tab), 3 signal fires in a triangle, 3 short-3 long-3 short light flashes (SOS).

2. Signal Mirror & Smoke
- Mirror flash is visible 15+ km in sunlight: form a "V" with fingers around target aircraft and sweep reflected glare across the "V".
- Daytime smoke: throw green leafy branches or rubber onto a hot fire for thick contrast smoke.

3. Ground-to-Air Symbols (Min 3m Tall, High Contrast)
- V = Require Assistance | X = Require Medical Aid | → = Proceeding This Direction | Y = Yes | N = No.`,
  },
  {
    id: 'earthquake-collapse',
    title: 'Earthquake & Structural Collapse Protocol',
    category: 'Fire, Shelter & Field',
    severity: 'critical',
    keywords: ['earthquake', 'collapse', 'tremor', 'aftershock', 'trapped'],
    response: `EARTHQUAKE & COLLAPSE PROTOCOL

1. During Shaking
- DROP to hands/knees, COVER head/neck under a sturdy table or against an interior wall away from glass/shelves, HOLD ON. Do NOT run outside during active shaking (falling glass/masonry kills most runners).

2. If Trapped Under Debris
- Cover mouth/nose with shirt against concrete dust. Do NOT light a match (gas leaks).
- Conserve oxygen — tap rhythmically in sets of 3 on pipes or walls (or trigger Z Survival 3kHz Whistle) instead of shouting endlessly.`,
  },
  {
    id: 'flood-swift-water',
    title: 'Flash Flood & Swift-Water Crossing',
    category: 'Fire, Shelter & Field',
    severity: 'critical',
    keywords: ['flood', 'river crossing', 'swift water', 'monsoon flood', 'current'],
    response: `FLASH FLOOD & RIVER CROSSING PROTOCOL

1. Never Underestimate Moving Water
- Just 15 cm of fast water knocks an adult down; 60 cm sweeps away SUVs. Climb to high ground immediately during flash-flood warnings.

2. Mandatory Stream Crossing Technique
- Unbuckle backpack hip belt and chest strap FIRST so you can dump the pack instantly if swept off your feet.
- Keep boots ON for traction, use a sturdy upstream walking pole (3 points of contact), face upstream, and shuffle sideways at a slight downstream angle. If swept away, float on your back feet-FIRST downstream to deflect rocks.`,
  },
  {
    id: 'battery-power-conservation',
    title: 'Phone Battery & AMOLED Power Conservation',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['battery', 'power', 'charge', 'solar', 'airplane mode', 'phone dead'],
    response: `OFF-GRID PHONE BATTERY PROTOCOL

1. Maximize Survival Runtime (5–7× Longer)
- Turn ON Airplane Mode immediately — searching for dead cell towers drains 50%+ of battery. (Note: GPS satellites still work in Airplane Mode!)
- Lower screen brightness to 15–20%. Pure AMOLED black (#000000) turns pixels completely off, saving huge power.
- Keep phone inside an inner warm jacket pocket in freezing weather (cold cuts lithium battery capacity in half).

2. Power Discipline
- Turn phone completely OFF between scheduled GPS check-ins (e.g., 5 minutes every 4 hours). Charge power banks during midday peak solar.`,
  },
  {
    id: 'radio-comms-plan',
    title: 'Off-Grid Comms & Family Rally Plan',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['radio', 'comms', 'walkie', 'family', 'rally', 'meetup', 'lost group'],
    response: `OFF-GRID COMMS & RALLY PROTOCOL

1. 3-Tier Rally Points
- Primary: Right outside home/neighborhood (fire/local hazard).
- Secondary: 5–10 km away outside city choke points (pin as Safe Zone in Offline Map).
- Tertiary: Regional distant relative/highland location.

2. Scheduled Radio Check-Ins (3-3-3 Rule)
- Conserve handheld radio batteries: turn on every 3 hours (e.g., 06:00, 09:00, 12:00) for 3 minutes on agreed channel. Keep transmissions brief and avoid broadcasting exact shelter coordinates on open channels.`,
  },
  {
    id: 'bug-out-vs-bug-in',
    title: 'Bug-In vs Bug-Out Decision Matrix',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['bug out', 'bug in', 'evacuate', 'stay', 'leave', 'move', 'travel'],
    response: `BUG-IN VS BUG-OUT DECISION PROTOCOL

1. Default to Bug-In (Shelter in Place) When:
- Structure is intact, you have 3+ days water/food, and external chaos/gridlock makes roads a trap.

2. Evacuate Immediately (Bug-Out) When:
- Fire, flood, structural collapse, chemical plume, active local violence, or total water exhaustion makes staying untenable.
- Leave early BEFORE highways lock up, carry paper + offline maps, avoid bridges/chokepoints, and move quietly during low-traffic windows.`,
  },
  {
    id: 'clothing-layering',
    title: 'Cold & Wet Survival Layering System',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['clothes', 'layer', 'cotton', 'wool', 'sweat', 'jacket', 'raincoat'],
    response: `SURVIVAL LAYERING PROTOCOL

1. "Cotton Kills" Rule
- Wet cotton holds water against skin and loses 90% of insulating value. Prioritize wool, fleece, or synthetic base layers.

2. 3-Layer Regulation
- Base Layer: Wicks sweat off skin.
- Mid Layer: Traps warm dead air (fleece/wool/down — or crumpled dry newspaper/leaves stuffed between shirts in an emergency).
- Outer Shell: Blocks wind and rain.
- Vent layers BEFORE sweating heavily during exertion ("Be bold, start cold").`,
  },
  {
    id: 'psychological-survival',
    title: 'Acute Stress, Panic & Survival Mindset',
    category: 'Fire, Shelter & Field',
    severity: 'essential',
    keywords: ['panic', 'fear', 'stress', 'calm', 'anxiety', 'mindset', 'breathe'],
    response: `TACTICAL STRESS & PANIC CONTROL

1. Box Breathing (Instant Heart-Rate Reset)
- Inhale 4 seconds -> Hold 4 seconds -> Exhale 4 seconds -> Hold 4 seconds. Repeat 4 full cycles to shut down adrenaline tunnel vision.

2. Rule of Threes Priority Order
- 3 minutes without air/bleeding control -> 3 hours without shelter in extreme exposure -> 3 days without purified water -> 3 weeks without food.
- Focus strictly on the NEXT concrete 15-minute physical task (boil 1L water, stack insulation, check perimeter).`,
  },
];

export const QUICK_PROTOCOLS: QuickSurvivalProtocol[] = [
  {
    id: 'purify-water',
    label: 'Purify Water',
    prompt: 'How do I purify questionable water to make it safe to drink?',
    severity: 'essential',
    protocolId: 'purify-water',
  },
  {
    id: 'deep-wound',
    label: 'Treat Deep Wound',
    prompt: 'How do I stop severe bleeding and treat a deep wound in the field?',
    severity: 'critical',
    protocolId: 'deep-wound',
  },
  {
    id: 'edible-plants',
    label: 'Edible Plants',
    prompt: 'Which wild plants are safe to eat and how do I test unknown plants?',
    severity: 'essential',
    protocolId: 'edible-plants',
  },
  {
    id: 'start-fire',
    label: 'Start Fire',
    prompt: 'How do I start and maintain a reliable survival fire in tough conditions?',
    severity: 'essential',
    protocolId: 'start-fire',
  },
];

export function getProtocolById(id: string): SurvivalProtocol | undefined {
  return OFFLINE_PROTOCOLS.find((p) => p.id === id);
}

export function searchOfflineProtocols(query: string): SurvivalProtocol[] {
  const clean = query.toLowerCase().trim();
  if (!clean) return OFFLINE_PROTOCOLS;

  const tokens = clean.split(/\s+/).filter((t) => t.length >= 2);

  const scored = OFFLINE_PROTOCOLS.map((protocol) => {
    let score = 0;
    const titleLower = protocol.title.toLowerCase();
    const catLower = protocol.category.toLowerCase();
    const bodyLower = protocol.response.toLowerCase();

    if (titleLower.includes(clean)) score += 12;
    for (const kw of protocol.keywords) {
      if (clean.includes(kw)) score += 10;
      if (kw.includes(clean)) score += 6;
    }

    for (const tok of tokens) {
      if (titleLower.includes(tok)) score += 5;
      if (catLower.includes(tok)) score += 3;
      if (protocol.keywords.some((kw) => kw.includes(tok) || tok.includes(kw))) {
        score += 6;
      }
      if (bodyLower.includes(tok)) score += 1;
    }

    return { protocol, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.protocol);
}

export function queryOfflineRuleEngine(input: string): string {
  const matches = searchOfflineProtocols(input);

  if (matches.length > 0) {
    const primary = matches[0];
    const related = matches.slice(1, 4).map((m) => m.title);
    if (related.length > 0) {
      return `${primary.response}\n\nRelated Offline Protocols: ${related.join(' · ')}`;
    }
    return primary.response;
  }

  return `OFFLINE RULE-ENGINE SUMMARY FOR: "${input.trim()}"

No direct match found across the ${OFFLINE_PROTOCOLS.length} built-in protocols.

Immediate Field Triage Baseline:
1. Airway & Massive Bleeding — Direct pressure for 10+ min or tourniquet 5–8 cm above spurting limb wound.
2. Rule of Threes — 3 min without air, 3 hrs without shelter in harsh exposure, 3 days without purified water, 3 weeks without food.
3. Try searching keywords like: chest wound, snakebite, burn, hypothermia, shock, fracture, ORS, rabies, radiation, shelter, knots, or signaling.`;
}
