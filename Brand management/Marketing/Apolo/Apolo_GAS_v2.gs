/*****************************************************************
 * APOLO MARKETING MANAGEMENT — Google Apps Script v2
 *
 * What's new in v2:
 *   - buildSheetFromScratch(): generates the entire workbook from zero
 *     (no more xlsx upload needed). Menu: Apolo ▸ Build sheet from scratch.
 *   - doPost() / doGet() web app endpoints so the Next.js app can
 *     push approved posts and pull status. Protected by SHARED_SECRET.
 *
 * SETUP (one time):
 *   1. Open a blank Google Sheet. File ▸ Rename to "Apolo Marketing Mgmt".
 *   2. Extensions ▸ Apps Script. Paste this entire file as Code.gs. Save.
 *   3. Script Properties (Project Settings ▸ Script Properties):
 *        SHARED_SECRET = <paste a long random string here>
 *   4. Edit the 3 email constants below.
 *   5. Reload the sheet. Menu "🟦 Apolo" appears.
 *   6. Apolo ▸ Build sheet from scratch  → creates all 5 tabs.
 *   7. Apolo ▸ Install weekly digest trigger  (enables onEdit + Mon 8AM email).
 *   8. Deploy ▸ New deployment ▸ Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *        Copy the /exec URL → paste into the Next.js app's GAS_WEBAPP_URL env.
 *****************************************************************/

const HIEN_EMAIL  = 'hien@apolo.vn';       // ← change
const PM_EMAIL    = 'cskh@matviet.com.vn'; // ← you
const NHUY_EMAIL  = 'nhuy@apolo.vn';       // ← change
const FIRM_NAME   = 'Apolo Law Firm';

const SHEETS = {
  DASH:  'Dashboard',
  VN:    'Posts_VN',
  EN:    'Posts_EN',
  ADS:   'Ads_Campaigns',
  VID:   'Videos',
  LISTS: 'Lists',
};

// Column positions (1-based). Used by doPost/doGet and sheet generator.
const POST_COLS = {
  POST_ID: 1, FANPAGE: 2, PLANNED_DATE: 3, CHANNEL: 4, FORMAT: 5,
  TOPIC: 6, CAPTION: 7, HASHTAGS: 8, IMAGE_URL: 9, ASSIGNEE: 10,
  STATUS: 11, NEEDS_LEGAL: 12, LEGAL_REVIEWER: 13,
  VERIFY_TEXT: 14,    // renamed from LEGAL_APPR — 2-step approval step 1
  VERIFY_IMAGE: 15,   // renamed from CONTENT_APPR — 2-step approval step 2
  APPROVAL_NOTES: 16, WILL_RUN_ADS: 17,
  LINKED_CAMPAIGN: 18, PERF_NOTES: 19, APP_ID: 20, LAST_UPDATED: 21,
};

// =============================================================
// MENU
// =============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🟦 Apolo')
    .addItem('🆕 Build sheet from scratch',   'buildSheetFromScratch')
    .addSeparator()
    .addItem('🔄 Refresh Dashboard',          'refreshDashboard')
    .addSeparator()
    .addItem('➕ New Post (VN)',               'newPostVN')
    .addItem('➕ New Post (EN)',               'newPostEN')
    .addItem('➕ New Ads Campaign',            'newAdsCampaign')
    .addItem('➕ New Video',                   'newVideo')
    .addSeparator()
    .addItem('📧 Email pending → Hiển',       'emailPendingToHien')
    .addItem('📧 Weekly digest → Team',       'emailWeeklyDigest')
    .addSeparator()
    .addItem('🔒 Lock approved rows',         'lockApprovedRows')
    .addItem('⏱ Install weekly trigger',     'installWeeklyTrigger')
    .addItem('🗑 Remove all triggers',         'removeAllTriggers')
    .addToUi();
}

// =============================================================
// BUILD SHEET FROM SCRATCH — creates all tabs, headers, dropdowns
// =============================================================
function buildSheetFromScratch() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert('Build sheet from scratch', 'This will create/replace all tabs. Continue?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActive();

  // Remove existing sheets (except one we'll rename)
  const existing = ss.getSheets();
  const keeper = existing[0];
  keeper.setName('_temp_delete_me');

  _buildLists(ss);
  _buildPostsSheet(ss, SHEETS.VN, 'Posts - Vietnamese', 'VN');
  _buildPostsSheet(ss, SHEETS.EN, 'Posts - English', 'EN');
  _buildAdsSheet(ss);
  _buildVideosSheet(ss);
  _buildDashboard(ss);

  // Remove the placeholder
  ss.deleteSheet(ss.getSheetByName('_temp_delete_me'));

  // Order tabs
  const order = [SHEETS.DASH, SHEETS.VN, SHEETS.EN, SHEETS.ADS, SHEETS.VID, SHEETS.LISTS];
  order.forEach((name, i) => {
    const sh = ss.getSheetByName(name);
    if (sh) ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1);
  });
  ss.setActiveSheet(ss.getSheetByName(SHEETS.DASH));

  SpreadsheetApp.getUi().alert('✅ Sheet built successfully. Reload if menu items are missing.');
}

function _buildLists(ss) {
  const sh = _getOrCreate(ss, SHEETS.LISTS);
  sh.clear();
  sh.setTabColor('#CCCCCC');
  const data = [
    ['Status', 'Channels', 'Formats', 'Languages', 'Approvals', 'Stages', 'Objectives', 'Placements', 'CTAs', 'YesNo'],
    ['Idea', 'Facebook', 'Feed Post (Square)', 'vi', 'Pending', '1. Subject', 'Awareness', 'Feed', 'Contact Us', 'Yes'],
    ['Drafting', 'Instagram', 'Feed Post (Wide)', 'en', 'Approved', '2. Legal Info', 'Traffic', 'Stories', 'Learn More', 'No'],
    ['Pending Hiển Approval', 'TikTok', 'Story / Reel', 'both', 'Revise', '3. Script', 'Engagement', 'Reels', 'Book Now', ''],
    ['Approved', 'YouTube', 'Carousel', '', 'Rejected', '4. Audio Preview', 'Leads', 'Right Column', 'Send Message', ''],
    ['Scheduled', 'Zalo', 'Ad (Square)', '', '', '5. 1st Scene Image', 'Conversions', 'Marketplace', 'Call Now', ''],
    ['Published', '', 'Ad (Landscape)', '', '', '6. Footage', 'App Installs', '', 'Sign Up', ''],
    ['Revise', '', 'Cover Photo', '', '', '7. Final Video', 'Video Views', '', '', ''],
    ['Rejected', '', '', '', '', 'Published', '', '', '', ''],
  ];
  sh.getRange(1, 1, data.length, data[0].length).setValues(data);
  sh.getRange(1, 1, 1, data[0].length).setFontWeight('bold').setBackground('#1F3864').setFontColor('#FFFFFF');
  sh.autoResizeColumns(1, data[0].length);
  sh.hideSheet();
}

function _buildPostsSheet(ss, sheetName, title, lang) {
  const sh = _getOrCreate(ss, sheetName);
  sh.clear();
  sh.setTabColor(lang === 'VN' ? '#EA4335' : '#4285F4');

  // Title row
  sh.getRange(1, 1, 1, 21).merge()
    .setValue(`🟦 ${title}`)
    .setBackground('#D9E1F2').setFontSize(14).setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Header row
  const headers = [
    'Post ID', 'Fanpage', 'Planned Date', 'Channel', 'Format',
    'Topic', 'Caption', 'Hashtags', 'Image/Video Link', 'Assignee',
    'Status', 'Needs Legal Review', 'Legal Reviewer',
    '✅ Duyệt Text (Hiển)',    // step 1: verify text content
    '✅ Duyệt Hình (Hiển)',    // step 2: verify image
    'Ghi chú duyệt', 'Chạy quảng cáo?',
    'Linked Campaign ID', 'Performance Notes', 'app_id (hidden)', 'Last Updated',
  ];
  sh.getRange(2, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold')
    .setWrap(true).setVerticalAlignment('middle');

  // Row heights
  sh.setRowHeight(1, 36); sh.setRowHeight(2, 44);

  // Column widths
  const widths = [90, 110, 100, 100, 140, 200, 400, 220, 170, 110, 160, 130, 120, 160, 160, 220, 110, 140, 220, 0, 140];
  widths.forEach((w, i) => { if (w > 0) sh.setColumnWidth(i + 1, w); });
  sh.hideColumns(20); // app_id hidden

  // Freeze
  sh.setFrozenRows(2);

  // Data validation (dropdowns) - pulled from Lists
  const lists = SHEETS.LISTS;
  _dropdown(sh, 11, 3, 500, `=${lists}!A2:A10`);  // Status
  _dropdown(sh, 12, 3, 500, `=${lists}!J2:J3`);   // Needs Legal Review (YesNo)
  _dropdown(sh, 14, 3, 500, `=${lists}!E2:E6`);   // Legal Approved (Approvals)
  _dropdown(sh, 15, 3, 500, `=${lists}!E2:E6`);   // Content Approved (Approvals)
  _dropdown(sh, 17, 3, 500, `=${lists}!J2:J3`);   // Will Run Ads (YesNo)
  _dropdown(sh, 4, 3, 500, `=${lists}!B2:B6`);    // Channel
  _dropdown(sh, 5, 3, 500, `=${lists}!C2:C8`);    // Format

  // Date format
  sh.getRange(3, 3, 500, 1).setNumberFormat('yyyy-MM-dd');
  sh.getRange(3, 21, 500, 1).setNumberFormat('yyyy-MM-dd HH:mm');

  // Conditional formatting: yellow if Needs Legal Review = Yes
  const rules = sh.getConditionalFormatRules();
  const legalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$L3="Yes"')
    .setBackground('#FFF9C4')
    .setRanges([sh.getRange(3, 1, 500, 21)])
    .build();
  const publishedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$K3="Published"')
    .setBackground('#C8E6C9')
    .setRanges([sh.getRange(3, 1, 500, 21)])
    .build();
  const rejectedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$K3="Rejected"')
    .setBackground('#FFCDD2')
    .setRanges([sh.getRange(3, 1, 500, 21)])
    .build();
  sh.setConditionalFormatRules([...rules, legalRule, publishedRule, rejectedRule]);
}

function _buildAdsSheet(ss) {
  const sh = _getOrCreate(ss, SHEETS.ADS);
  sh.clear();
  sh.setTabColor('#FBBC04');

  sh.getRange(1, 1, 1, 24).merge()
    .setValue('🟦 Ads Campaigns')
    .setBackground('#D9E1F2').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');

  const headers = [
    'Campaign ID', 'Fanpage', 'Linked Post ID', 'Name',
    'Objective', 'Audience', 'Audience Detail', 'Goal',
    'Placement', 'CTA', 'Landing URL', 'Budget/day',
    'Start Date', 'Duration (days)', 'Total Budget', 'Ads Approval',
    'Assignee', 'Status', 'Spend', 'Reach',
    'Impressions', 'Clicks', 'Leads', 'CPL / CTR',
  ];
  sh.getRange(2, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
  sh.setRowHeight(1, 36); sh.setRowHeight(2, 44);
  sh.setFrozenRows(2);

  // Auto-calc Total Budget = Budget/day * Duration
  // Sheet locale uses ";" as argument separator. Use setValue() per row.
  for (let r = 3; r < 303; r++) {
    sh.getRange(r, 15).setValue(`=IFERROR(IF(AND(L${r}<>"";N${r}<>"");L${r}*N${r};"");"")`);
  }

  const lists = SHEETS.LISTS;
  _dropdown(sh, 5, 3, 300, `=${lists}!G2:G8`);   // Objective
  _dropdown(sh, 9, 3, 300, `=${lists}!H2:H6`);   // Placement
  _dropdown(sh, 10, 3, 300, `=${lists}!I2:I6`);  // CTA
  _dropdown(sh, 16, 3, 300, `=${lists}!E2:E6`);  // Ads Approval
  _dropdown(sh, 18, 3, 300, `=${lists}!A2:A10`); // Status

  sh.getRange(3, 13, 300, 1).setNumberFormat('yyyy-MM-dd'); // Start date
  sh.getRange(3, 12, 300, 1).setNumberFormat('#,##0');
  sh.getRange(3, 15, 300, 1).setNumberFormat('#,##0');
  sh.getRange(3, 19, 300, 1).setNumberFormat('#,##0');
  sh.getRange(3, 20, 300, 4).setNumberFormat('#,##0');
}

function _buildVideosSheet(ss) {
  const sh = _getOrCreate(ss, SHEETS.VID);
  sh.clear();
  sh.setTabColor('#34A853');

  sh.getRange(1, 1, 1, 21).merge()
    .setValue('🟦 Videos - Production Pipeline')
    .setBackground('#D9E1F2').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');

  const headers = [
    'Video ID', 'Fanpage', 'Planned Date', 'Subject',
    'Subject Approval', 'Legal Info', 'Legal Approval', 'Script',
    'Audio Preview Link', 'Audio Approval', '1st Scene Image', 'Footage Link',
    'Footage Approval', 'Final Video Link', 'Final Approval', 'Current Stage',
    'Assignee', 'Notes', '(reserved)', '(reserved)', 'Last Updated',
  ];
  sh.getRange(2, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
  sh.setRowHeight(1, 36); sh.setRowHeight(2, 44);
  sh.setFrozenRows(2);

  const lists = SHEETS.LISTS;
  [5, 7, 10, 13, 15].forEach((col) => _dropdown(sh, col, 3, 300, `=${lists}!E2:E6`)); // Approvals
  _dropdown(sh, 16, 3, 300, `=${lists}!F2:F9`); // Current Stage

  sh.getRange(3, 3, 300, 1).setNumberFormat('yyyy-MM-dd');
  sh.getRange(3, 21, 300, 1).setNumberFormat('yyyy-MM-dd HH:mm');
}

function _buildDashboard(ss) {
  const sh = _getOrCreate(ss, SHEETS.DASH);
  sh.clear();
  sh.setTabColor('#1F3864');

  // Title
  sh.getRange(1, 1, 1, 9).merge().setValue(`🟦 ${FIRM_NAME} — Marketing Dashboard`)
    .setBackground('#1F3864').setFontColor('#FFFFFF').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1, 40);

  sh.getRange(2, 1).setValue('Last refresh:').setFontWeight('bold');
  sh.getRange(2, 2).setValue(new Date()).setNumberFormat('yyyy-MM-dd HH:mm');

  // KPI cards: labels row 4, values row 5 — MERGE FIRST, THEN SET FORMULA on anchor
  // Sheet locale uses ";" as argument separator. Use setValue() with a formula
  // string so Sheets parses it in its native locale.
  const kpiLabels = ['📋 Chờ duyệt', '📅 7 ngày tới', '🎯 Ads đang chạy', '💰 Tổng chi (₫)'];
  const kpiFormulas = [
    `=IFERROR(COUNTIF(Posts_VN!N3:N500;"Pending")+COUNTIF(Posts_VN!O3:O500;"Pending")+COUNTIF(Posts_EN!N3:N500;"Pending")+COUNTIF(Posts_EN!O3:O500;"Pending");0)`,
    `=IFERROR(COUNTIFS(Posts_VN!C3:C500;">="&TODAY();Posts_VN!C3:C500;"<="&(TODAY()+7))+COUNTIFS(Posts_EN!C3:C500;">="&TODAY();Posts_EN!C3:C500;"<="&(TODAY()+7));0)`,
    `=IFERROR(COUNTIF(Ads_Campaigns!R3:R300;"Running");0)`,
    `=IFERROR(SUMIFS(Ads_Campaigns!S3:S300;Ads_Campaigns!R3:R300;"Running");0)`,
  ];
  kpiLabels.forEach((lbl, i) => {
    const col = i * 2 + 1;
    // Label row 4
    sh.getRange(4, col, 1, 2).merge().setValue(lbl)
      .setBackground('#D9E1F2').setFontWeight('bold').setHorizontalAlignment('center');
    // Value row 5 — merge first, then set formula via setValue (locale-aware parse)
    sh.getRange(5, col, 1, 2).merge()
      .setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#F3F4F6');
    sh.getRange(5, col).setValue(kpiFormulas[i]);
  });
  sh.getRange(5, 7).setNumberFormat('#,##0');
  sh.setRowHeight(4, 28); sh.setRowHeight(5, 56);

  // Pending section header
  sh.getRange(7, 1, 1, 7).merge().setValue('⚠️ Pending Approvals (needs Hiển\'s attention)')
    .setBackground('#FFEB9C').setFontWeight('bold').setHorizontalAlignment('left');
  const pendHeaders = ['Type', 'ID', 'Fanpage', 'Topic', 'Needs', 'Assignee', 'Date'];
  sh.getRange(8, 1, 1, 7).setValues([pendHeaders]).setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.getRange(9, 1).setValue('(Click Apolo ▸ Refresh Dashboard to populate)').setFontStyle('italic').setFontColor('#888');

  // Weekly schedule section
  sh.getRange(30, 1, 1, 9).merge().setValue('📅 This Week Publishing Schedule')
    .setBackground('#C8E6C9').setFontWeight('bold').setHorizontalAlignment('left');
  const weekHeaders = ['Fanpage', 'Post ID', 'Date', 'Channel', 'Format', 'Topic', 'Assignee', 'Status', 'Will Run Ads'];
  sh.getRange(31, 1, 1, 9).setValues([weekHeaders]).setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.getRange(32, 1).setValue('(Click Apolo ▸ Refresh Dashboard to populate)').setFontStyle('italic').setFontColor('#888');

  // Column widths
  [90, 100, 110, 300, 140, 100, 110, 80, 100].forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

// Helper: get existing sheet or create new
function _getOrCreate(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.showSheet();
  return sh;
}

// Helper: add dropdown validation using a formula range
function _dropdown(sh, col, startRow, numRows, formulaRange) {
  const range = sh.getRange(startRow, col, numRows, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(SpreadsheetApp.getActive().getRange(formulaRange.replace('=', '')), true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

// =============================================================
// onEdit — runs on every cell edit
// =============================================================
function onEdit(e) {
  if (!e || !e.range) return;
  const sh   = e.range.getSheet();
  const name = sh.getName();
  const row  = e.range.getRow();
  const col  = e.range.getColumn();
  if (row < 3) return;

  if (name === SHEETS.VN || name === SHEETS.EN) {
    sh.getRange(row, POST_COLS.LAST_UPDATED).setValue(new Date());
    // 2-step approval: both Verify Text AND Verify Image must be Approved
    const verifyText  = sh.getRange(row, POST_COLS.VERIFY_TEXT).getValue();
    const verifyImage = sh.getRange(row, POST_COLS.VERIFY_IMAGE).getValue();
    const status = sh.getRange(row, POST_COLS.STATUS).getValue();
    if (verifyText === 'Approved' && verifyImage === 'Approved' && status !== 'Published' && status !== 'Scheduled') {
      sh.getRange(row, POST_COLS.STATUS).setValue('Approved');
    }
    if (verifyText === 'Rejected' || verifyImage === 'Rejected') {
      sh.getRange(row, POST_COLS.STATUS).setValue('Rejected');
    }
    if (verifyText === 'Revise' || verifyImage === 'Revise') {
      sh.getRange(row, POST_COLS.STATUS).setValue('Revise');
    }
  }
  if (name === SHEETS.VID) {
    sh.getRange(row, 21).setValue(new Date());
    autoAdvanceVideoStage(sh, row);
  }
  if (name === SHEETS.ADS) {
    if (col === 16) {
      const v = e.range.getValue();
      if (v === 'Approved')  sh.getRange(row, 18).setValue('Approved');
      if (v === 'Rejected')  sh.getRange(row, 18).setValue('Rejected');
      if (v === 'Revise')    sh.getRange(row, 18).setValue('Draft');
    }
  }
}

function autoAdvanceVideoStage(sh, row) {
  const vals = sh.getRange(row, 1, 1, 21).getValues()[0];
  const subj = vals[4], legal = vals[6], audio = vals[9], footage = vals[12], final = vals[14];
  let stage = '1. Subject';
  if (subj === 'Approved') stage = '2. Legal Info';
  if (legal === 'Approved') stage = '3. Script';
  if (vals[7]) stage = '4. Audio Preview';
  if (audio === 'Approved') stage = '5. 1st Scene Image';
  if (vals[10]) stage = '6. Footage';
  if (footage === 'Approved') stage = '7. Final Video';
  if (final === 'Approved') stage = 'Published';
  sh.getRange(row, 16).setValue(stage);
}

// =============================================================
// ID GENERATORS
// =============================================================
function nextId(sheetName, prefix, idCol) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const ids = sh.getRange(3, idCol, 500, 1).getValues().flat().filter(String);
  let max = 0;
  ids.forEach(v => {
    const m = String(v).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

function newPostVN() { _newRow(SHEETS.VN, 'VN', 1, {2: 'Apolo VN', 3: new Date(), 10: 'Như Ý', 11: 'Idea', 14: 'Pending', 15: 'Pending'}); }
function newPostEN() { _newRow(SHEETS.EN, 'EN', 1, {2: 'Apolo EN', 3: new Date(), 10: 'Như Ý', 11: 'Idea', 14: 'Pending', 15: 'Pending'}); }
function newAdsCampaign() { _newRow(SHEETS.ADS, 'CMP', 1, {17: 'Như Ý', 16: 'Pending', 18: 'Draft'}); }
function newVideo() { _newRow(SHEETS.VID, 'VID', 1, {2: 'Apolo VN', 5: 'Pending', 7: 'Pending', 10: 'Pending', 13: 'Pending', 15: 'Pending', 16: '1. Subject', 17: 'Như Ý'}); }

function _newRow(sheetName, prefix, idCol, defaults) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const lastRow = sh.getLastRow();
  let r = 3;
  for (let i = 3; i <= lastRow + 1; i++) {
    if (!sh.getRange(i, idCol).getValue()) { r = i; break; }
  }
  sh.getRange(r, idCol).setValue(nextId(sheetName, prefix, idCol));
  Object.keys(defaults).forEach(k => sh.getRange(r, Number(k)).setValue(defaults[k]));
  sh.setActiveRange(sh.getRange(r, idCol));
  SpreadsheetApp.getUi().alert(`New row created: ${sheetName} row ${r}`);
}

// =============================================================
// REFRESH DASHBOARD
// =============================================================
function refreshDashboard() {
  const ss = SpreadsheetApp.getActive();
  const dash = ss.getSheetByName(SHEETS.DASH);

  const pending = collectPendingApprovals();
  const pendStartRow = 9;
  dash.getRange(pendStartRow, 1, 20, 8).clearContent().clearFormat();
  if (pending.length === 0) {
    dash.getRange(pendStartRow, 1).setValue('🎉 No items pending approval.')
        .setFontStyle('italic').setFontColor('#2E7D32');
  } else {
    dash.getRange(pendStartRow, 1, pending.length, 7).setValues(pending);
    dash.getRange(pendStartRow, 1, pending.length, 7)
        .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
    dash.getRange(pendStartRow, 1, pending.length, 1).setBackground('#FFEB9C').setFontWeight('bold');
  }

  const weekStart = 32;
  dash.getRange(weekStart, 1, 30, 9).clearContent().clearFormat();
  const week = collectWeekSchedule();
  if (week.length === 0) {
    dash.getRange(weekStart, 1).setValue('— No posts scheduled in next 7 days —').setFontStyle('italic');
  } else {
    dash.getRange(weekStart, 1, week.length, 9).setValues(week);
    dash.getRange(weekStart, 1, week.length, 9)
        .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  }

  dash.getRange('B2').setValue(new Date());
  SpreadsheetApp.getActive().toast('Dashboard refreshed', 'Apolo', 3);
}

function collectPendingApprovals() {
  const ss = SpreadsheetApp.getActive();
  const rows = [];

  [SHEETS.VN, SHEETS.EN].forEach(name => {
    const sh = ss.getSheetByName(name);
    const data = sh.getRange(3, 1, 500, 21).getValues();
    data.forEach(r => {
      if (!r[0]) return;
      // 2-step: r[13] = Verify Text (col N), r[14] = Verify Image (col O)
      const textPend  = r[13] === 'Pending';
      const imagePend = r[14] === 'Pending';
      if (textPend)  rows.push([`Post ${name.slice(-2)}`, r[0], r[1], r[5], 'Duyệt Text',  r[9], r[2]]);
      if (imagePend) rows.push([`Post ${name.slice(-2)}`, r[0], r[1], r[5], 'Duyệt Hình',  r[9], r[2]]);
    });
  });

  const ads = ss.getSheetByName(SHEETS.ADS);
  ads.getRange(3, 1, 300, 20).getValues().forEach(r => {
    if (!r[0]) return;
    if (r[15] === 'Pending') rows.push(['Ads', r[0], r[2], r[3], 'Ads Approval', r[16], r[12]]);
  });

  const vid = ss.getSheetByName(SHEETS.VID);
  vid.getRange(3, 1, 200, 21).getValues().forEach(r => {
    if (!r[0]) return;
    const pending = [];
    if (r[4]  === 'Pending') pending.push('Subject');
    if (r[6]  === 'Pending') pending.push('Legal Info');
    if (r[9]  === 'Pending') pending.push('Audio Preview');
    if (r[12] === 'Pending') pending.push('Footage');
    if (r[14] === 'Pending') pending.push('Final Video');
    pending.forEach(stage =>
      rows.push(['Video', r[0], r[1], r[3], stage + ' Approval', r[16], r[2]])
    );
  });

  return rows;
}

function collectWeekSchedule() {
  const ss = SpreadsheetApp.getActive();
  const today = new Date(); today.setHours(0,0,0,0);
  const plus7 = new Date(today.getTime() + 7*24*3600*1000);
  const rows = [];

  [SHEETS.VN, SHEETS.EN].forEach(name => {
    const sh = ss.getSheetByName(name);
    sh.getRange(3, 1, 500, 21).getValues().forEach(r => {
      if (!r[0]) return;
      const d = r[2];
      if (!(d instanceof Date)) return;
      if (d >= today && d <= plus7) {
        rows.push([r[1], r[0], r[2], r[3], r[4], r[5], r[9], r[10], r[16]]);
      }
    });
  });
  rows.sort((a,b) => a[2] - b[2]);
  return rows;
}

// =============================================================
// EMAIL
// =============================================================
function emailPendingToHien() {
  const pending = collectPendingApprovals();
  if (pending.length === 0) {
    SpreadsheetApp.getUi().alert('🎉 Không có mục nào đang chờ duyệt.');
    return;
  }
  const url = SpreadsheetApp.getActive().getUrl();
  let html = `<h2>${FIRM_NAME} — Nội dung chờ duyệt</h2>`;
  html += `<p>Chào anh Hiển, danh sách mục đang chờ duyệt (tổng: <b>${pending.length}</b>):</p>`;
  html += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:13px">';
  html += '<tr style="background:#1F3864;color:white"><th>Loại</th><th>ID</th><th>Fanpage</th><th>Chủ đề</th><th>Hạng mục</th><th>Phụ trách</th><th>Ngày</th></tr>';
  pending.forEach(r => {
    html += '<tr>' + r.map(v => `<td>${v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : (v||'')}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  html += `<p><a href="${url}">👉 Mở bảng duyệt</a></p>`;
  html += '<p style="color:#888;font-size:11px">Tự động gửi từ Apolo Marketing Mgmt Sheet.</p>';

  MailApp.sendEmail({
    to: HIEN_EMAIL,
    cc: PM_EMAIL,
    subject: `[Apolo] ${pending.length} mục chờ duyệt — ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM')}`,
    htmlBody: html
  });
  SpreadsheetApp.getActive().toast(`Đã gửi ${pending.length} mục đến ${HIEN_EMAIL}`, 'Apolo', 5);
}

function emailWeeklyDigest() {
  const pending = collectPendingApprovals();
  const week = collectWeekSchedule();
  const ss = SpreadsheetApp.getActive();

  const ads = ss.getSheetByName(SHEETS.ADS).getRange(3, 1, 300, 24).getValues();
  let runningAds = 0, totalSpend = 0, totalLeads = 0;
  ads.forEach(r => { if (r[17] === 'Running') { runningAds++; totalSpend += Number(r[18])||0; totalLeads += Number(r[22])||0; } });

  const fmt = n => n ? n.toLocaleString('vi-VN') : '0';
  const tz = Session.getScriptTimeZone();

  let html = `<h2>${FIRM_NAME} — Weekly Marketing Digest</h2>`;
  html += `<p>Tuần bắt đầu: ${Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy')}</p>`;
  html += '<h3>📊 KPI</h3><ul>';
  html += `<li>Mục chờ duyệt: <b>${pending.length}</b></li>`;
  html += `<li>Bài sẽ đăng 7 ngày tới: <b>${week.length}</b></li>`;
  html += `<li>Chiến dịch ads đang chạy: <b>${runningAds}</b> | Spend: <b>${fmt(totalSpend)}₫</b> | Leads: <b>${fmt(totalLeads)}</b></li>`;
  html += '</ul>';

  html += '<h3>📅 Lịch đăng bài tuần tới</h3>';
  if (week.length === 0) html += '<p><i>— chưa có bài nào trên lịch —</i></p>';
  else {
    html += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:13px">';
    html += '<tr style="background:#1F3864;color:white"><th>Fanpage</th><th>ID</th><th>Ngày</th><th>Channel</th><th>Format</th><th>Topic</th><th>Assignee</th><th>Status</th></tr>';
    week.forEach(r => {
      html += '<tr>' + r.slice(0,8).map(v => `<td>${v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM') : (v||'')}</td>`).join('') + '</tr>';
    });
    html += '</table>';
  }
  html += `<p><a href="${ss.getUrl()}">👉 Mở sheet</a></p>`;

  MailApp.sendEmail({
    to:      [PM_EMAIL, NHUY_EMAIL, HIEN_EMAIL].join(','),
    subject: `[Apolo] Weekly Digest — ${Utilities.formatDate(new Date(), tz, 'dd/MM')}`,
    htmlBody: html
  });
  SpreadsheetApp.getActive().toast('Weekly digest sent', 'Apolo', 3);
}

// =============================================================
// LOCK approved rows
// =============================================================
function lockApprovedRows() {
  const ss = SpreadsheetApp.getActive();
  let locked = 0;
  [SHEETS.VN, SHEETS.EN].forEach(name => {
    const sh = ss.getSheetByName(name);
    const data = sh.getRange(3, 1, 500, 21).getValues();
    data.forEach((r, i) => {
      if (r[0] && r[10] === 'Published') {
        const range = sh.getRange(3 + i, 1, 1, 21);
        const prot = range.protect().setDescription(`Locked — ${r[0]} published`);
        prot.removeEditors(prot.getEditors());
        locked++;
      }
    });
  });
  SpreadsheetApp.getUi().alert(`🔒 Đã khóa ${locked} dòng đã publish.`);
}

// =============================================================
// TRIGGERS
// =============================================================
function installWeeklyTrigger() {
  removeAllTriggers();
  ScriptApp.newTrigger('emailWeeklyDigest')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  ScriptApp.newTrigger('onEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getUi().alert('✅ Trigger cài đặt: weekly digest mỗi Thứ Hai 8AM.');
}
function removeAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

// =============================================================
// WEB APP ENDPOINTS — for Next.js app integration
// =============================================================
function getSharedSecret() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST endpoint — app pushes an approved post to the sheet.
 * Body: { token, action, data }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _jsonResponse({ ok: false, error: 'No body' });
    }
    const body = JSON.parse(e.postData.contents);
    const secret = getSharedSecret();
    if (!secret || body.token !== secret) {
      return _jsonResponse({ ok: false, error: 'Forbidden' });
    }

    if (body.action === 'create_post') {
      return _jsonResponse(_createPostRow(body.data));
    }
    if (body.action === 'create_ads') {
      return _jsonResponse(_createAdsRow(body.data));
    }
    if (body.action === 'get_status') {
      return _jsonResponse(_getPostStatus(body.data && body.data.app_id));
    }

    return _jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return _jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * GET endpoint — used for simple status pulls
 * ?token=xxx&action=get_status&app_id=yyy
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const secret = getSharedSecret();
    if (!secret || params.token !== secret) {
      return _jsonResponse({ ok: false, error: 'Forbidden' });
    }
    if (params.action === 'get_status') {
      return _jsonResponse(_getPostStatus(params.app_id));
    }
    if (params.action === 'ping') {
      return _jsonResponse({ ok: true, firm: FIRM_NAME, time: new Date().toISOString() });
    }
    return _jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return _jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * Insert a new row into Posts_VN or Posts_EN based on language.
 * Returns { ok, post_id, row, sheet_url }
 */
function _createPostRow(data) {
  if (!data || !data.app_id) return { ok: false, error: 'Missing app_id' };
  const lang = (data.language === 'en') ? 'EN' : 'VN';
  const sheetName = (lang === 'EN') ? SHEETS.EN : SHEETS.VN;
  const prefix = lang;
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { ok: false, error: `Sheet ${sheetName} not found. Run "Build sheet from scratch" first.` };

  // Find first empty row from row 3
  const lastRow = sh.getLastRow();
  let r = 3;
  for (let i = 3; i <= lastRow + 1; i++) {
    if (!sh.getRange(i, POST_COLS.POST_ID).getValue()) { r = i; break; }
  }

  const postId = nextId(sheetName, prefix, POST_COLS.POST_ID);
  const plannedDate = data.planned_date ? new Date(data.planned_date) : new Date();

  // Set values column by column
  sh.getRange(r, POST_COLS.POST_ID).setValue(postId);
  sh.getRange(r, POST_COLS.FANPAGE).setValue(data.fanpage || (lang === 'VN' ? 'Apolo VN' : 'Apolo EN'));
  sh.getRange(r, POST_COLS.PLANNED_DATE).setValue(plannedDate);
  sh.getRange(r, POST_COLS.CHANNEL).setValue(data.channel || 'Facebook');
  sh.getRange(r, POST_COLS.FORMAT).setValue(data.format || 'Feed Post (Square)');
  sh.getRange(r, POST_COLS.TOPIC).setValue(data.topic || '');
  sh.getRange(r, POST_COLS.CAPTION).setValue(data.caption || '');
  sh.getRange(r, POST_COLS.HASHTAGS).setValue(data.hashtags || '');
  // Image column: show inline preview via IMAGE() formula so client sees the
  // actual banner, not just a URL. Mode 4 (explicit sizing) keeps the row tidy.
  // Row height bumped to 160 so the image is visible.
  if (data.image_url) {
    sh.getRange(r, POST_COLS.IMAGE_URL).setValue(`=IMAGE("${data.image_url}";4;150;150)`);
    sh.setRowHeight(r, 160);
  } else {
    sh.getRange(r, POST_COLS.IMAGE_URL).setValue('');
  }
  sh.getRange(r, POST_COLS.ASSIGNEE).setValue(data.assignee || 'Như Ý');
  sh.getRange(r, POST_COLS.STATUS).setValue('Pending Hiển Approval');
  sh.getRange(r, POST_COLS.NEEDS_LEGAL).setValue(data.needs_legal || 'No');
  sh.getRange(r, POST_COLS.VERIFY_TEXT).setValue('Pending');
  sh.getRange(r, POST_COLS.VERIFY_IMAGE).setValue('Pending');
  sh.getRange(r, POST_COLS.WILL_RUN_ADS).setValue(data.will_run_ads || 'No');
  sh.getRange(r, POST_COLS.APP_ID).setValue(data.app_id);
  sh.getRange(r, POST_COLS.LAST_UPDATED).setValue(new Date());

  const sheetUrl = `${ss.getUrl()}#gid=${sh.getSheetId()}&range=A${r}`;

  // If this post has ads config, also create an Ads_Campaigns row linked by Post ID
  let ads_result = null;
  if (data.ads && data.ads.enabled) {
    sh.getRange(r, POST_COLS.WILL_RUN_ADS).setValue('Yes');
    ads_result = _createAdsRow({
      app_id: data.app_id,
      linked_post_id: postId,
      fanpage: data.fanpage,
      name: data.ads.name || `Ads - ${data.topic || postId}`,
      objective: data.ads.objective || 'Awareness',
      audience: data.ads.audience || '',
      audience_detail: data.ads.audience_detail || '',
      goal: data.ads.goal || '',
      placement: data.ads.placement || 'Feed',
      cta: data.ads.cta || 'Liên hệ',
      landing_url: data.ads.landing_url || '',
      budget_per_day: data.ads.budget_per_day || 0,
      start_date: data.ads.start_date || data.planned_date,
      duration_days: data.ads.duration_days || 7,
      assignee: data.assignee || 'Như Ý',
    });
    // Back-link the ads campaign ID into the post row
    if (ads_result && ads_result.campaign_id) {
      sh.getRange(r, POST_COLS.LINKED_CAMPAIGN).setValue(ads_result.campaign_id);
    }
  }

  return { ok: true, post_id: postId, row: r, sheet_url: sheetUrl, ads: ads_result };
}

/**
 * Insert a new row into Ads_Campaigns.
 * Returns { ok, campaign_id, row, sheet_url }
 */
function _createAdsRow(data) {
  if (!data) return { ok: false, error: 'Missing data' };
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.ADS);
  if (!sh) return { ok: false, error: 'Ads_Campaigns sheet not found. Run "Build sheet from scratch" first.' };

  const lastRow = sh.getLastRow();
  let r = 3;
  for (let i = 3; i <= lastRow + 1; i++) {
    if (!sh.getRange(i, 1).getValue()) { r = i; break; }
  }

  const campaignId = nextId(SHEETS.ADS, 'CMP', 1);
  const startDate = data.start_date ? new Date(data.start_date) : new Date();
  const budget = Number(data.budget_per_day) || 0;
  const duration = Number(data.duration_days) || 7;

  // Columns: A=Campaign ID, B=Fanpage, C=Linked Post ID, D=Name, E=Objective,
  // F=Audience, G=Audience Detail, H=Goal, I=Placement, J=CTA, K=Landing URL,
  // L=Budget/day, M=Start Date, N=Duration, O=Total Budget (auto), P=Ads Approval,
  // Q=Assignee, R=Status, S=Spend, T=Reach, U=Impressions, V=Clicks, W=Leads, X=CPL/CTR
  sh.getRange(r, 1).setValue(campaignId);
  sh.getRange(r, 2).setValue(data.fanpage || '');
  sh.getRange(r, 3).setValue(data.linked_post_id || '');
  sh.getRange(r, 4).setValue(data.name || '');
  sh.getRange(r, 5).setValue(data.objective || 'Awareness');
  sh.getRange(r, 6).setValue(data.audience || '');
  sh.getRange(r, 7).setValue(data.audience_detail || '');
  sh.getRange(r, 8).setValue(data.goal || '');
  sh.getRange(r, 9).setValue(data.placement || 'Feed');
  sh.getRange(r, 10).setValue(data.cta || 'Liên hệ');
  sh.getRange(r, 11).setValue(data.landing_url || '');
  sh.getRange(r, 12).setValue(budget);
  sh.getRange(r, 13).setValue(startDate);
  sh.getRange(r, 14).setValue(duration);
  sh.getRange(r, 15).setValue(budget * duration); // Total budget
  sh.getRange(r, 16).setValue('Pending'); // Ads approval
  sh.getRange(r, 17).setValue(data.assignee || 'Như Ý');
  sh.getRange(r, 18).setValue('Draft');

  const sheetUrl = `${ss.getUrl()}#gid=${sh.getSheetId()}&range=A${r}`;
  return { ok: true, campaign_id: campaignId, row: r, sheet_url: sheetUrl };
}

/**
 * Look up a post by app_id and return its approval state.
 */
function _getPostStatus(appId) {
  if (!appId) return { ok: false, error: 'Missing app_id' };
  const ss = SpreadsheetApp.getActive();
  for (const name of [SHEETS.VN, SHEETS.EN]) {
    const sh = ss.getSheetByName(name);
    if (!sh) continue;
    const data = sh.getRange(3, 1, 500, 21).getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row[POST_COLS.POST_ID - 1]) continue;
      if (String(row[POST_COLS.APP_ID - 1]) === String(appId)) {
        return {
          ok: true,
          found: true,
          post_id: row[POST_COLS.POST_ID - 1],
          status: row[POST_COLS.STATUS - 1] || '',
          verify_text: row[POST_COLS.VERIFY_TEXT - 1] || '',
          verify_image: row[POST_COLS.VERIFY_IMAGE - 1] || '',
          // Legacy aliases for backward compat with existing app code
          legal_approved: row[POST_COLS.VERIFY_TEXT - 1] || '',
          content_approved: row[POST_COLS.VERIFY_IMAGE - 1] || '',
          approval_notes: row[POST_COLS.APPROVAL_NOTES - 1] || '',
          sheet_name: name,
          row: 3 + i,
        };
      }
    }
  }
  return { ok: true, found: false };
}
