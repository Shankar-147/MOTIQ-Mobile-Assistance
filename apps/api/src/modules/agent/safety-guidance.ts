/**
 * Deterministic, human-reviewed safety guidance for a driver waiting for roadside help. Content
 * is fixed on purpose — the model may only relay it, never improvise (and never gives repair
 * instructions: the rule is "get safe, call for help", not "fix it yourself").
 */
export const SAFETY_SITUATIONS = [
  "FLAT_TYRE",
  "BATTERY_DEAD",
  "OUT_OF_FUEL",
  "OVERHEATING",
  "BREAKDOWN_ON_HIGHWAY",
  "WARNING_LIGHT",
  "OTHER",
] as const;

export type SafetySituation = (typeof SAFETY_SITUATIONS)[number];

const COMMON = [
  "Switch on your hazard lights.",
  "If you can, move the vehicle off the carriageway; otherwise stay put with the handbrake on.",
  "Everyone should get out on the side away from traffic and wait behind a barrier or well off the road.",
  "Keep valuables out of sight and don't accept help from strangers who offer to 'fix' it for cash.",
];

const SPECIFIC: Record<SafetySituation, string[]> = {
  FLAT_TYRE: [
    "Don't keep driving on a flat tyre — it can damage the wheel and make the car hard to control.",
    "Only attempt a wheel change yourself if you are on firm, level ground well away from traffic. Otherwise request a MOTIQ provider.",
  ],
  BATTERY_DEAD: [
    "Turn off the lights, AC and music to avoid draining the battery further.",
    "A MOTIQ provider can jump-start or replace it; avoid connecting cables yourself unless you know how.",
  ],
  OUT_OF_FUEL: [
    "Do not try to restart repeatedly — it can strain the fuel pump.",
    "Request fuel delivery through MOTIQ and wait in a safe spot.",
  ],
  OVERHEATING: [
    "Switch the engine off and wait. Do NOT open the radiator or coolant cap while it is hot — it can cause serious burns.",
    "If you see smoke or flames, move well away from the vehicle and call 112 immediately.",
  ],
  BREAKDOWN_ON_HIGHWAY: [
    "A highway is the most dangerous place to wait: get everyone behind the crash barrier or as far from the lane as possible.",
    "If you have a reflective triangle, place it well behind the vehicle. Share your live location with someone you trust.",
  ],
  WARNING_LIGHT: [
    "A red warning light means stop safely as soon as you can; amber means get it checked soon.",
    "If the car feels unsafe to drive, request a tow instead of continuing.",
  ],
  OTHER: ["If you feel unsafe at any point, press the SOS button in the app or call 112."],
};

export function getSafetyGuidance(situation: SafetySituation): { steps: string[]; emergencyNumber: string } {
  return { steps: [...SPECIFIC[situation], ...COMMON], emergencyNumber: "112" };
}
