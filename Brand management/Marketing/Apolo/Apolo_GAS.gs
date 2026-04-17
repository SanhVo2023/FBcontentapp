/*****************************************************************
 * APOLO MARKETING MANAGEMENT — Google Apps Script
 * Paste this into:  Extensions ▸ Apps Script ▸ (replace Code.gs) ▸ Save
 * Then reload the sheet. An "Apolo" menu will appear.
 *
 * Setup (once):
 *   1. Set HIEN_EMAIL below to Mr Hiển's email.
 *   2. Set PM_EMAIL and NHUY_EMAIL.
 *   3. Menu ▸ Apolo ▸ Install weekly digest trigger  (optional)
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
  VID:   'Videos'
};

// =============================================================
// MENU
// =============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🟦 Apolo')
    .addItem('🔄 Refresh Dashboard',       'refreshDashboard')
    .addSeparator()
    .addItem('➕ New Post (VN)',            'newPostVN')
    .addItem('➕ New Post (EN)',            'newPostEN')
    .addItem('➕ New Ads Campaign',         'newAdsCampaign')
    .addItem('➕ New Video',                'newVideo')
    .addSeparator()
    .addItem('📧 Email pending approvals → Hiển', 'emailPendingToHien')
    .addItem('📧 Weekly digest → Team',     'emailWeeklyDigest')
    .addSeparator()
    .addItem('🔒 Lock approved rows',       'lockApprovedRows')
    .addItem('⏱ Install weekly digest trigger (Mon 8AM)', 'installWeeklyTrigger')
    .addItem('🗑 Remove all triggers',       'removeAllTriggers')
    .addToUi();
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

  // Auto-stamp Last Updated on Posts_VN/EN (col 21 = U) and Videos (col 21)
  if (name === SHEETS.VN || name === SHEETS.EN) {
    sh.getRange(row, 21).setValue(new Date());
    // Auto-update Status when both approvals = Approved
    const legal = sh.getRange(row, 14).getValue();   // N
    const cont  = sh.getRange(row, 15).getValue();   // O
    const needsLegal = sh.getRange(row, 12).getValue(); // L
    const status = sh.getRange(row, 11).getValue();  // K
    const legalOK = (needsLegal !== 'Yes') || legal === 'Approved';
    if (legalOK && cont === 'Approved' && status !== 'Published' && status !== 'Scheduled') {
      sh.getRange(row, 11).setValue('Approved');
    }
    if (legal === 'Rejected' || cont === 'Rejected') {
      sh.getRange(row, 11).setValue('Rejected');
    }
    if (legal === 'Revise' || cont === 'Revise') {
      sh.getRange(row, 11).setValue('Revise');
    }
  }
  if (name === SHEETS.VID) {
    sh.getRange(row, 21).setValue(new Date());
    // Auto-advance Current Stage (col 16=P) based on which approvals are green
    autoAdvanceVideoStage(sh, row);
  }
  if (name === SHEETS.ADS) {
    // status auto-sync on approval
    if (col === 16) { // Ads Approval (P)
      const v = e.range.getValue();
      if (v === 'Approved')  sh.getRange(row, 18).setValue('Approved');
      if (v === 'Rejected')  sh.getRange(row, 18).setValue('Rejected');
      if (v === 'Revise')    sh.getRange(row, 18).setValue('Draft');
    }
  }
}

function autoAdvanceVideoStage(sh, row) {
  const vals = sh.getRange(row, 1, 1, 21).getValues()[0];
  // indices: 4=subject(D), E=subjectApprove(4), F=legalInfo(5), G=legalApprove(6),
  // H=script(7), I=audio(8), J=audioApprove(9), K=image(10), L=footage(11),
  // M=footageApprove(12), N=final(13), O=finalApprove(14), P=stage(15)
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
  const ids = sh.getRange(3, idCol, 300, 1).getValues().flat().filter(String);
  let max = 0;
  ids.forEach(v => {
    const m = String(v).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

function newPostVN() { _newRow(SHEETS.VN, 'VN', 1, {2: 'Apolo VN', 3: new Date(), 10: 'Như Ý', 11: 'Idea', 14: 'Pending', 15: 'Pending'}); }
function newPostEN() { _newRow(SHEETS.EN, 'EN', 1, {2: 'Apolo EN', 3: new Date(), 10: 'Như Ý', 11: 'Idea', 14: 'Pending', 15: 'Pending'}); }
function newAdsCampaign() { _newRow(SHEETS.ADS, 'CMP', 1, {15: 'Như Ý', 16: 'Pending', 18: 'Draft'}); }
function newVideo() { _newRow(SHEETS.VID, 'VID', 1, {2: 'Apolo VN', 5: 'Pending', 7: 'Pending', 10: 'Pending', 13: 'Pending', 15: 'Pending', 16: '1. Subject', 17: 'Như Ý'}); }

function _newRow(sheetName, prefix, idCol, defaults) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const lastRow = sh.getLastRow();
  let r = 3;
  // find first truly empty row from row 3
  for (let i = 3; i <= lastRow + 1; i++) {
    if (!sh.getRange(i, idCol).getValue()) { r = i; break; }
  }
  sh.getRange(r, idCol).setValue(nextId(sheetName, prefix, idCol));
  Object.keys(defaults).forEach(k => sh.getRange(r, Number(k)).setValue(defaults[k]));
  sh.setActiveRange(sh.getRange(r, idCol));
  SpreadsheetApp.getUi().alert(`New row created: ${sheetName} row ${r}`);
}

// =============================================================
// REFRESH DASHBOARD — populates pending approvals + weekly schedule
// =============================================================
function refreshDashboard() {
  const ss = SpreadsheetApp.getActive();
  const dash = ss.getSheetByName(SHEETS.DASH);

  // --- Pending approvals block (starts row 9) ---
  const pending = collectPendingApprovals();
  const pendStartRow = 9;
  // clear previous (up to row 28)
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

  // --- Weekly schedule block (starts row 32) ---
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

  // refresh timestamp
  dash.getRange('B2').setValue(new Date());
  SpreadsheetApp.getActive().toast('Dashboard refreshed', 'Apolo', 3);
}

function collectPendingApprovals() {
  const ss = SpreadsheetApp.getActive();
  const rows = [];

  // Posts VN + EN  (cols: A=id, B=fp, C=date, F=topic, J=assign, N=legalAppr, O=contentAppr, L=needsLegal)
  [SHEETS.VN, SHEETS.EN].forEach(name => {
    const sh = ss.getSheetByName(name);
    const data = sh.getRange(3, 1, 300, 21).getValues();
    data.forEach(r => {
      if (!r[0]) return;
      const legalPend   = r[11] === 'Yes' && r[13] === 'Pending';
      const contentPend = r[14] === 'Pending';
      if (legalPend)   rows.push([`Post ${name.slice(-2)}`, r[0], r[1], r[5], 'Legal Approval',   r[9], r[2]]);
      if (contentPend) rows.push([`Post ${name.slice(-2)}`, r[0], r[1], r[5], 'Content Approval', r[9], r[2]]);
    });
  });

  // Ads (col A=id, C=fp, D=name, M=start, O=assignee, P=approval)
  const ads = ss.getSheetByName(SHEETS.ADS);
  ads.getRange(3, 1, 200, 20).getValues().forEach(r => {
    if (!r[0]) return;
    if (r[15] === 'Pending') rows.push(['Ads', r[0], r[2], r[3], 'Ads Approval', r[14], r[12]]);
  });

  // Videos (A=id, B=fp, C=date, D=subject, Q=assignee(17), P=stage(16))
  //   approvals at E=4, G=6, J=9, M=12, O=14
  const vid = ss.getSheetByName(SHEETS.VID);
  vid.getRange(3, 1, 150, 21).getValues().forEach(r => {
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
    sh.getRange(3, 1, 300, 21).getValues().forEach(r => {
      if (!r[0]) return;
      const d = r[2];
      if (!(d instanceof Date)) return;
      if (d >= today && d <= plus7) {
        // Fanpage, Post ID, Date, Channel, Format, Topic, Assignee, Status, Will Run Ads
        rows.push([r[1], r[0], r[2], r[3], r[4], r[5], r[9], r[10], r[16]]);
      }
    });
  });
  rows.sort((a,b) => a[2] - b[2]);
  return rows;
}

// =============================================================
// EMAIL — pending approvals to Mr Hiển
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

// =============================================================
// WEEKLY DIGEST — team overview
// =============================================================
function emailWeeklyDigest() {
  const pending = collectPendingApprovals();
  const week = collectWeekSchedule();
  const ss = SpreadsheetApp.getActive();

  // Running ads summary
  const ads = ss.getSheetByName(SHEETS.ADS).getRange(3, 1, 200, 24).getValues();
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
// LOCK approved rows — prevent accidental edits after Hiển signs off
// =============================================================
function lockApprovedRows() {
  const ss = SpreadsheetApp.getActive();
  let locked = 0;
  [SHEETS.VN, SHEETS.EN].forEach(name => {
    const sh = ss.getSheetByName(name);
    const data = sh.getRange(3, 1, 300, 21).getValues();
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
