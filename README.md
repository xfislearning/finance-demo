# Qentro Finance Demo

Standalone browser demo of Qentro Finance for GitHub Pages. It uses sample data only and stores demo changes in the visitor's browser using localStorage.

## What is included

- Dashboard with YTD revenue, expenses, mileage deduction, and estimated net
- Expense list and Add Demo Expense
- Mileage log
- Invoices
- Reports with expense category summary
- Demo Mode banner
- Reset Demo Data button
- Responsive phone layout
- GitHub Pages deployment workflow

## Important

This repository is for demonstration only. Do not add your real SQLite database, bank exports, invoices, credentials, API keys, or real financial records.

## Test locally

Install Node.js, then run:

```powershell
npm install
npm run dev
```

Open the address shown by Vite.

## Publish to GitHub Pages

### 1. Create the repository

Create a public repository such as:

`qentro-finance-demo`

The included Vite configuration automatically detects the GitHub repository name during deployment.

### 2. Upload these files

Upload the entire contents of this package to the repository root and commit to the `main` branch.

### 3. Enable GitHub Pages

In GitHub:

`Repository > Settings > Pages`

Under **Build and deployment**, set **Source** to:

`GitHub Actions`

### 4. Wait for the workflow to complete

Open:

`Repository > Actions`

The `Deploy Qentro Finance Demo` workflow should become green.

### 5. Open the demo

For GitHub user `xfislearning`, the expected URL is:

`https://xfislearning.github.io/qentro-finance-demo/`

## Using another repository name

No code change is needed. The GitHub Actions build automatically detects the repository name and sets the correct GitHub Pages base path.

## Demo data

Edit `src/demoData.js` to change the sample company, expenses, mileage, and invoices.

## Reset behavior

Demo changes are stored only in the current browser. Selecting **Reset Demo Data** restores the original sample records from `src/demoData.js`.
