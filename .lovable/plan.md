## LOXX — Master Key System Builder

This is a substantial rebuild of the current app under a new brand (LOXX), with a new design system, full Supabase backend, and Stripe checkout. I'll deliver it in phases so you can review as we go.

### Phase 1 — Foundation (this turn)
- Enable Lovable Cloud (Supabase) and provision the full schema with RLS:
  `profiles`, `key_systems`, `nodes`, `cylinders`, `keys`, `products`, `orders`, `order_items`
- Seed `products` table with the 12 cylinders you listed
- New design system in `index.css` + `tailwind.config.ts`: warm off-white bg `#f5f4f1`, dark sidebar `#17171a`, amber accent `#d4820a`, DM Sans + IBM Plex Mono
- LOXX branding: amber key logo, new wordmark, remove all DOM-UK references
- Auth: email/password + Google OAuth via Supabase, signup captures name + company, `/auth` and `/reset-password` pages, profile auto-created via trigger
- App shell: dark sidebar (Dashboard, System Builder, Catalogue, Orders, Account) + saved systems list + "New System" CTA

### Phase 2 — Core Builder
- System Builder rebuilt with react-flow (top-down dagre layout) and custom node renderers for GMK / SMK / CK / Cylinder with the colour-coded dots
- Inline rename (double-click), drag-to-reorder siblings, +/× hover actions, expand/collapse, tree search with auto-expand & highlight
- Global sequential differ numbering (`Differ 001…`), never reused
- Right detail panel (node-type aware) with keys, cylinders, access path, qty controls, assign-cylinder form
- Validate drawer with the 6 checks (no CK without cylinder, duplicate sibling labels, empty SMK, unnamed cylinders, no CK at all, sanity cap)
- Save → upserts `tree_data` JSONB + recomputes `door_count`; "Export to order" walks tree into cart

### Phase 3 — Catalogue, Cart, Checkout, Orders
- Catalogue with filters (type, pins, finish, size, price, search) and product detail drawer
- Cart with line items, VAT 20%, totals
- Stripe Checkout in **test mode** via edge function (`create-checkout`); on success, `verify-checkout` edge function creates `orders` + `order_items`, stores tree snapshot, sends two emails (customer + admin) via Resend
- My Orders table with status badges + detail drawer + invoice/re-order placeholders
- Landing page (hero, trust badges, how-it-works, product strip, testimonial, footer) and Account settings tabs

### Technical notes
- Tree source of truth = `key_systems.tree_data` JSONB; `nodes`/`cylinders` rows mirrored on save for server-side queries
- All tables: explicit GRANTs + RLS (owner-only on user data, public read on `products`)
- Stripe + Resend will need secrets — I'll request `STRIPE_SECRET_KEY` and `RESEND_API_KEY` (or you can connect Resend as a connector) once we get to Phase 3
- Desktop-first, GBP only, no i18n, re-order button is a placeholder per your MVP scope

### What I need from you
1. Confirm I should proceed phase-by-phase (I'll start with Phase 1 immediately on approval)
2. For Google OAuth — I'll wire the button; you'll need to enable Google in the Cloud auth settings (I'll point you to it)
3. For emails — OK to use Resend? Admin notification email address?

Approve and I'll start with Phase 1.