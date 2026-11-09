/**
 * Isolated connectivity proof only. This is not the CRM backend.
 * Set SPREADSHEET_ID in Script Properties to the ID of a private test sheet.
 * Deploy as a web app executing as the owner; restrict access to anyone with
 * the URL only for this disposable test deployment.
 */
function doGet(e) {
  return handle_(e, 'GET');
}

function doPost(e) {
  return handle_(e, 'POST');
}

function handle_(e, method) {
  const requestId = String(e?.parameter?.requestId || Utilities.getUuid());
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('Missing Script Property SPREADSHEET_ID. In this Apps Script project, open Project Settings → Script Properties and add SPREADSHEET_ID with the test spreadsheet ID as its value. Save, then retry.');

    const body = method === 'POST' ? JSON.parse(e?.postData?.contents || '{}') : {};
    const action = method === 'GET' ? String(e?.parameter?.action || 'read') : String(body.action || 'write');
    if (action === 'error') throw new Error('Intentional proof error');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Proof');
      if (!sheet) throw new Error('Create a sheet tab named Proof');

      let result;
      if (action === 'read') {
        result = {rows: sheet.getDataRange().getValues()};
      } else if (action === 'write') {
        const value = String(body.value || '');
        if (!value) throw new Error('POST value is required');
        const sequence = Number(props.getProperty('PROOF_SEQUENCE') || 0) + 1;
        props.setProperty('PROOF_SEQUENCE', String(sequence));
        sheet.appendRow([Utilities.getUuid(), new Date().toISOString(), sequence, requestId, value]);
        result = {sequence, value, rows: sheet.getLastRow() - 1};
      } else {
        throw new Error('Unsupported action');
      }
      return json_({ok: true, method, requestId, result});
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json_({ok: false, method, requestId, error: String(error?.message || error)});
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
