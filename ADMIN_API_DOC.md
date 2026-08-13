Admin API documentation

Overview
These endpoints are server-only admin utilities. They require a valid admin/manager Supabase session access token in `Authorization: Bearer <token>`.

Endpoints

1) List users
GET /api/admin/list-users
Headers:
- `Authorization: Bearer <session_token>` (admin session)
Response: `{ users: [...] }`

2) Grant department access
POST /api/admin/grant-access
Headers:
- `Content-Type: application/json`
- auth header as above
Body example:
```json
{ "userId": "<USER_UUID>", "departmentId": 2 }
```
Response: `{ success: true, inserted: [...] }`

3) Reset password
POST /api/admin/reset-password
Headers:
- `Content-Type: application/json`
- auth header as above
Body example:
```json
{ "userId": "<USER_UUID>", "newPassword": "NewSecureP@ss1" }
```
Response: `{ success: true, user: { ... } }`

Testing locally
Obtain an admin session access token (see instructions below) and include it in `Authorization: Bearer <token>`.
Example curl (grant access):
```
curl -X POST http://localhost:3000/api/admin/grant-access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
  -d '{"userId":"<UUID>","departmentId":2}'
```

Security notes
 - Never expose `SUPABASE_SERVICE_ROLE_KEY` or any server secrets in client code or commit them to version control.
 - Restrict access to these endpoints via hosting-level secrets and firewall rules where available.
