---
title: CloudManager UI/UX Design System
description: High-end UI/UX standards for the frontend relying exclusively on shadcn/ui
---

## Purpose

This document defines the visual language, interaction patterns, and component guidelines for CloudManager. It ensures a polished, modern UI built entirely with Tailwind CSS v4 and shadcn/ui components located under `src/shared/components/ui`.

## Principles

- Clarity first: reduce cognitive load, use meaningful spacing, and clear hierarchy
- Consistency: one spacing scale, one color system, one typography scale
- Accessibility: WCAG AA contrast, keyboard navigability, visible focus
- Performance: avoid unnecessary renders, virtualize large lists, lazy-load heavy views

## Foundations

### Color System

- Base color: Slate (from `components.json`)
- Primary: brand accent used for CTAs and focus states
- Semantic tokens (light/dark): defined via CSS variables in `src/index.css`

Usage examples:

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />
```

### Typography

- Font sizes: Tailwind default scale (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`)
- Line-height: Tailwind defaults; prefer `leading-6` for dense forms
- Weight: `font-medium` for labels, `font-semibold` for headings

### Spacing & Layout

- Container widths: `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8`
- Section rhythm: vertical spacing `py-6 sm:py-8 lg:py-10`
- Grid: use `grid gap-4 sm:gap-6` for content, `gap-2` in forms

### Radius & Elevation

- Radius token: `--radius` (from Tailwind config)
- Cards/Panels: `rounded-lg border bg-card text-card-foreground` with subtle shadows `shadow-sm`

## Components (shadcn/ui)

All primitives live under `src/shared/components/ui`. Prefer composition over branching props. Keep files under 150 lines where possible by extracting subcomponents.

- Buttons: primary, secondary, ghost, destructive
- Inputs & Forms: `input`, `textarea`, `select`, `checkbox`, `radio-group`, `form`
- Navigation: `navigation-menu`, `menubar`, `breadcrumb`, `sidebar`, `tabs`
- Overlays: `dialog`, `drawer`, `popover`, `tooltip`, `sheet`, `alert-dialog`
- Feedback: `sonner` (toasts), `progress`, `skeleton`
- Data Display: `table`, `card`, `badge`, `carousel`, `chart`

Patterns map:

- List pages: `Card` wrapper, `Table` with toolbar (search, filters), `Pagination`
- Forms: `Card` + `Form` components, validation via zod, submit/loading/disabled states
- Detail views: `Grid` layout with `Card` sections, sticky action bar (`Dialog` for destructive)

## Page Templates

### Dashboard Shell

```tsx
// Layout skeleton
<div className="min-h-screen grid grid-cols-[280px_1fr]">
  <Sidebar />
  <div className="flex min-h-svh flex-col">
    <Header />
    <main className="flex-1 p-6 bg-white">{/* page content */}</main>
  </div>
  <Toaster />
  <Dialog />
</div>
```

### List + Toolbar

```tsx
<div className="flex items-center justify-between gap-3 mb-4">
  <div className="flex items-center gap-2">
    <Input className="w-72" placeholder="Search..." />
    <Select>{/* filters */}</Select>
  </div>
  <Button>New</Button>
}
<Card>
  <Table />
  <div className="p-4"><Pagination /></div>
</Card>
```

### Form Page

```tsx
<Card className="max-w-3xl">
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>
    <Form>{/* fields */}</Form>
  </CardContent>
  <CardFooter className="justify-end gap-2">
    <Button variant="ghost">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
}</Card>
```

## Interaction Guidelines

- Loading: skeletons for lists, button `disabled` + spinner for submits
- Errors: inline field messages, toast for global errors
- Empty states: icon + short explanation + primary action
- Undo pattern: use toasts with action for destructive where possible

## Theming

- Use CSS variables from `:root` / `.dark` in `src/index.css`
- Prefer semantic classes: `bg-card`, `text-muted-foreground`
- Avoid custom ad-hoc colors in components; use tokens

## Accessibility

- Labels connected to inputs, aria- attributes on interactive elements
- Focus states visible, avoid `outline-none`
- Keyboard navigation: ensure `Dialog`, `Menu`, `Select` trap focus correctly

## Performance

- Virtualize tables with large datasets
- Code-split heavy pages via route-level splitting
- Memoize expensive components; keep prop types stable

## Review Checklist

- Consistent spacing and typography
- shadcn/ui only; no third-party UI libs
- All states handled: loading, error, empty
- Responsive up to `sm`, `md`, `lg`, `xl`
- Lint passes; no files > 150 lines unless necessary

## Roadmap (UI)

- Auth flows (login, register, 2FA) with shadcn/ui
- Ticket manager pages (list, detail, reply)
- Product catalogue (public) pages
- Orders and invoices layouts
