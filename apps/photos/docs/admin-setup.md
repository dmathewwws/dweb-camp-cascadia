# Admin Setup

Admin status is stored in the D1 database (`is_admin` column in the `users` table). To make a user an admin, they must first add their profile details, then update their status using SQL.

**Development (Local D1):**
```bash
pnpm wrangler d1 execute dweb-photos-mini-app-dev-db --local --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```

**Production (Remote D1):**
```bash
pnpm wrangler d1 execute dweb-photos-mini-app-prod-db --remote --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```
