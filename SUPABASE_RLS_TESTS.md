RLS testing plan and queries

1) Purpose
- Verify Row-Level Security (RLS) policies behave as expected for `orders`, `requests`, and `notifications`.

2) How to run tests
- Use Supabase Auth to create test users: `admin`, `manager`, `staff_a` (primary dept A), `staff_b` (primary dept B).
- Insert sample data for two departments (Restaurant id=1, Cafeteria id=2) using SQL Editor.

3) Test cases (run in SQL Editor or via API calls using access tokens)

- Verify admin can see all orders:
  - As admin session token: GET `/api/admin/list-users` (or run SELECT * FROM orders; in SQL Editor as owner)

- Verify staff limited to primary department:
  1. Create an order with `department_id = 1`.
  2. Authenticate as `staff_a` whose `primary_department_id = 1` and request:
     - SELECT * FROM orders WHERE department_id = 1; (should return the order)
  3. Authenticate as `staff_b` whose `primary_department_id = 2` and run same query (should NOT return the order).

- Verify staff with extra access via `staff_department_access`:
  1. Grant `staff_b` access to department 1 by inserting into `staff_department_access`.
  2. As `staff_b`, re-run SELECT: should now return the order.

- Verify guest can create order via server API only:
  1. Use server API that uses `SUPABASE_SERVICE_ROLE_KEY` to insert order with `room_number` and no `user_id`.
  2. Confirm order visible to staff for that department.

- Verify notifications:
  1. Insert a notification row for `user_id` or `department_id` and ensure only intended users can SELECT/UPDATE it.

4) Example API calls
  Use a valid admin session access token in the `Authorization` header. Example:
  ```
  curl -X GET http://localhost:3001/api/admin/list-users -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>"
  ```

5) Troubleshooting
- If a SELECT returns zero rows unexpectedly, check RLS policies and ensure the test user has correct `users` row mapping to the Auth user id.
