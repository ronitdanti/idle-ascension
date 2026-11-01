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

  /**
   * Charged Meditation. Each second away charges `fluxPerAwaySec` Ki Flux (a bank of bonus
   * game-seconds). Speed Up runs the game at xN and burns (N - 1) Flux per real second.
   * 0.25 means a full 12 h absence fills the 3 h cap, and spending all of it adds at most
   * 25% on top of what offline progress already paid.
   */
  fluxPerAwaySec: 0.25,
  fluxCapSec: 3 * 3600,
  speedLevels: [2, 3, 5],
} as const;
