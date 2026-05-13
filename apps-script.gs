// ============================================
// GOOGLE APPS SCRIPT — Yosemite RSVP backend
// ============================================
// Paste this entire file into Apps Script (script.google.com), bound to your Google Sheet.
// Then deploy as a Web App (Deploy > New Deployment > Web App).
// Settings: Execute as "Me", Access "Anyone".
// Copy the deployment URL and use it as your APPS_SCRIPT_URL env var in Vercel.

// Column order in the sheet (row 1 should be headers matching this list):
const COLUMNS = [
  'timestamp',
  'name',
  'phone',
  'going',
  'guests',
  'driving',
  'seats',
  'gas',
  'gasAmount',
  'food',
  'dietary',
  'notes',
];

// ============================================
// doPost — handles new RSVP submissions
// ============================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Ensure headers exist
    ensureHeaders(sheet);

    // Build row in column order
    const row = COLUMNS.map(col => payload[col] || '');
    sheet.appendRow(row);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ============================================
// doGet — returns all RSVPs as JSON
// ============================================
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureHeaders(sheet);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({ entries: [] });
    }

    const headers = data[0];
    const entries = data.slice(1).map(row => {
      const entry = {};
      headers.forEach((h, i) => {
        entry[h] = row[i];
      });
      return entry;
    });

    return jsonResponse({ entries });
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ============================================
// HELPERS
// ============================================
function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  const needsHeaders = firstRow.every(c => c === '' || c === null);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length)
      .setFontWeight('bold')
      .setBackground('#1f3a2e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

function jsonResponse(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
