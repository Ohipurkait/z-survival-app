export interface FieldManualSection {
  id: string;
  category:
    | 'Water Purification'
    | 'First Aid & Trauma'
    | 'Fire Starting'
    | 'Shelter'
    | 'Navigation';
  summary: string;
  guides: Array<{
    title: string;
    steps: string[];
    warning?: string;
  }>;
}

export const FIELD_MANUAL_SECTIONS: FieldManualSection[] = [
  {
    id: 'water-purification',
    category: 'Water Purification',
    summary: 'Boiling, bleach dosing, layered charcoal filtration, SODIS & dew collection',
    guides: [
      {
        title: 'Rolling Boil (Gold Standard)',
        steps: [
          'Pre-filter cloudy water through clean cloth, bandana, or coffee filter.',
          'Bring water to a full rolling boil for 1 full minute at sea level.',
          'Above 2,000 meters (6,500 ft / mountain terrain): boil for 3 full minutes.',
          'Cool in a covered clean container; pour back and forth between clean vessels to improve flat taste.',
        ],
        warning:
          'Boiling kills bacteria, viruses, and protozoa, but does NOT remove heavy metals, fuel, or chemical runoff.',
      },
      {
        title: 'Household Bleach Disinfection (5%–8.25% Sodium Hypochlorite)',
        steps: [
          'Use ONLY plain unscented liquid bleach (never splashless, scented, or color-safe).',
          'Clear water: add 2 drops per 1 liter (8 drops per gallon).',
          'Cloudy water: pre-filter first, then double dose to 4 drops per 1 liter.',
          'Stir thoroughly and let stand for 30 full minutes. Water should have a faint chlorine smell; if not, repeat dose once and wait 15 minutes.',
        ],
      },
      {
        title: 'Improvised Bottle Filter + Solar Disinfection (SODIS)',
        steps: [
          'Cut the bottom off a clean plastic bottle and invert it. Layer from spout upward: tight cloth -> 5 cm crushed wood charcoal -> 5 cm fine sand -> 5 cm small gravel.',
          'Pour muddy water slowly through the filter until it runs visually clear.',
          'For zero-fuel disinfection, fill a clear PET bottle (<2L) with clear filtered water, shake 20 seconds to oxygenate, and lay flat in direct sunlight for 6 hours (48 hours if overcast).',
        ],
      },
      {
        title: 'Dew Harvesting & Solar Still',
        steps: [
          'Tie absorbent cotton cloths around your ankles before dawn and walk through tall uncontaminated grass; wring water into a container.',
          'For a solar still: dig a 1m wide × 60cm deep pit in sunny ground, place a catch cup in the center, surround with green non-toxic leaves, seal the pit with clear plastic sheeting weighted by a small pebble directly above the cup.',
        ],
      },
    ],
  },
  {
    id: 'first-aid-trauma',
    category: 'First Aid & Trauma',
    summary: 'MARCH bleeding control, improvised tourniquets, burns, splints & field ORS',
    guides: [
      {
        title: 'Massive Bleeding & Improvised Tourniquet',
        steps: [
          'Expose the wound fully and apply firm direct pressure with both hands using clean gauze/cloth for 10 continuous minutes. Do not lift to peek — stack fresh cloth on top if soaked.',
          'For deep junctional wounds (groin, armpit, thigh): pack clean cloth tightly directly into the wound cavity down to the source and hold firm pressure for 5 minutes.',
          'For spurting bright-red arterial limb bleeding: place a wide cloth band (≥5 cm wide, never wire) 5–8 cm ABOVE the wound (never on a joint), tie an overhand knot, insert a strong stick windlass, twist until bleeding stops completely, and tie the stick down.',
          'Write the exact application time on the patient’s forehead or bandage.',
        ],
        warning:
          'Never remove deeply impaled objects — pack bulky dressings around them to stabilize in place.',
      },
      {
        title: 'Field Burn Care & Shock Prevention',
        steps: [
          'Cool thermal burns immediately under cool (never ice) running water for 15–20 minutes.',
          'Remove rings, watches, and tight clothing before swelling starts; never peel off fabric melted to skin.',
          'Leave intact blisters unbroken. Cover loosely with clean non-stick dressing or clean plastic cling wrap.',
          'Treat for shock: lay patient flat, insulate from cold ground, cover with blanket, and elevate legs 20–30 cm if no head/spinal injury.',
        ],
        warning: 'Never put butter, cooking oil, ash, or toothpaste onto burns.',
      },
      {
        title: 'Fracture Immobilization (Splinting)',
        steps: [
          'Check Pulse, Movement, and Sensation (PMS) beyond the break before and after splinting.',
          'Pad the limb with cloth and brace with two rigid supports (sticks, rolled cardboard, poles) extending past BOTH the joint above and the joint below the break.',
          'Tie cloth strips snug but never cutting off circulation; never tie knots directly over the fracture site.',
        ],
      },
      {
        title: 'WHO Oral Rehydration Solution (Dehydration & Diarrhea)',
        steps: [
          'Start with 1 liter of boiled/purified clean water.',
          'Dissolve 6 level teaspoons of sugar and 1/2 level teaspoon of table salt completely.',
          'Sip slowly (small mouthfuls every 2–3 minutes) if vomiting or heat-exhausted.',
        ],
        warning: 'Solution must taste no saltier than tears — excess salt worsens dehydration.',
      },
    ],
  },
  {
    id: 'fire-starting',
    category: 'Fire Starting',
    summary: 'Fuel triangle prep, wet-weather feather sticks, sparks & stealth fire holes',
    guides: [
      {
        title: 'The 3-Pile Rule (Prep Before Igniting)',
        steps: [
          'Clear bare earth/rock to 1.5m radius (avoid smooth wet river stones — trapped moisture can explode when heated).',
          'Gather a basketball-sized pile of fine Tinder (dry bark fibers, dry grass, lint, cotton + petroleum jelly, char cloth).',
          'Gather an armful of dry Kindling snapped from dead standing branches off the ground (matchstick to thumb thickness).',
          'Stack wrist-to-forearm thick dead Fuelwood upwind before striking your first spark.',
        ],
      },
      {
        title: 'Starting Fire in Pouring Rain',
        steps: [
          'Harvest dead standing hardwood branches — their inner heartwood stays bone dry even in storms.',
          'Split a wrist-thick branch down the middle with a fixed-blade knife, then shave thin curly "feather sticks" from the dry core.',
          'Lay a raft of flat split sticks on muddy ground so your ember never touches wet earth, and shield the flame with a bark windbreak.',
        ],
      },
      {
        title: 'Alternative Ignition (Ferro Rod & Battery+Foil)',
        steps: [
          'Ferro Rod: hold the striker steady 2 cm from your tinder nest and pull the ferro rod BACKWARD sharply to rain sparks into the nest without scattering it.',
          'AA / 9V Battery + Foil: cut a gum wrapper or foil strip into an hourglass shape with a 2 mm thin center waist. Press foil ends to + and - terminals; the narrow center glows red-hot and ignites dry tinder in 2 seconds.',
        ],
      },
      {
        title: 'Dakota Fire Hole (Low-Smoke Tactical Fire)',
        steps: [
          'Dig a vertical burn pit 30 cm wide and 30 cm deep in firm soil.',
          'Dig a second angled air-intake tunnel 30 cm upwind connecting into the bottom of the burn pit.',
          'Build a compact fire in the main pit: the updraft burns hotter with half the wood, hides open flame light at night, and drastically reduces visible smoke.',
        ],
      },
    ],
  },
  {
    id: 'shelter',
    category: 'Shelter',
    summary: 'Site selection, ground insulation, debris huts, tarps & urban safety',
    guides: [
      {
        title: 'Site Selection (The 5 W’s)',
        steps: [
          'Check overhead for dead hanging limbs ("widowmakers") and rockfall slopes.',
          'Avoid dry riverbeds (flash flood hazard) and low valley floors where cold dense air pools overnight.',
          'Select slightly elevated ground with natural windbreak and rainwater drainage away from your sleeping spot.',
        ],
      },
      {
        title: 'Ground Insulation First (Conductive Heat Loss)',
        steps: [
          'Cold ground drains body heat 25× faster than air — insulate underneath BEFORE building a roof.',
          'Pile at least 15–20 cm of compressed dry leaves, pine needles, dry ferns, cardboard, or backpacks beneath your entire body length.',
        ],
      },
      {
        title: 'Emergency Debris Hut & Tarp A-Frame',
        steps: [
          'Debris Hut: prop a sturdy 2.5m ridgepole on a waist-high stump/fork, lean ribbed sticks along both sides just wide enough for your shoulders, and pile at least 60 cm of dry leaves/debris over the frame.',
          'Tarp A-Frame: string paracord taut between two trees at waist height using a bowline and taut-line hitch, drape tarp evenly, and stake corners angled into the wind.',
          'Keep interior volume small so your body heat warms the trapped air pocket.',
        ],
      },
    ],
  },
  {
    id: 'navigation',
    category: 'Navigation',
    summary: 'Shadow-stick solar compass, night stars, dead reckoning & STOP protocol',
    guides: [
      {
        title: 'Shadow-Stick Method (Daytime True North)',
        steps: [
          'Push a straight 1m stick vertically into flat sunlit ground and mark the tip of its shadow with a stone (Point 1 = West).',
          'Wait 15–20 minutes and mark the new shadow tip with a second stone (Point 2 = East).',
          'Draw a line from Point 1 to Point 2 (West-to-East line). Stand with Point 1 at your left foot and Point 2 at your right foot — you are facing TRUE NORTH (Northern Hemisphere).',
        ],
      },
      {
        title: 'Nighttime Navigation (North Star & Orion)',
        steps: [
          'Northern Hemisphere: locate the Big Dipper’s outer two bowl stars ("Pointer Stars"). Follow their line 5× their distance straight to Polaris (North Star) — directly above True North.',
          'Equatorial / General East-West: Orion’s Belt (three bright evenly spaced stars) rises due East and sets due West anywhere on Earth.',
        ],
      },
      {
        title: 'Lost-Person STOP Protocol & Pace Counting',
        steps: [
          'STOP: Sit down, Think calmly, Observe landmarks/water/weather, Plan your route before walking aimlessly.',
          'Measure your personal 100m pace count on flat ground (typically 60–65 double-steps counting every left foot strike). Drop a pebble in your pocket every 100m to track distance offline without GPS.',
          'Passive GPS Note: your phone’s GPS chip receives satellite signals even in Airplane Mode with zero cell towers — use the Offline Map tab to check coordinates and waypoint bearings.',
        ],
      },
    ],
  },
];
