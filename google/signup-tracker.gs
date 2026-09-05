/**
 * Qentro Finance signup tracker
 * Attach this Apps Script to the Google Sheet linked to your tracking Google Form.
 * Deploy as a Web App and set the resulting URL as the Supabase Edge Function
 * secret GOOGLE_SIGNUP_WEBHOOK_URL.
 */
function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['Created At','First Name','Last Name','Company Name','Email','Country','Status','Support Contact']);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    payload.created_at || new Date().toISOString(),
    payload.first_name || '',
    payload.last_name || '',
    payload.company_name || '',
    payload.email || '',
    payload.country || '',
    payload.status || 'Active',
    'contact@qentrotech.com'
  ]);
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}
