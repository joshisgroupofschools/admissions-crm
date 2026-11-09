# Isolated Apps Script connectivity proof

This is a disposable technical proof, not the admissions CRM backend. It does not alter CRM workflows or CRM storage.

## Apps Script / private Sheet setup

1. Create a **new test spreadsheet**. Keep it private. Add a tab named `Proof` with headers: `id`, `createdAt`, `sequence`, `requestId`, `value`.
2. Create a standalone Apps Script project and paste `Code.gs`.
3. In **Project Settings → Script Properties**, set `SPREADSHEET_ID` to the test spreadsheet ID. The ID is the portion between `/d/` and `/edit` in its URL.
4. Deploy as a web app executing as the owner. For this throwaway proof only, select access that permits the GitHub Pages browser to invoke the URL. Do not put real student or staff information in this test sheet. Keep the deployment URL private and delete/restrict the deployment after testing.
5. Copy the deployed `/exec` URL.

## Browser checks

Deploy this folder as a static page under the actual GitHub Pages origin, then enter the `/exec` URL and run each button:

- **GET / read**: reads test rows from the private sheet.
- **POST / write**: appends a uniquely identified row.
- **Error response**: sends a deliberate invalid action and displays the structured JSON error.
- **Two concurrent POSTs**: sends two writes in parallel, then reads the rows back. Both values should be present with distinct sequence values.

The POST uses `text/plain` with JSON content to avoid browser preflight. This only solves preflight; the browser must still be allowed to read the final Apps Script response. The live page is the authority on CORS behavior. If it fails CORS, this direct browser-to-Apps-Script design is not viable as-is, and a small proxy/API host will be needed.

## Interpretation

Successful row access proves the script can access a private Sheet under its deploying owner's permissions. Concurrent requests should both appear because the critical read/append/sequence update is guarded by `LockService.getScriptLock()`.
