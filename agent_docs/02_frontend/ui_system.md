# UI System

## Goal
- Keep the UI consistent, professional, and dark-mode safe.

## When to Use
- Before building or editing any frontend page.

## Design Principles
- Enterprise admin UI: clarity and data density first.
- Consistency over novelty; reuse existing patterns.
- Visual hierarchy: emphasize primary actions, de-emphasize metadata.

## Color and Theme Rules (Critical)
- Never use hardcoded hex values.
- Never use raw Tailwind colors for structural elements.
- Always use semantic CSS variables from `index.css`.

### Semantic Mapping
- Page background: `bg-background`
- Card/panel: `bg-card`
- Primary text: `text-foreground`
- Secondary text: `text-muted-foreground`
- Borders: `border-border`
- Primary action: `bg-primary` + `text-primary-foreground`
- Destructive: `text-destructive` or `bg-destructive`

## Density and Layout
- Standard gaps: `gap-4`.
- Standard padding: `p-6` for cards.
- Prefer compact density for list-heavy views.

## Components
- Use shadcn/ui components from `apps/web/src/components/ui/*`.
- Icons: `lucide-react` only.
- Do not add new UI libraries without explicit approval.

## Forms (Mandatory)
- Inputs must be full width: `w-full` on input/select/textarea.
- Control layout via parent grid or flex.
- Use `FormLabel` from shadcn/ui.
- Do not ask users to type raw IDs; use selectors (e.g., `InstrumentSelect`).
- Use `reserve` prop on `FormMessage` to maintain layout stability.
- See `agent_docs/02_frontend/form_building.md` for full guide.

## Date and Time Inputs
- Use shared components:
  - Date: `apps/web/src/components/ui/date-picker.tsx`
  - DateTime: `apps/web/src/components/ui/datetime-picker.tsx`
  - DateRange: `apps/web/src/components/ui/date-range-picker.tsx`
- Never use `<input type="date">` or `<input type="datetime-local">`.
- Submit ISO strings only: `date.toISOString()`.

## Data List Pages
- Use the FilterToolbar + QueryPresetBar pattern.
- See `agent_docs/02_frontend/data_list_pattern.md`.

## Language
- UI text must be Simplified Chinese.
- Code and comments remain English.

## Avoid
- Blue primary buttons; primary is neutral (black/dark gray).
- Large red backgrounds (only small badges or a single alert banner area).
- Floating top-right action buttons; actions must align with content.
- `rounded-full` for primary actions (use `rounded-md` or `rounded-lg`).
- Custom fonts; use the configured stack (Inter).

## Design Refinement (Within Consistency)

### Goal
Enhance clarity and polish without breaking established patterns.

### Allowed Optimizations
- **Typography hierarchy**: Adjust font-weight/size to clarify primary vs secondary info.
- **Spacing precision**: Fine-tune margins/padding for visual breathing room.
- **Empty states**: Provide meaningful illustrations or guidance, not blank space.
- **Micro-animations**: Subtle transitions (fade, slide) for state changes; CSS-only preferred.

### Forbidden
- Custom color palettes outside semantic tokens.
- Layout experiments that break existing page patterns.
- Heavy motion/parallax effects.

## Chinese Copywriting Style (UI Text)

### Writing Style
| Guideline | Example |
|-----------|---------|
| Short sentences | ✓ "保存成功" ✗ "您的数据已经成功保存到系统中" |
| Verb-first for actions | ✓ "添加仪器" ✗ "新仪器" |
| Avoid English mixing | ✓ "筛选条件" ✗ "Filter 条件" |
| Exception: Product terms | ✓ "工单 ID" (if ID is established term) |
| No trailing punctuation in buttons | ✓ "确认" ✗ "确认。" |
| Question for confirmations | ✓ "确定删除此记录？" |

### Common Terms (Established)
Use these consistently:
- 工单 (Work Order)
- 批次 (Batch/Lot)
- 校准 (Calibration)
- 仪器 (Instrument)
