QENTRO FINANCE v0.5.1 WEB DEMO

Purpose
-------
Customer-facing demo of the actual Qentro Finance v0.5.1 React UI.

What is unchanged
-----------------
- Existing App.jsx
- Existing styles.css / UI scheme
- Existing logo asset
- Existing pages and workflows
- Existing finance service layer and calculations

What is changed
---------------
- Tauri SQLite is replaced by an in-browser SQLite database (sql.js).
- The browser database is persisted in localStorage.
- Tauri open/save dialogs are replaced with browser file upload/download.
- Sample customers, expenses, mileage, invoices and bank transactions are seeded.
- A DEMO MODE badge is displayed.
- Vite base is relative so GitHub Pages/custom-domain assets resolve correctly.
- GitHub Pages workflow is included.

Safety
------
This package contains demo/sample data only. It does not connect to the
desktop qentro_finance.db database.

Deploy
------
Upload the CONTENTS of this folder to the root of the finance-demo GitHub repo.
In GitHub > Settings > Pages, choose Source: GitHub Actions.
The included workflow builds and deploys the site.

Important
---------
This full UI cannot be a single hand-written index.html without rewriting the
application. React is part of the actual v0.5.1 UI. GitHub Pages still serves
the final result as static HTML/JS/CSS; there is no application backend/server.
