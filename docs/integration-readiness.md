# MyPawLink Integration Readiness

MyPawLink is the client-facing check-in, forms, consent, document, and communication layer. The PMS or workflow platform remains the clinic system of record.

Current scope:
- Owner check-in and intake
- Client, patient, secondary contact, referral, form, signature, and document records
- Client-facing visit updates and notification logging
- Future non-billing ezyVet, SmartFlow, Cornerstone, and other PMS/workflow integrations

Out of scope:
- Invoices
- Billing
- Payments
- Payment processing
- Financial workflows

## Environments

Use separate Supabase and Vercel projects for:
- `development`
- `staging`
- `production`

Do not use real clinic or client data in development. Demo data should only live in development.

Required server environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required browser environment variable:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recommended:
- `NEXT_PUBLIC_SITE_URL`
- `MYPAWLINK_ENV`

Future provider variables should stay in environment variables or a secrets manager, never in browser code or plain database rows:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `RESEND_API_KEY`
- `EZYVET_CLIENT_ID`
- `EZYVET_CLIENT_SECRET`
- `EZYVET_API_BASE_URL`
- `SMARTFLOW_API_KEY`
- `SMARTFLOW_API_BASE_URL`

## Future Integration Flow

Inbound SmartFlow-style data should be stored raw in `integration_events`, normalized into a client-safe draft, marked `pending_review`, and reviewed by clinic staff before anything is sent to the owner.

Outbound ezyVet-style sync should only include non-billing records: check-in summary, client/patient details, secondary contacts, referral details, signed forms, consent documents, and uploaded documents.

Documents must remain private and should be viewed through short-lived signed URLs only after server-side authorization.
