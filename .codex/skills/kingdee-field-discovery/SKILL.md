---
name: kingdee-field-discovery
description: Verify Kingdee ERP FieldKeys via ExecuteBillQuery, generate verified field lists, and update ERP sync mappings/docs. Use when discovering or validating PRD_MO/BD_Material/ENG_BOM/ENG_Route/ENG_WorkCenter fields, auditing missing fields, or reconciling ERP integration specs with live data.
---

# Kingdee Field Discovery

## Overview
Confirm which FieldKeys are truly queryable in Kingdee, collect evidence, and update integration mappings and docs to match reality.

## Workflow
1. Locate scripts and integration code
   - Find field tools: `rg --files -g 'kingdee-*-field*.ts'` and `rg --files -g 'kingdee-check-field.ts'`.
   - Find Kingdee query wrapper and integration field lists: `rg -n "kingdeeExecuteBillQuery|ExecuteBillQuery|WORK_ORDER_FIELDS|MATERIAL_FIELDS|BOM_FIELDS|WORK_CENTER_FIELDS|ENG_ROUTE_FIELDS" -g '*.ts'`.

2. Prepare environment
   - Ensure these env vars exist: `MES_ERP_KINGDEE_BASE_URL`, `MES_ERP_KINGDEE_DBID`, `MES_ERP_KINGDEE_USERNAME`, `MES_ERP_KINGDEE_APPID`, `MES_ERP_KINGDEE_APP_SECRET`, `MES_ERP_KINGDEE_LCID`.
   - Use `bun` for scripts.

3. Generate verified FieldKeys
   - Run: `bun scripts/kingdee-fieldkeys-verified.ts [FORM_ID]`.
   - Omit `FORM_ID` to verify all supported forms.

4. Spot-check critical fields
   - Run: `bun scripts/kingdee-check-field.ts FORM_ID FIELD_KEY[,FIELD_KEY...]`.
   - Treat `null` values as "queryable but empty" rather than missing fields.

5. Update code and docs
   - Update integration field lists/mappings where ExecuteBillQuery is used.
   - Locate docs by searching for phrases like `Verified FieldKeys`, `ERP Master Data Pull`, or `Integration Payloads`.
   - Keep plan/task docs in sync if they exist.

6. Clean outputs
   - Keep verified JSON only if needed for review.
   - Remove large logs or intermediate artifacts once mappings/docs are updated.

## References
- Use `references/kingdee-field-workflow.md` for command examples and search patterns.
