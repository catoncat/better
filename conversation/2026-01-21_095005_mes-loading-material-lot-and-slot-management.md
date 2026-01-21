# Context
User asked what the correct material barcode format is, how materials/lots and slot codes are managed, and how normal users configure these (seeded data vs real workflow).

# Decisions
- None.

# Plan
- None.

# Findings
- Loading barcode format is documented as "物料编码|批次号"; UI placeholder shows the same format.
- `MaterialLot` is unique by `(materialCode, lotNo)`; `FeederSlot` is unique by `(lineId, slotCode)`.
- Slot-material expectations are managed via `SlotMaterialMapping` (slotId + materialCode, optional productCode/routingId), then expanded into `RunSlotExpectation` per run+slot.
- Loading verification uses barcode parsing when a separator is present; otherwise it falls back to lookup by `lotNo` only and fails if no `MaterialLot` exists.

# Progress
- Prepared explanation of normal configuration flow (slot config, slot mappings, loading verification, traceability).

# Errors
- None.

# Open Questions
- Should the system auto-create a material lot when scanning a barcode without separators, or enforce the "materialCode|lotNo" format only?

# References
- domain_docs/mes/tests/02_manual_acceptance_checklist.md
- domain_docs/mes/tech/api/01_api_overview.md
- packages/db/prisma/schema/schema.prisma
- apps/server/src/modules/mes/loading/service.ts
- apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx

## Findings (UI Slot Config)
- Slot config page at `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx` has two tabs: Slots (站位管理) and Mappings (物料映射).
- Line selection (`LineSelect`) drives slot/mapping lists; slot tab shows slotCode, slotName, position, lock status; mapping tab provides productCode filter and uses dialog for mapping creation.

## Findings (Slot Dialog)
- Slot form fields: slotCode (required), slotName (optional), position (integer >=0 display order).

## Findings (Mapping Dialog)
- Mapping form fields: slotId, materialCode, productCode (optional), routingId (optional; UI uses "ALL"), priority (int), isAlternate (bool), unitConsumption (optional number), isCommonMaterial (bool).
- Mapping selection is constrained by slots for selected line and optional route search list.
