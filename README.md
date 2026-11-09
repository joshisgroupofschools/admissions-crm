# Joshi's Vidyaniketan Admissions CRM

A local admissions CRM for enquiry, walk-in, follow-up, retention and capacity workflows. It uses React, Vite and browser localStorage. The app does not connect to a server or Google Sheets yet.

## Run

1. Run `npm install` once.
2. Run `npm run dev` and open the local URL Vite prints.
3. Run `npm run build` to verify the production bundle.
4. Run `npm test` to check promotion and admissions calculations.

## Data and capacity

- Staff-created enquiries, walk-ins, admissions, follow-ups and retention records are saved in this browser.
- The supplied 2025-26 through 2027-28 capacity figures are the initial source of truth in `src/capacityData.js`.
- Capacity values are edited by class. Retained strength, admissions needed, admissions yet to get and totals update from their source values.
- Confirming or editing an admission updates its matching class count. Dashboard capacity and group targets read the same figures.
- New walk-ins create linked leads immediately. Two same-class, same-board duplicate leads can be merged from All Enquiries.
- The app starts without invented student records. Reserved `ENQ-DEMO-*`, `FAM-DEMO-*` and `WI-DEMO-*` sample records are removed during migration; other saved records are preserved.

## Main files

- `src/App.jsx` — shared state, saving and lead workflows.
- `src/Dashboard.jsx` — connected summary and detail cards.
- `src/Capacity.jsx` and `src/capacityData.js` — board/class drill-down and supplied source figures.
- `src/Records.jsx` — enquiry, walk-in, follow-up and settings screens.
- `src/Retention.jsx` — retention records, import and promotion preview.
- `src/services/dataService.js` and `src/adapters/mockAdapter.js` — local data access and migration.

Use **Settings → Reset local data** only when you want to clear saved records and restore the supplied capacity table.
