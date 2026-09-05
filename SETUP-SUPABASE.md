# Supabase setup - Qentro Finance v0.7.0

## Existing Qentro Finance Supabase project
1. Open Supabase > SQL Editor.
2. Run `supabase/FINAL-SCHEMA-MIGRATION.sql` once.
3. Confirm your existing test data is still present.
4. Deploy the Edge Function in `supabase/functions/account-signup/`.
5. Add Edge Function secrets:
   - `CAPTCHA_SECRET` = a long random value
   - `SUPABASE_SECRET_KEY` = your Supabase secret key (server-side only)
   - optional `GOOGLE_SIGNUP_WEBHOOK_URL`
6. Never put `SUPABASE_SECRET_KEY` in GitHub frontend variables.

## Frontend GitHub variables
Set repository Actions variables/secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are safe browser-side values. The secret key is not.

## Signup flow
The account-signup function creates:
1. Auth user
2. user_profiles
3. organizations
4. organization_members (owner)
It does not create financial data. A new customer starts with an empty private workspace.
