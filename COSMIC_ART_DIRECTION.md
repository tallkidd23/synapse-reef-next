# Synapse Cosmos — Cosmic Observatory Art Direction

## Intent

Synapse Cosmos is a museum-grade, browser-native generative artwork. It is not a retro skin placed over a generic simulation. It is a live cosmic ecology rendered as a precise scientific terminal: a recovered observatory whose universe continues to evolve under coupled local rules.

The central claim of the piece is visible truth: every organism, wake, event, and graph must be derived from running state.

## Experience statement

A visitor should feel they have encountered a unique deep-space instrument that has been running long enough to develop its own ecology, memory, and history. From a distance it is an elegant luminous artifact. Up close it becomes an intelligible scientific record.

## Visual hierarchy

1. The observation field is the artwork and occupies roughly 60–70% of the visible screen.
2. The telemetry frame proves that observed change is systemic.
3. The event line explains only consequential state transitions.
4. Controls remain quiet, legible, and subordinate.

No decorative visual effect may compete with an actual emergent event.

## Grid and typography

- Use a fixed character-cell grid rendered through Canvas or WebGL.
- Desktop target: 120 by 68 cells, with integer scaling whenever possible.
- Compact target: a responsive grid that preserves glyph aspect ratio and never hides the observation field behind controls.
- Use a bitmap or terminal-first monospace font with high legibility.
- Treat text as part of the display raster; do not build the main world from thousands of DOM nodes.
- Preserve sharp glyph edges. Any glow is a separate, low-opacity pass.

## Display material

The default display is a clean laboratory view: almost-black blue-green background, crisp character cells, subtle phosphor persistence, and restrained texture.

Scanlines, glass curvature, bezel art, and room presentation belong to an optional exhibition shell. They must not distort the scientific view or make the grid hard to read.

Avoid the fake-CRT failure mode: global blur, constant flicker, strong barrel distortion, heavy bloom, or animation that runs regardless of system state.

## Palette

| Role | Colour family | Meaning |
| --- | --- | --- |
| Structure | blue-grey | frame, labels, dormant text |
| Instrument data | cyan | measurement, graph axes, diagnostics |
| Vitality | phosphor green | colonies, resource availability, stable growth |
| Transit | amber | harvesters, movement, caution |
| Resonance | cyan-white | action potentials, active network propagation |
| Emergence | magenta-violet | mutation, lineage divergence, rare anomalies |
| Threat | controlled red | pursuit, collision, collapse, critical hazard |
| Matter | muted white-grey | dust, debris, neutral infrastructure |

Colour indicates a category or magnitude. It is not a decoration layer. Rare colours remain rare.

## Glyph lexicon

| Glyphs | Entity | State source | Render behaviour |
| --- | --- | --- | --- |
| `.`, `·`, `:` | interstellar debris | debris field `D(p)` | density and drift follow field value and vector flow |
| `+`, `@`, `#` | luminous colony | energy, biomass, resonance | glyph complexity increases with genuine vitality |
| `>`, `»` | drift harvester | velocity, energy, goal vector | orientation follows actual heading |
| `x`, `X` | void hunter | velocity, pursuit state, hunger | appears threatening only during an active pursuit state |
| `o`, `O` | scavenger drone | recycling target, energy | moves toward real debris gradients |
| `:`, `;`, `!` | radiation wake | radiation field `A(p)` | intensity maps to field magnitude and decay |
| `─`, `╱`, `╲` | resonance edge | graph edge and weight | visible only when an edge exists |
| `*`, `✦` | action-potential spark | propagating event | moves along a real graph edge; fades on event completion |
| `?` | anomalous lineage | persistent genomic divergence | reserved for verified rare emergence |

## Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SYNAPSE COSMOS                         DEEP-SPACE ECOLOGICAL OBSERVATORY     │
│ NODE: M-07 / ORBITAL VOID              CLOCK: 018442.73 / SEED: 8C41-A9      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         OBSERVATION FIELD — LIVE                             │
│                                                                              │
├───────────────────┬──────────────────────────┬───────────────────────────────┤
│ BIOSPHERE          │ MATERIAL FIELDS          │ RESONANCE / TRAJECTORY        │
│ COLONIES      038  │ ELEMENTAL  7.42 ███████  │ Φ NET     0.68 ██████        │
│ HARVESTERS    021  │ DEBRIS     3.18 ████     │ STATE     LIMIT CYCLE         │
│ HUNTERS       006  │ RADIATION  1.04 ██       │ Δ MASS    +0.003              │
│ RECYCLERS     009  │ STAR FLUX  1.25 ███████  │ Δ ENERGY  -0.011              │
├───────────────────┴──────────────────────────┴───────────────────────────────┤
│ EVENT: LINEAGE L-03 MUTATED / RADIATION TOLERANCE +0.07 / NODE 61,19         │
│ [SPACE] PAUSE  [R] RESEED  [M] MAP  [T] TELEMETRY  [S] SNAPSHOT  [H] HELP    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Temporal behaviour

- The world changes at a fixed simulation timestep.
- Rendering may run on `requestAnimationFrame`, but rendering never advances the model.
- Trails, glows, and afterimages are bounded historical buffers, not unattended animation loops.
- Event text is produced by resolved state transitions: birth, death, deposit, predation, mutation, regime change, signal propagation, recovery, or collapse.
- The world should contain quiet periods. Calm is evidence of a living system, not an absence of content.

## Interaction

| Key / control | Action |
| --- | --- |
| `Space` | Pause or resume without changing the seed |
| `R` | Reset to the current seed and canonical initial state |
| `M` | Cycle field map overlays |
| `T` | Open scientific telemetry / equations view |
| `S` | Capture a visual snapshot |
| `H` | Open a concise exhibition label and controls guide |

Touch controls must be optional and must not cover the observation field.

## Sound

Sound is opt-in and evidence-driven. Use sparse, low-level event cues only after user activation. Examples include a narrow pulse for real action-potential propagation, a low alert for critical global instability, and a rare chord for verified lineage divergence. No continuous soundtrack is required.

## Exhibition quality gates

- Distance test: reads as a composed autonomous artifact across a room.
- Close test: telemetry and glyphs reward inspection.
- Screenshot test: a single frame looks intentional and collectible.
- Time test: 20 minutes produces visible but coherent history.
- Truth test: every focal effect maps to a real world state.
- Silence test: the work remains compelling with audio disabled.
- Phone test: the universe remains readable at compact size.

## First visual deliverable

The Observatory Shell adds the terminal composition, a sharp ASCII renderer, and read-only telemetry around the recovered simulation. It must not change ecological update logic in its first implementation.
