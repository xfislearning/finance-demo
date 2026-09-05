# GitHub Pages deployment - Qentro Finance v0.7.0

1. Create or open the GitHub repository that will host Qentro Finance.
2. Upload the CONTENTS of this ZIP to the repository root. Do not upload the ZIP as a single file.
3. In GitHub: Settings > Secrets and variables > Actions > Variables, add:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
4. Open `.github/workflows/deploy.yml` and confirm it builds with `npm ci` and `npm run build`.
5. Settings > Pages > Source: GitHub Actions.
6. Commit/push. Open the Actions tab and wait for the deploy workflow to complete.
7. Open the GitHub Pages site. Verify the public demo loads first.
8. Do not publish the Supabase secret/service key in GitHub, Vite env, screenshots, or source files.
