# Sentient v3.0: Product Requirement Document (Gold Master)

**Version:** 3.0 (Gold Master)
**Role:** Product Lead & Senior Architect
**Status:** **APPROVED FOR BUILD**

---

## 1. Executive Vision: The Performance Intelligence Engine

**Sentient is a Performance Intelligence Engine.**

We combine the rigorous data science of elite fitness trackers with the directive-based guidance of a System Analyst.

*   **The Pivot:** We do not "play" a game (XP, Levels). We "operate" a biological system (Biometrics, Alignment).
*   **The Core Loop:** Observe State $\rightarrow$ Issue Directive $\rightarrow$ Measure Alignment.

### 1.1 The Core Reframe

| Old World (v2 – Gamified RPG) | New World (v3 – Performance Intelligence) |
| ----------------------------- | ----------------------------------------- |
| Player Identity               | **Operator Identity**                     |
| XP & Leveling                 | **Alignment & Calibration**               |
| Quests                        | **Directives**                            |
| Grinding                      | **Cost Management**                       |
| Winning                       | **Operating Accurately**                  |

> **"We do not reward raw effort; we reward Alignment—the strategic discipline to execute the plan, even when the plan is to rest."**

---

## 2. Ubiquitous Language (The Code of Law)

Strict semantic enforcement across DB, UI, and AI. This table is the **Absolute Source of Truth**.

| Category | Concept | **CANONICAL TERM** | Definition / Logic | Allowed Synonyms / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Identity** | The User | `OPERATOR` | The human pivot point running the biological system. | ❌ Player, User, Avatar |
|  | The Interface | `ANALYST` | The system’s narrative persona. Clinical, objective, precise. | ❌ Coach, Game Master |
|  | Strategy Agent | `PLANNER` | AI logic calculating the 3-Day Arc. | Internal Logic Only |
|  | Tactics Agent | `OPERATIVE` | AI logic generating specific Sessions. | Internal Logic Only |
| **Biometrics** | Baseline Recovery | `VITALITY` | Baseline capacity to absorb stress (0–100). | System Integrity (❌ Health, HP) |
|  | Daily Energy | `ADAPTIVE_CAPACITY` | Fuel available for today's stress (0-100%). | Daily Tank (❌ Mana, Battery) |
|  | Work Cost | `PHYSIOLOGICAL_LOAD` | The metabolic/neural cost of work. | Load, Cost (❌ XP, Strain, Score) |
| **Work** | Activity Block | `SESSION` | A bounded period of physical exertion. | Workout, Activity (❌ Quest) |
|  | Daily Goal | `DIRECTIVE` | The strategic objective for the 24h window. | Orders, Plan (❌ Mission) |
|  | Specific Intent | `SESSION_FOCUS` | The physiological stimulus target (e.g., "Zone 2"). | Target, Intent (❌ Challenge) |
| **States** | Green State | `READY_FOR_LOAD` | Surplus capacity. Primed for stress. | "Prime, Go Mode" |
|  | Blue State | `BUILDING_CAPACITY` | Recovering from recent positive stress. | "Adaptation, Standard" |
|  | Yellow State | `NEEDS_STIMULATION` | Insufficient stimulus detected over time. | Stagnation |
|  | Orange State | `HIGH_STRAIN` | Neural saturation. Risk of burnout. | "Overreaching, Warning" |
|  | Red State | `PHYSICAL_STRAIN` | Structural tolerance compromised. | Injury Risk |
|  | Purple State | `RECOVERY_MODE` | Acute system failure (Immune/Viral). | "Sickness, Viral" |
| **Progression** | Execution Score | `ALIGNMENT_SCORE` | Rolling 30-day accuracy of adherence (%). | Alignment, Accuracy (❌ Level, Rank) |
|  | Reliability Chain | `CONSISTENCY` | Consecutive days of Alignment. | "Streak, Chain" |
|  | Total Volume | `THE_GRIND` | Accumulating Load from any activity. | "Total Load, Volume" |
| **Classes** | Elite Tier | `OPERATOR_CLASS` | >90% Alignment Score. | Gold Styling |
|  | Standard Tier | `CANDIDATE_CLASS` | 70–89% Alignment Score. | Silver Styling |
|  | Warning Tier | `UNCALIBRATED` | <70% Alignment Score. | Red Styling (❌ Noob, Beginner) |
| **Logic** | Logic Switch | `DAWN_PROTOCOL` | App launch logic (Advance vs. Regenerate). | Daily Reset |
|  | Calibration | `ZERO_DAY_PROTOCOL` | First launch logic (Fetch 30-day history for instant state). | "Init, Onboarding" |
|  | Correction | `INTRA_DAY_RECAL` | Mid-day logic update triggered by significant data change. | Course Correction |
|  | Planning Window | `3_DAY_ARC` | The Strategy: Today (Exec), Tomorrow (Prep), Horizon (Outlook). | The Plan |
|  | Validation | `CHECK_IN` | Scanning sensors to verify Session completion. | "Verify, Sync" |
| **UX Features** | Education | `CONTEXTUAL_INTEL` | Tap-to-Explain interaction pattern (Concept Modals). | "Insight, Info" |
|  | Data Proof | `THE_VAULT` | Secondary view showing raw trend lines for trust. | "Trends, Charts" |
|  | User Input | `MISSION_VARIABLES` | User tags (Alcohol, Caffeine, Injury). | "Journal, Tags" |

### 2.1 The Two-Layer Language Standard (Canonical vs. Human-Readable)

**Requirement:** Sentient must maintain strict internal vocabulary while presenting calm, human-readable labels in the UI.

This is a **two-layer system**:

1.  **Canonical Layer (Internal / System Truth)**
    - The app’s data model, database keys, engine outputs, and AI prompts MUST use the canonical terms above (e.g., `READY_FOR_LOAD`, `VITALITY`, `DIRECTIVE`).
    - Canonical terms are **never “prettified”** internally and are the only valid identifiers for state/logic.

2.  **Display Layer (UI / Human-Readable)**
    - The UI MAY use human-readable labels, but ONLY as a deterministic translation of a canonical term.
    - The UI MUST NOT invent replacement concepts that override the canonical system (e.g., “Training”, “Detraining”, “Overreached” are forbidden if they replace `BUILDING_CAPACITY`, `NEEDS_STIMULATION`, `HIGH_STRAIN`, etc.).
    - Human-readable labels are **not new taxonomy**. They are **translations**.

**Single Source of Truth:** The product must define a centralized translation table for each canonical domain:
- **States:** `READY_FOR_LOAD` → “Ready for Load”, `BUILDING_CAPACITY` → “Building Capacity”, etc.
- **Directives:** `DIRECTIVE.category` + `stimulus_type` translate into short readable labels (e.g., “Strength — Overload”) without changing the underlying token pair.
- **Metrics:** `VITALITY`, `ADAPTIVE_CAPACITY`, `PHYSIOLOGICAL_LOAD` receive stable labels + units.

**Traceability Rule (where canonical tokens may appear):**
- Canonical tokens MAY be shown in **THE_VAULT** (data proof), developer tools, export, and diagnostics.
- Canonical tokens MUST NOT be the primary language of the main experience. The main experience must remain human-readable and calm.

---

## 3. The Intelligence Architecture (The Brain)

### 3.1 The "Zero-Day" Protocol (First Launch)
The system must never show an empty state. It must be useful immediately.

*   **Trigger:** App First Launch (`isFirstLaunch === true`).
*   **Action:**
    1.  **Permissions:** Request full HealthKit/Health Connect read access.
    2.  **Deep Query:** Batch fetch the last 30 days of:
        *   Sleep Analysis (Duration/Efficiency)
        *   HRV (SDNN/rMSSD) & Resting Heart Rate
        *   Active Energy & Workout Logs
    3.  **Instant Calibration:**
        *   Compute `Baseline_Vitality` (30-day avg).
        *   Compute `Baseline_Load` (Typical output).
    4.  **The First Directive:** Compare *Yesterday's* data against this new *Baseline* to issue a valid, personalized Directive for *Today*.
*   **UX:** Display "Calibrating Biometrics..." $\rightarrow$ Reveal populated Dashboard.

#### 3.1.1 Zero-Day UX Acceptance Criteria (Non-Negotiable)

On first launch (`ZERO_DAY_PROTOCOL`), the app MUST:

1.  **Never show an empty state**
    - The operator must see an explicit calibration state (e.g., “Calibrating Biometrics…”), not a generic spinner.
2.  **Explain the phase, not the math**
    - The UI must communicate progress in operator terms (Permissions → Calibration → First Directive), without exposing technical implementation.
3.  **Reveal a populated, directive-first home state**
    - Upon completion, Home must show a valid **DIRECTIVE** for Today and the computed **SYSTEM STATE**.
    - Home must prioritize interpretation (Directive/State/Capacity). Raw biometrics belong to `THE_VAULT` unless surfaced via `CONTEXTUAL_INTEL`.
4.  **Fail safely**
    - If permissions are denied, the UI must state that the system cannot calibrate without sensor access and provide the next action (e.g., enable Health access).

### 3.2 The "Dawn Protocol" (Daily Routine)
Logic executes upon every new day launch.

1.  **Bio-Scan:** Fetch T-0 (Today) and T-1 (Yesterday) data.
2.  **State Calculation:** Assign canonical state (e.g., `READY_FOR_LOAD`).
3.  **The Handshake:**
    *   **If State matches Forecast:** Advance Arc (Day 1 becomes Today).
    *   **If State deviates:** Regenerate Arc (Call Planner AI).

### 3.3 Intra-Day Recalibration (Live Course Correction)
The plan must change if reality changes.

*   **Trigger:** Significant data event detected mid-day (e.g., Nap > 20m, Acute HRV drop, User tags "High Stress").
*   **Logic:**
    1.  Re-calculate `ADAPTIVE_CAPACITY`.
    2.  **Condition:** If Capacity drops below critical threshold for current Directive.
    3.  **Override:** Issue "Course Correction".
*   **Analyst Output:** *"Capacity drain detected. Abort 'Overload'. New Directive: 'Regulation'."*

### 3.4 The 3-Day Strategic Arc (The Planner)
**Requirement:** The Analyst generates a 3-Day Contract:
1.  **Today:** Execution (The strict Directive).
2.  **Tomorrow:** Forecast (Preparation).
3.  **Horizon:** Outlook (Trend direction).

### 3.5 Agent Coordination System
The Intelligence Layer is not a monolith. It is a system of specialized agents.
**Crucial Distinction:** The *Decision Loop* is Deterministic (No Hallucinations). The *Narrative Layer* is Generative (LLM).

1.  **The Analyst (Observer):** `[Mechanism: DETERMINISTIC CODE]`
    *   *Input:* HealthKit Data + Mission Variables.
    *   *Role:* Determines the `System State` and `Vitality`.
    *   *Output:* "System is READY_FOR_LOAD."

2.  **The Planner (Hybrid Consultant):**
    *   **Tier 1 (The Guardrails):** `[Mechanism: UTILITY SCORING]`
        *   *Role:* Calculates deterministic safety bounds (e.g., "Max Load: 4.0").
        *   *Output:* Safe Constraint Set.
    *   **Tier 2 (The Strategist):** `[Mechanism: LLM (Temp 0)]`
        *   *Role:* Analyzes rich context (History, Activity Names) to propose specific strategy.
        *   *Output:* "Directive: Active Recovery Swim."
    *   **Reconciliation:** If LLM Proposal fits Tier 1 Bounds -> **Adopt**. Else -> **Fallback to Tier 1**.

3.  **The Operative (Tactician):** `[Mechanism: LOGIC / CONSTRAINT SOLVER]`
    *   *Input:* Planner's Directive + User Archetype.
    *   *Role:* Generates the specific `Session` parameters (Duration, HR Zone, Load Target).
    *   *Output:* "Session: 20min Zone 2 Run."

4.  **The Judge (Verifier):** `[Mechanism: DETERMINISTIC MATH]`
    *   *Input:* Planned Session vs. Actual Execution.
    *   *Role:* Calculates `Alignment Score` with zero ambiguity.
    *   *Output:* "ALIGNED" or "MISALIGNED".

5.  **The Oracle (Narrator):** `[Mechanism: LLM]`
    *   *Input:* The outputs of all above agents.
    *   *Role:* Translates the raw logic into the "Analyst Persona" voice.
    *   *Output:* "Your capacity is high, but your sleep debt is accumulating. We interpret this as a 'False Peak'..."

### 3.6 Dynamic Profiling Engine (Archetype Detection)
**Concept:** The system does not rely on static "User Personas." Instead, it employs **Continuous Pattern Recognition** to construct a fluid Operator Profile. This ensures applicability across the entire human spectrum—from "Post-Partum Rehabilitation" to "Ultra-Endurance Competition."

**The Logic (The "Fingerprint"):**
We analyze the *relationship* between biometric inputs to determine the Operator's current physiological reality.

*   **Core Input Vectors:**
    *   **Intensity Distribution:** (Polarized vs. Threshold vs. Random)
    *   **Volume Tolerance:** (High Frequency/Low Load vs. Low Frequency/High Load)
    *   **Recovery Variance:** (Fast vs. Slow parasympathetic rebound)
    *   **Metric Patterns:** (e.g., Consistent HR spikes without GPS distance = Stationary/Gym Work)

*   **Spectrum of Recognition (Examples of Breadth):**
    *   **The Specialist:** Detects activity patterns matching specific sport demands (e.g., "Golf: Low HR + High Walk Volume + Power Spikes").
    *   **The Seasoned Operator:** Detects high training age via rapid RHR recovery and high load tolerance.
    *   **The Restricted Operator:** Detects constraints (e.g., "Pregnancy" or "Injury") via altered HRV baselines, capped intensity, or modified walking mechanics.
    *   **The Generalist:** Detects broad, non-specific variance typical of "Functional Fitness."

*   **Application:**
    The **Analyst** adapts its *vocabulary and expectations* based on this detected profile.
    *   *Example:* A "Missed Session" for a Generalist is "Inconsistency." For a Restricted Operator (e.g., Rehab), it is "Prudent Listening to the Body."

---

## Appendix A — Display Translation Tables (UI Lock)

**Purpose:** Prevent semantic drift. These tables are the **single source of truth** for human-readable UI labels derived from canonical terms (see §2.1).

### A.1 System State (Canonical → Display Label)

**Rule:** The UI must translate `SystemStatus.current_state` using this exact mapping. The UI MUST NOT substitute new state concepts.

| Canonical State | Display Label | Operator Meaning (1 line) |
| :--- | :--- | :--- |
| `READY_FOR_LOAD` | Ready for Load | Surplus capacity. Stress is appropriate today. |
| `BUILDING_CAPACITY` | Building Capacity | Adapting from recent load. Maintain consistency. |
| `NEEDS_STIMULATION` | Needs Stimulation | Under-loaded trend. A controlled stimulus is required. |
| `HIGH_STRAIN` | High Strain | Neural saturation risk. Reduce intensity and volatility. |
| `PHYSICAL_STRAIN` | Physical Strain | Structural tolerance compromised. Protect joints/tissues. |
| `RECOVERY_MODE` | Recovery Mode | Acute recovery priority (immune/viral/system failure). |

**Optional UI Detail (allowed):** Secondary microtext may show the canonical token (e.g., `READY_FOR_LOAD`) only in `THE_VAULT` / diagnostics surfaces.

### A.2 Directive Labels (Canonical Pair → Display Format)

**Rule:** The daily `DIRECTIVE` is a canonical pair: `directive.category` + `directive.stimulus_type`. The UI MUST render it using the following fixed components.

#### A.2.1 Category Labels

| Canonical Category | Display Label |
| :--- | :--- |
| `STRENGTH` | Strength |
| `ENDURANCE` | Endurance |
| `NEURAL` | Neural |
| `REGULATION` | Regulation |

#### A.2.2 Stimulus Labels

| Canonical Stimulus | Display Label |
| :--- | :--- |
| `OVERLOAD` | Overload |
| `MAINTENANCE` | Maintenance |
| `FLUSH` | Flush |
| `TEST` | Test |

#### A.2.3 Required Display Format

- **Primary format:** `"<Category Label> — <Stimulus Label>"` (example: “Strength — Overload”)
- **Forbidden:** “protocol”, “execute”, “briefing”, “mission”, coercive headlines (e.g., “MAXIMIZE FORCE”, “IGNITE”).

### A.3 Metric Display Lock (Canonical → UI Label + Placement)

**Rule:** The main experience prioritizes interpretation. Raw biometrics are secondary and belong in `THE_VAULT` unless surfaced via `CONTEXTUAL_INTEL` as narrative.

| Canonical Metric | Display Label | Unit / Range | Placement Rule |
| :--- | :--- | :--- | :--- |
| `VITALITY` | Vitality | 0–100 | Primary (Home allowed) |
| `ADAPTIVE_CAPACITY` | Adaptive Capacity | 0–100% | Primary (Home allowed) |
| `PHYSIOLOGICAL_LOAD` | Physiological Load | relative | Secondary (Vault-first) |
| HRV / RHR / Sleep (raw) | (human-friendly labels) | ms / bpm / hours | Vault-first; Home via `CONTEXTUAL_INTEL` only |

---

## 4. The Physics Engine (Layer 0)

Deterministic math. No AI hallucinations.

### 4.1 Core Formulas
*   **Vitality:** `(Sleep * 0.4) + (HRV_Z * 0.4) + (RHR_Stability * 0.2)`
*   **Adaptive Capacity:** Refills overnight based on Vitality. Drains daily based on Load.
*   **Physiological Load:** The metabolic cost of work.

### 4.2 The Golden Rule
> **If Directive is "Rest", High Load = Misalignment (Failure).**

---

## 5. The Progression Layer (Alignment)

### 5.1 Alignment Score
*   **Calculation:** Rolling 30-day % of `ALIGNED` days.
*   **The Judge:**
    *   Check `Session.TargetLoad` vs `Actual.Load`.
    *   **Tolerance:** +/- 15%.
    *   **Result:** HIT or MISS.

### 5.2 The Class System
*   **`OPERATOR_CLASS` (90-100%)**: Elite Status (Gold).
*   **`CANDIDATE_CLASS` (70-89%)**: Standard Status (Silver).
*   **`UNCALIBRATED` (<70%)**: Warning Status (Red).

---
