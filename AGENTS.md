<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MyPawLink Agent Rules

Read this file before every task in this repository.

## Project

- Product: MyPawLink.
- Repo folder: `C:\Users\Andres Bernal\careping`.
- Stack: Next.js, React, Supabase, Vercel.
- GitHub repo: `Vet-Bridge/vetbridge`.
- Domain: `mypawlink.com`.
- Vercel deploys from GitHub `main`.

## Local Commands

- Use `npm.cmd` on Windows.
- Common commands:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `git status`
  - `git add ...`
  - `git commit -m "..."`
  - `git push origin main`
- Ignore the untracked file `app/VetBridge first version.txt`.

## Business Scope

MyPawLink is the client-facing check-in, consent/forms, documents, visit updates, referral, and communication layer for veterinary clinics.

The central object is the Visit.

Core workflows:

- Owner emergency check-in.
- Secure owner visit page.
- Owner action items, including required consent forms.
- Clinic patient dashboard and workflow.
- Referral intake and conversion to visit.
- Visit status updates and owner-facing timeline.
- Mock SMS or SMS notification support.
- Documents/forms/signatures.
- Clinic staff authentication and roles.

## System Ownership

MyPawLink is not intended to replace SmartFlow, ezyVet, Cornerstone, Instinct, or any veterinary practice management system.

Technicians and doctors continue documenting medical care, treatments, vitals, medications, and medical records in their existing systems.

MyPawLink serves as the client communication and engagement layer.

## Clinic Dashboard Boundaries

The clinic dashboard exists only to:

- Review owner-facing information.
- Manage forms and approvals.
- Send visit updates.
- Review communication history.
- Monitor integration status.

The clinic dashboard is not intended to become the primary working system for technicians or doctors.

## Product Boundaries

Do not build or expand:

- Invoices.
- Billing.
- Payments.
- Payment processing.
- Pricing workflows.
- Financial checkout workflows.

Estimates may remain only as clinic-provided documents/actions that a client can review, approve, reject, or sign. Do not expand estimates into billing, invoices, payments, or pricing.

## Integrations

- Do not connect to ezyVet, SmartFlow, Cornerstone, or other external systems unless explicitly requested.
- Keep integration code isolated under integration-specific folders.
- Integration readiness is allowed only as architecture, mock connectors, events, logs, and future-safe data mapping.
- SmartFlow-style clinical updates must require review/approval before anything is sent to the owner.
- Do not hardcode external integration logic inside check-in forms or UI components.

## Owner Experience Rules

- Owner-facing screens must be mobile-first, warm, simple, and clear.
- After check-in, show only what the owner needs next.
- Do not show unused Care Hub libraries or empty form categories to owners.
- Owner Actions should show only pending forms, approval actions, discharge instructions, or a clear no-action-needed message.
- If no pet photo is uploaded, use the professional paw avatar placeholder, never a random pet photo.
- Secure visit links must remain private and token-based.

## Clinic Experience Rules

- Clinic workflow should feel like a focused emergency hospital treatment board.
- Use real route navigation for clinic patient detail screens.
- Do not render patient detail as an overlay, modal, drawer, stacked card, or selected-state layer over the patient list.
- One active screen should be visible at a time.
- Patient detail must have its own scroll behavior and a clear back path.
- Clinic settings and integrations should not clutter the main clinical dashboard.

## Referral Rules

- Referral intake should collect enough client and patient information to avoid duplicate check-in when the patient arrives.
- Referral owner/customer information is required when part of the intake flow.
- Pet age must be clear: years, months, weeks, birthdate with approximate age, or unknown. Never display age as only a number.
- Referral information should attach cleanly to a visit when converted.

## Forms And Signatures

- Required post-check-in Emergency Care Consent should be available in owner Actions.
- Signature must support finger signing on mobile through a canvas signature pad.
- Typed signature fallback is allowed when paired with an electronic-signature acknowledgment.
- Every form signature flow should support clear signature, signer name, relationship, required acknowledgments, and signed date/time.

## SMS And Notifications

- Use mock SMS mode unless real provider credentials are configured.
- SMS provider logic should stay behind a notification service/provider adapter.
- Store or log notification status, recipient, body, provider id when available, errors, and timestamps.
- Do not hardcode Twilio throughout UI or app logic.

## Supabase And Security

- Use Row Level Security for clinic-specific tables.
- Clinic-specific tables must include `clinic_id` where appropriate.
- Users from one clinic must not see another clinic's data.
- Never expose service role keys in browser code.
- Documents must be private and viewed only through authorized signed temporary URLs.
- Future SQL migrations that create public tables should include explicit Data API grants, especially for `service_role`, because Supabase is changing public schema grants.
- Add `anon` or `authenticated` grants only when browser access is intentional and protected by RLS policies.

## Development Rules

- Preserve working features unless the user approves replacing them.
- Keep changes scoped to the requested workflow.
- Run `npm.cmd run lint` and `npm.cmd run build` after code changes when feasible.
- Existing lint warnings about hook dependencies, unused legacy helpers, and `<img>` may remain unless the task is about those warnings.
- Commit and push requested app changes to `main` when the user expects the live site to update.
