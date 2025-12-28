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
