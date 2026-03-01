# delete-user Edge Function

Deletes the authenticated user from Supabase Auth. The profile row is cascade-deleted when the auth user is removed (see `profiles.id` FK to `auth.users`).

**Deploy** (requires [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase functions deploy delete-user
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set automatically in the Supabase project; no extra secrets needed for this function.
