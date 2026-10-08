# Synapse Cosmos — Recovery and Observatory Milestones

## Baseline

- Protected recovery baseline: `main` at `ae0151f3fe5c0a689d2924f168fdf654b3066429`.
- Architecture branch: `synapse-cosmos-architect`.
- Branch policy: exploratory work happens only on the architecture branch or later feature branches. `main` changes only through a reviewed, tested pull request.

## Operating rules

1. One milestone per commit or tightly scoped pull request.
2. No large unreviewable rewrite of `main.js`.
3. Preserve prior working states with commits before structural changes.
4. Run a smoke test after every behavioural change.
5. Keep render, audio, and model-state code separate.
6. Every new mathematical feature must add telemetry before or with its visual effect.

## Milestone A — Observatory Shell

### Goal

Turn the recovered simulation into a crisp, gallery-grade cosmic observatory without modifying ecological rules.

### Scope

- Add a fixed-cell ASCII renderer or overlay renderer.
- Add a read-only telemetry adapter.
- Add terminal framing, title band, field panels, event line, and control legend.
- Add pause, reset, map, telemetry, snapshot, and help controls.
- Display seed and fixed tick counter.
- Keep existing simulation state and rendering available as a fallback mode.

### Acceptance criteria

- `main` is unchanged.
- Simulation still launches without console errors.
- Pausing stops the model tick but preserves the frame.
- Reset returns to a known initial state.
- HUD values originate from live state, not placeholder timers.
- The observation field remains readable at desktop and phone widths.

## Milestone B — Line-by-Line System Audit

### Goal

Map the actual current `main.js` to the preservation contract.

### Scope

- Identify every global state variable and update function.
- Identify update order and direct rendering mutations.
- Mark each `SYSTEM_AUDIT.md` row with verified implementation evidence.
- Capture current field bounds, population caps, and random sources.
- Add lightweight assertions for NaN, Infinity, and out-of-range field values.

### Acceptance criteria

- Each implemented system has a concrete function/data reference.
- Unknown systems remain marked SPECIFICATION rather than assumed present.
- No implicit renderer-to-model mutation remains undisclosed.

## Milestone C — Deterministic World Core

### Goal

Make the ecosystem debuggable and reproducible.

### Scope

- Introduce a seeded pseudorandom number generator.
- Route simulation randomness through it.
- Introduce a fixed timestep clock.
- Separate world update from rendering.
- Expose seed, tick, and replay reset controls.

### Acceptance criteria

- Same seed and same fixed input sequence create equivalent summary traces.
- Rendering frame rate does not alter simulation results.
- Reset is deterministic.

## Milestone D — Conservative Cosmic Fields

### Goal

Formalize resource, debris, and radiation mathematics as explicit field subsystems.

### Scope

- Implement double-buffered scalar fields.
- Use conservative diffusion-decay-source updates for radiation wakes.
- Implement explicit debris-to-resource transformation.
- Track clamped overflow and dissipation.
- Add map modes for elemental flux, stellar debris, and radiation.

### Acceptance criteria

- Field updates do not use in-place neighbour contamination.
- Field totals, sources, sinks, and residuals appear in telemetry.
- Radiation wakes diffuse and decay from real events.

## Milestone E — Cosmic Ecology

### Goal

Translate terrestrial agents into a coherent cosmic ecosystem without replacing their local mechanics with scripted scenes.

### Scope

- Rename and render plant analogues as luminous colonies.
- Render grazers as drift harvesters.
- Render predators as void hunters.
- Render detritivores as scavenger drones.
- Rename seasonal regimes as stellar epochs.
- Preserve the actual energy, pursuit, feeding, death, and recycling logic.

### Acceptance criteria

- All cosmic terms map to documented state variables.
- Glyph orientation and event logs originate from real agent state.
- No timed fake encounter sequence is introduced.

## Milestone F — Resonance and Collective Memory

### Goal

Implement the graph-based signal layer as an observable adaptive system.

### Scope

- Build the colony/resonance graph.
- Propagate bounded action-potential events.
- Add Hebbian strengthening with passive relaxation.
- Render genuine edges and travelling signal sparks.
- Add graph and average-weight telemetry.

### Acceptance criteria

- Every drawn edge has a graph counterpart.
- Every spark follows a real edge.
- Weights cannot saturate permanently without relaxation evidence.

## Milestone G — Evolution and Phase Space

### Goal

Make emergence inspectable across generations and population cycles.

### Scope

- Formalize genomes and mutation bounds.
- Add lineage records and trait distributions.
- Define persistent divergence criteria for anomaly/speciation labels.
- Add a rolling population phase-space trace.
- Classify broad states: equilibrium, limit cycle, collapse risk, irregular.

### Acceptance criteria

- Mutation records contain seed, parent, child, trait change, and tick.
- Rare lineage glyphs appear only after threshold conditions.
- Phase classification uses documented numeric rules.

## Milestone H — Exhibition Finish

### Goal

Deliver a presentation-ready digital artwork without compromising readability or truth.

### Scope

- Calibrate palette, persistence, and restrained bloom.
- Add optional exhibition bezel / CRT shell outside the laboratory view.
- Add a concise field-notes help screen.
- Add snapshot export.
- Validate desktop, phone, quiet room, and long-running performance modes.

### Acceptance criteria

- Museum quality gates in `COSMIC_ART_DIRECTION.md` pass.
- Audio is optional and event-driven.
- No visual layer changes the simulation state.
- A reviewable pull request documents final changes before merge to `main`.

## Current command

Proceed with Milestone A planning and source audit. The first code change after this planning commit must be small, visually verifiable, and reversible.
