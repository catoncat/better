# Context
- Task: deepen the customer SMT workflow comparison and write a more detailed report based on `domain_docs/mes/spec/process/compair/smt_flow_comparison_report.md`.
- Output target: `domain_docs/mes/spec/process/compair/codex_review_report.md`.

# Decisions
- Expand the workflow description by operational phase (entry/run/prepare/loading/FAI/production/quality/exception/transfer) using the customer-specific checkpoints and forms as anchors.

# Plan
- Extract all customer workflow steps, checkpoints, and form coverage gaps from the comparison report.
- Reframe into a detailed, phase-by-phase operational narrative with inputs/outputs, actors, systems, and data capture points.
- Add explicit traceability, data collection, and exception handling requirements implied by the customer flow.

# Findings
- Major gap: customer flow lacks Run concept; our system has Run PREP/COMPLETED states.
- Customer prep details include steel stencil verification, solder paste lifecycle, material feeder prep, equipment setup (program, nozzle, pins).
- Anti-misload requires station table lookup and row-level QR scan validation with lockout on error.
- First-article requires SPI→reflow→AOI→final check sequence with concrete metrics (thickness/area, temp curve, solder joint quality).
- Production monitoring spans equipment OEE/throw rate, process curve, quality pass rates, material consumption/alerts.
- Many customer forms are missing or partially supported (solder paste usage, stencil/fixture lifecycle, temperature logs, changeover records, AOI/SPI checks).

# Progress
- Read `smt_flow_comparison_report.md` and captured core workflow steps, monitoring dimensions, and form gaps.

# Errors
- Initial attempt to overwrite the note failed due to shell noclobber; retried with `>|`.

# Open Questions
- Which gaps are contractually mandatory for initial rollout vs later phases?
- Whether additional customer artifacts (forms in `smt_forms/`) need to be referenced verbatim in the detailed report.

# References
- `domain_docs/mes/spec/process/compair/smt_flow_comparison_report.md`

# Findings (additional)
- Customer flowchart adds explicit loop for first-article failure → parameter adjustment → re-run first-article check.
- Production phase loops until completion with explicit data analysis/decision gate.
- Checkpoint list in `smt_flow_checkpoint.md` aligns to forms under `smt_forms/` and highlights specific material/tool/device/inspection/defect records expected.

# Findings (forms)
- SMT pre-run checklist (QR-Pro-133) enforces baked PCB/BGA/IC/connector requirements, material feeder readiness, solder paste warming/stirring, program version, stencil/squeegee/jig setup, and supervisor confirmation timing.
- Material loading matrix (QR-Pro-121) is a station-to-part P/N mapping with per-station consumption checkmarks and signoff fields.
- Solder paste usage record (QR-Pro-013) ties receiving, batch serial, thaw/start/end times, line usage, reclaim, and operator.
- Stencil usage record (QR-Pro-089) tracks thickness, per-run counts, cumulative life (60k), tension measurements, condition checks, and replacement gating.
- Baking record (QR-Pro-057) captures lot, process, quantity, bake temp/time, in/out timestamps, and confirmer.
- Fridge temperature record (QR-Pro-073) requires twice-daily measurement, operator/reviewer, and trend chart.
- Squeegee usage record (QR-Mac-144) tracks per-run counts, cumulative life (100k), condition checks, and weekly inspection.
- Fixture maintenance record (QR-Mac-155) defines lifecycle thresholds and maintenance checklist after use; stencil cleaning is a minimal form (model/date/operator/confirm/notes).

# Findings (inspection & production)
- First/last article record (QR-Pro-05) specifies process checks across bake, feeder mapping, solder paste exposure (<24h), stencil print quality, thickness/CPK>1.33, placement quality, reflow program/temps/rail width, and appearance criteria per IPC-A-610; ends with multi-dept signoff.
- AOI daily start-up check (QR-Mac-238) logs machine, sample model/version/program, pass/fail, and QC feedback requirement on failure.
- X-ray record (QR-Mac-134) captures sample size, reason (pre/post reflow, rework, analysis), max void area, and approval.
- Daily QC report (QR-Ins-02) logs defect categories by time window, calculates defect counts/rates, and mandates escalation if process is out of control.
- Production data record logs start/end times, quantities, feeder/material checkers, pickup vs placement counts, and loss calculations.
- Changeover record (QR-Mac-022) captures exact time, station, part code/desc, package qty, equipment, operator, and review.
- Furnace profile usage (QR-Pro-105) maps product to reflow profile name with user/confirm.
- Process/time inspection sheet enumerates end-to-end steps with dates, program names, profiles, QA gates, test/pack/ship, and ECN notes.
- Nonconformance material report captures defect description, root cause, containment actions, and cross-department signoff structure (full form continues).

# Findings (exceptions & counts)
- Nonconforming report (QR-Pro-034) records job/model/rev/customer/qty, downtime impact, defect description, corrective actions, and confirmation.
- Product in/out record is a minimal ledger of time-stamped in-quantity, cumulative totals, receiver, and remarks.
- Repair record (QR-Pro-012) needs verification; content not visible in the current extract.

# Findings (defects & repair)
- Repair record file `维修记录表QR-Pro-012.md` appears empty (no visible fields).
- Nonconformance material report (QR-IQC-01) includes defect description, root cause, containment, corrective action, and final disposition with QA signoff.

# Progress (update)
- Drafted detailed workflow report and saved to `domain_docs/mes/spec/process/compair/codex_review_report.md`.
