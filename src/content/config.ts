// Tunable engine constants. Gameplay numbers live in content files, not engine code.
export const CONFIG = {
  /** Simulation ticks per second. */
  tickHz: 10,
  autosaveSec: 15,
  /** Minimum real seconds between rolling-backup rotations. */
  backupEverySec: 600,
  /** Away time shorter than this does not show a Welcome-back sheet. */
  welcomeMinSec: 60,
  /** Longest single frame the loop will simulate at normal speed. */
  maxFrameDt: 1,

  /** Placeholder automatic Ki income until Training Grounds arrives in Milestone 2. */
  baseKiPerSec: 4,

  offlineCapSec: 12 * 3600,
  restedCapSec: 4 * 3600,
  restedMultiplier: 2,
} as const;
