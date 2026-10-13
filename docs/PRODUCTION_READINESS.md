# Production-readiness work

This branch contains a first hardening pass for Tule Resort. It is not a declaration that the deployed application is production-ready; complete the checklist below before publishing.

## Changes in this branch

- Reservation creation no longer fabricates a successful booking when the database RPC fails.
- The room reservation API validates availability and calculates the quoted price from the room record on the server. Client-supplied totals, booking numbers and user IDs are ignored.
- Staff profile reads accept verified staff, manager or admin sessions rather than only managers/admins.
- Order APIs derive a signed-in guest's ID from a verified Supabase access token and do not trust a user ID submitted in the request body.
- QR order creation no longer falls back to an unassigned order if table-linked creation fails.
- Guest checkout and QR menu load active menu items from the database-backed menu API; stale static cart item IDs are removed before checkout.
- Dining-table reads and status updates use server-side routes with verified staff authorization.
- Predictable seeded table QR tokens are rotated by migration 022, and the public table lookup resolves a single token instead of allowing public enumeration.
- The guest activity page no longer shows sample records as if they were real. Dashboard totals, order alerts and recent activity are calculated from queried orders rather than hard-coded demo values.
- PWA manifest, conservative service-worker registration and a generic offline fallback are included. The service worker does not cache API results or submit orders offline.

## Required Supabase migration

Apply migrations in the repository's intended order in a staging Supabase project first. Migration 022 depends on the existing `021_dining_tables_and_qr_ordering.sql` and the authorization helper created by `013_security_hardening.sql`. Migration 023 depends on the existing room-reservation tables and replaces the reservation RPCs with an atomic room-lock, overlap-check and insert operation.

1. Verify migrations through `021_dining_tables_and_qr_ordering.sql` have already been applied.
2. Apply `022_dining_table_security_hardening.sql`.
3. Apply `023_reservation_concurrency_hardening.sql` to install the server-only, atomic reservation RPC.
4. Verify `public.is_manager_or_admin()` and `public.is_staff_or_manager_or_admin()` exist and that dining tables are not publicly enumerable.
5. Verify the old sample QR tokens were rotated. Existing printed QR codes using the old seeded tokens will need to be regenerated from the staff Tables page.
6. Only publish after the live menu schema includes the fields used by the app, including `is_active` and `is_available`.

Migration 022 intentionally removes predictable sample tokens. Do not apply it without planning to reprint any cards that use those sample links. Review the seeded demo table statuses and table records before actual resort use. Migration 023 makes reservation calls through the protected server API atomic; do not expose its service-role-only RPC to anonymous clients.

## PWA and QR notes

- The PWA supports browser use and a generic offline navigation fallback. Ordering and reservations still require a live network connection.
- The QR image helper currently requests SVG QR images from a third-party QR generation service. Only the public table URL/token is sent to that service. For a stricter self-hosted production deployment, replace it with a locally bundled, standards-compliant QR encoder.
- Confirm icon/installation behavior in current Android Chrome and iOS Safari. If store-distributed Android/iOS apps are required, that is a separate packaging project and is not included here.

## Verification checklist

Run locally with a configured `.env.local` and a staging Supabase project:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Manually verify:

- [ ] Room reservations calculate their total from the database, create a real database row and report a clear failure if the insert fails.
- [ ] Concurrent or overlapping room reservations are rejected by the database.
- [ ] A staff user, manager and admin can each load the intended dashboard; unauthorized roles cannot access staff APIs.
- [ ] Invalid or expired access tokens are rejected.
- [ ] Cart item IDs come from the current database menu and modified client prices do not change the server-calculated order total.
- [ ] An unknown/inactive table token cannot place an order.
- [ ] A QR order persists the correct dining table ID and appears in staff orders with the proper table number.
- [ ] If table-order creation fails, the API does not create a fallback order without a table.
- [ ] Table status changes persist to Supabase and display an error if they fail.
- [ ] QR images scan correctly and point to the deployed HTTPS URL, not localhost.
- [ ] PWA installation, update behavior and offline fallback work on physical devices.
- [ ] Guest activity is not mistaken for live order history.
- [ ] Existing room booking, menu editing, housekeeping, services, receipts and staff administration still work.
- [ ] Inspect logs, Supabase RLS, secret configuration and database backups before production.

## Not implemented in this branch

- Payment-provider integration and payment reconciliation.
- Live guest activity history.
- Native App Store / Play Store releases.
- A complete automated test suite or successful staging/production certification.

Do not mark these items complete until implemented and tested against the actual deployed environment.
