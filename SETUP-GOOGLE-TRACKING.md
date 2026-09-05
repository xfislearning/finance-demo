# Google signup tracking — qentro.startup@gmail.com

Supabase remains the source of truth for user accounts. Google is only an easy owner-facing signup register; it must not store customer financial transactions.

## A. Create the Google Form
While signed in to **qentro.startup@gmail.com**:
1. Open Google Forms → Blank form.
2. Name it **Qentro Finance User Register**.
3. Add these fields:
   - First Name
   - Last Name
   - Company Name
   - Email
   - Country (United States / Canada)
   - Status (Active / Disabled / Test)
   - Notes (optional)
4. Open **Responses → Link to Sheets** and create a spreadsheet named **Qentro Finance User Register**.

The Form is useful when you want to add a user note manually. Automatic web signups are written to a separate `Users` tab in the same response spreadsheet through your own Apps Script webhook.

## B. Add automatic signup tracking
1. Open the linked Google Sheet.
2. Extensions → Apps Script.
3. Replace the sample script with `google/signup-tracker.gs` from this package.
4. Save.
5. Deploy → New deployment → **Web app**.
6. Execute as: **Me**.
7. Who has access: choose the least-public option that still allows POSTs from your Supabase Edge Function. If Google requires "Anyone" for an external POST, treat the URL as a secret and do not publish it.
8. Copy the deployment URL.
9. In your terminal run:

```bash
supabase secrets set GOOGLE_SIGNUP_WEBHOOK_URL="PASTE_THE_WEB_APP_URL"
```

After a successful account creation, the Edge Function posts only:
- Signup time
- First name
- Last name
- Company name
- Email
- Country
- Status
- Support contact (`contact@qentrotech.com`)

It does **not** send expenses, revenue, receipts, bank transactions, reports, passwords, or tax data to Google.

## C. Where to view users
Your easiest owner views are:
1. Supabase → Authentication → Users (login/auth account list)
2. Supabase → Table Editor → `organizations` / `user_profiles`
3. Google Drive → **Qentro Finance User Register** for the simple business-facing list
