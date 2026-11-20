# Shadow of the Ember Clan — build specification

Approved direction: 23 October 2026. Original isometric pixel action adventure inspired by the atmosphere of The Last Ninja. This is a local-first browser game, not a C64 emulator.

## Runtime and visual contract

- Buildless HTML, CSS and JavaScript; Canvas 2D with a 768 × 480 internal frame, nearest-neighbour scaling. No CDN, account, runtime downloads or build tool required.
- Original deterministic pixel scenery and sprite atlas. Player and enemy silhouettes must remain readable against the scenery. Eight facing directions, locomotion, attack, guard, dodge, injury and death poses. Four enemy archetypes plus five region guardians.
- Approved generated loading and intro artwork is used for presentation. Actual gameplay is rendered from tiles, props and animated sprites; the concept screenshot is not a gameplay backdrop.
- Ink navy #09121c, slate teal #284852, moon ivory #f0ddae, ember #e67a38, moss #4f6954. Regional palette variants. Fixed game frame with quiet supporting controls; no dashboard UI.
- Keyboard, gamepad and touchscreen support. Reduced-motion mode, independent music/effects volume, pause on focus loss, visible focus, controls reference. Keyboard remapping is out of scope for this first release.

## Systems

Continuous movement in screen directions, solid world collision, navigation-aware enemies, sword arcs with windup/cooldown, directional guarding, dodge invulnerability with stamina cost, limited throwing stars. No unavoidable contact damage. Difficulty settings modify incoming damage and enemy health.

Three recoverable relics and a region-specific ordered three-node puzzle unlock a guardian. Winning opens the next region. Each region includes a healing save shrine and a guide with the puzzle clue. Save records include version, settings, level and a checkpoint snapshot of objectives, enemies, puzzle, health and supplies. Death restores that checkpoint; a new game resets campaign progress only.

Web Audio synthesizes original multi-voice music with regional note sequences, pulse/saw/triangle voices, noise drums, envelopes and separate effect cues. No sampled copyrighted music. Audio begins only after a user gesture. Title, intro, level themes, guardian variation and ending/credits use the same original score system.

## Implementation checkpoints and pass criteria

1. Foundation: launch locally without a build; loading/title/intro screens work; start, continue, settings and controls are usable.
2. Harbour vertical slice: traverse the map, fight guards, collect all relics, solve the sluice puzzle, save, die/restore, defeat guardian and reach level two.
3. Asset and audio pipeline: export original sprite atlas; inspect facing/animation states; music and effects can be independently muted; no external asset dependency.
4. Full campaign: all five maps have reachable objectives and distinct environment, enemies, clue, puzzle, guardian and original musical sequence; transitions preserve campaign progress.
5. Presentation and persistence: intro is skippable, ending and credits complete, checkpoints survive reload, pause prevents simulation damage, settings persist.
6. Verification: Node checks for world connectivity/combat/save/puzzle rules; browser tests for startup, input, rendering, audio setup, settings, checkpoint persistence and full campaign logic. Screenshot review at desktop and mobile sizes. Record exact coverage and limits in VALIDATION.md.

## Delivery

Deliver source, a double-clickable index.html, Windows launcher, portable ZIP, build/layout documents, sprite atlas, and verification report. A complete implemented campaign is distinct from a human balance-tested commercial release. Report actual verification rather than implying concept art fidelity or exhaustive device coverage.
