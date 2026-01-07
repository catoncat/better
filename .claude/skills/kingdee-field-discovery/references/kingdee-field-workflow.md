# Kingdee Field Discovery Reference

## Form IDs (common defaults)
- PRD_MO (work orders)
- BD_Material (materials)
- ENG_BOM (BOM)
- ENG_Route (routing)
- ENG_WorkCenter (work centers)

## Locate scripts
- `rg --files -g 'kingdee-*-field*.ts'`
- `rg --files -g 'kingdee-check-field.ts'`

## Script usage
- Full validation:
  - `bun scripts/kingdee-fieldkeys-verified.ts [FORM_ID]`
- Quick check:
  - `bun scripts/kingdee-check-field.ts FORM_ID FIELD_KEY[,FIELD_KEY...]`

## Outputs (typical)
- `kingdee-*-verified-fields.json`: queryable FieldKeys
- `kingdee-*-complete.json`: raw metadata snapshot (large)
- `kingdee-*-discovery.log`: discovery logs
- `kingdee-*-output.txt`: ad-hoc output

## Locate update targets
- Integration field lists/mappings:
  - `rg -n "WORK_ORDER_FIELDS|MATERIAL_FIELDS|BOM_FIELDS|WORK_CENTER_FIELDS|ENG_ROUTE_FIELDS|ExecuteBillQuery" -g '*.ts'`
- Integration docs/specs:
  - `rg -n "Verified FieldKeys|ERP Master Data Pull|Integration Payloads|routing ingestion" -g '*.md'`
- Plan/task docs (if any):
  - `rg -n "ERP Integration|Kingdee|field discovery" -g '*.md'`

## Known pitfalls
- Queryable fields can still return null for some rows; treat null as empty data, not a missing field.
- ENG_Route step fields are directly queryable (no TreeEntity prefix).
- ENG_BOM queries can be slow; test with a smaller field list first.
- ExecuteBillQuery rejects some metadata-derived fields; rely on verified lists.

## Performance notes (sample)
- ENG_Route around 10-15s for wider field lists.
- PRD_MO around 8-10s for wide field lists.
- Others typically under 6s.
