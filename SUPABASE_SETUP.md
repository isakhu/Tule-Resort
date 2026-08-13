Supabase setup steps for Haile Resort foundation

1. Create a Supabase project at https://app.supabase.com
2. In the project, enable the `pgcrypto` extension (SQL editor):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
3. Run the SQL migration file `supabase/migrations/001_init.sql` in the Supabase SQL editor
4. Create a `.env.local` from `.env.example` and set values. Do NOT commit secrets.
5. Locally, set `.env.local` and run the app. Use server-side wrapper `lib/supabaseServer.ts` for admin tasks and `lib/supabaseClient.ts` for client operations.

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is powerful — keep it server-side only.
- After seeding, create admin users via the Supabase Auth dashboard or insert into `users` linking `role_id` to the `admin` role.

Migration order (recommended)
1. Run `supabase/migrations/001_init.sql` (creates base schema and seeds departments/roles/statuses).
2. Run `supabase/migrations/002_add_staff_access.sql` (adds primary_department_id, staff access tables, room_number, notifications, new statuses).
3. Run `supabase/migrations/004_order_notifications.sql` (creates DB trigger to insert notifications on new orders).
4. Run `supabase/migrations/003_rls_policies.sql` only after you have tested in staging — this enables Row-Level Security and may block queries until fully configured.

Admin APIs (server-only)
- The project includes server-only admin endpoints under `src/app/api/admin/*`:
   - `POST /api/admin/grant-access` — body: `{ userId, departmentId }` — grants extra department access to a staff member.
   - `POST /api/admin/reset-password` — body: `{ userId, newPassword }` — resets a staff member's password using Supabase Admin API. Requires `SUPABASE_SERVICE_ROLE_KEY`.
   - `GET /api/admin/list-users` — lists users for admin management.

Authentication for admin APIs
- Send a valid admin session access token in `Authorization: Bearer <session_token>` header.

Security checklist before deploy
- Remove any temporary debug endpoints (`src/app/api/debug/route.ts` was removed).
-- Move `SUPABASE_SERVICE_ROLE_KEY` into your hosting provider's secret manager (Vercel, Fly, etc.).
- Test RLS in staging thoroughly before enabling in production.

