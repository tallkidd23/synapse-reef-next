# Synapse Cosmos — System Audit

## Purpose

This document is the preservation contract for Synapse Cosmos. It records the mathematical subsystems that define the simulation, the state each system owns, the telemetry that proves it is running, and the validation required before visual work can claim a subsystem is preserved.

The active architecture branch begins from the recovered `main` baseline at commit `ae0151f3fe5c0a689d2924f168fdf654b3066429`. `main` is not to be used for exploratory rewrites.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| IMPLEMENTED | A stateful code path is verified in the current runtime and has telemetry. |
| PARTIAL | A code path exists but its inputs, outputs, bounds, or telemetry are incomplete. |
| SPECIFICATION | Present in the original mathematical design, but not yet verified as an executable subsystem. |
| PLANNED | A defined Synapse Cosmos extension not yet introduced into the simulation. |

## Audit rules

1. A renderer must never mutate the world model.
2. Each state update must identify its previous state, source terms, sinks, bounds, and timestep.
3. Every random decision must use the simulation seedable random source.
4. Each field and agent class needs a HUD-visible metric.
5. No subsystem may be called preserved solely because a similar visual effect exists.
6. `main` remains the recovery baseline until a tested pull request is approved.

## System inventory

| ID | Subsystem | Core state | Intended mathematical role | Current audit status | Required proof |
| --- | --- | --- | --- | --- | --- |
| SYS-01 | Domain topology | grid width, grid height, coordinate transform | Periodic or bounded discrete domain; Moore and von Neumann adjacency | PARTIAL | Document boundary rule and show wrap/boundary test |
| SYS-02 | Elemental substrate field | `S(p)` | Local available resource in `[0,Smax]` | PARTIAL | Display min, mean, max, and total mass |
| SYS-03 | Stellar debris field | `D(p)` | Recyclable detritus / matter reservoir | PARTIAL | Verify sources, decomposition sink, and field bounds |
| SYS-04 | Radiation-wake field | `A(p)` | Diffusion-decay avoidance or stress signal | PARTIAL | Verify conservative Laplacian, decay, sources, and clamping |
| SYS-05 | Stellar epoch controller | epoch id, flux, moisture/radiation factors | Global cyclic environmental forcing | PARTIAL | Log regime transitions and parameter values |
| SYS-06 | Luminous colonies | position, energy, age, biomass, defence, lineage | Stationary resource-generating autotroph analogue | PARTIAL | Show energy budget, births, deaths, and crowding |
| SYS-07 | Drift harvesters | position, velocity, energy, genome, state | Mobile resource consumer / grazer analogue | PARTIAL | Show movement objective, intake, alarm response, and death |
| SYS-08 | Void hunters | position, velocity, energy, pursuit state | Predator / interceptor analogue | PARTIAL | Show pursuit, successful contacts, starvation, and energy balance |
| SYS-09 | Scavenger drones | position, energy, recycle rate | Debris-to-substrate recycling guild | PARTIAL | Verify `D -> S` conversion and conservation residual |
| SYS-10 | Trophic interaction layer | encounter, bite, transfer, mortality | Individual-level food-web interactions | PARTIAL | Event log must originate from actual resolved interactions |
| SYS-11 | Resonance graph | vertices, edges, `W(i,j)` | Adaptive communication / neural lattice | SPECIFICATION | Graph count, edge weights, and connection visualization |
| SYS-12 | Action potentials | `Phi(i)`, active events | Propagating signal / disturbance memory | SPECIFICATION | Trace event source, path, gain, and decay |
| SYS-13 | Hebbian plasticity | `W(i,j)` | Co-activation reinforcement with relaxation | SPECIFICATION | Show strengthened and decayed weights over time |
| SYS-14 | Evolution | genome vector, lineage id, mutation history | Drift, adaptation, and morphological divergence | PARTIAL | Seeded mutation log and trait distribution panel |
| SYS-15 | Reproduction and senescence | thresholds, age, biomass deposit | Population renewal and material cycling | PARTIAL | Birth/death counters and biomass deposition trace |
| SYS-16 | Macro telemetry | counts, field means, energy, mass | Observable global state | PARTIAL | One sampled record every four fixed ticks |
| SYS-17 | Phase-space analysis | history of `P,H,C` | Detect equilibrium, cycle, collapse, or irregular dynamics | SPECIFICATION | Render trace and declare classification criteria |
| SYS-18 | ASCII observatory renderer | character buffer, palette, camera mode | Read-only presentation of world state | PLANNED | Renderer must not own ecological state |
| SYS-19 | Audio evidence layer | opt-in event queue | Sparse sound tied only to real transitions | PARTIAL | User-initiated audio and event-to-sound mapping |
| SYS-20 | Replay and seed system | seed, tick, reset snapshot | Repeatable debugging and artwork preservation | PLANNED | Same seed + controls produces equivalent world evolution |

## Canonical field equations

### Radiation wake: diffusion, decay, source

The radiation/warning field uses a conservative 8-neighbour discrete Laplacian:

```text
A[t+1](p) = clamp(
  A[t](p)
  + D_A * (mean_{q in N8(p)} A[t](q) - A[t](p))
  - lambda_A * A[t](p)
  + I_A(p,t),
  0, A_max
)
```

This replaces any formulation that only adds neighbouring values, because a valid diffusion term redistributes field mass rather than creating it.

### Debris decomposition and elemental recycling

```text
removed(p) = min(D[t](p), k_decomp * D[t](p))
D[t+1](p) = D[t](p) - removed(p)
S[t+1](p) = min(S_max, S[t](p) + eta_recycle * removed(p))
```

Any difference caused by clamping at `S_max` must be counted as overflow or dissipation in conservation telemetry.

### Colony energy budget

```text
E[t+1] = clamp(
  E[t]
  + growth * stellarFlux * localLight
  + mineralUptake
  - maintenance
  - crowdingCost
  - stressCost,
  0, E_max
)
```

### Hebbian weight with relaxation

```text
W[t+1](i,j) = clamp(
  W[t](i,j)
  + eta_hebb * activity(i) * activity(j)
  - rho_relax * (W[t](i,j) - W_base),
  W_min, W_max
)
```

## Fixed update contract

Each fixed simulation tick must execute in this order:

1. Advance stellar epoch parameters.
2. Add external field sources and disturbances.
3. Update diffusion and decay fields from read-only previous buffers.
4. Decompose debris and recycle material.
5. Update stationary colony metabolism and growth.
6. Update mobile agent sensing and movement.
7. Resolve feeding, predation, recycling, death, and deposits.
8. Propagate resonance events.
9. Apply plasticity and passive decay.
10. Apply reproduction, mutation, and lineage bookkeeping.
11. Derive telemetry from the completed world snapshot.
12. Render without mutating state.

## Validation gates

A subsystem can move to IMPLEMENTED only when all relevant gates pass:

- Bounds: no invalid value, NaN, Infinity, or out-of-range field persists.
- Conservation: resource, debris, and explicit losses are reconciled within a reported tolerance.
- Determinism: the same seed and input sequence reproduce an equivalent trace.
- Observability: a HUD metric or event record demonstrates the subsystem.
- Isolation: visual and audio layers do not change mathematical state.
- Performance: fixed tick work remains under the target budget for the selected world scale.

## Next audit task

Read the current `main.js` line by line and populate each row with concrete function names, data structures, update ordering, and verified status. No equation will be declared preserved until that inventory is complete.
