/**
 * FB Banner Generator v2 — Google Apps Script Backend
 *
 * STEP 1: Paste this code into script.google.com
 * STEP 2: Run setup() function (creates all 3 sheets + folder)
 * STEP 3: Deploy > New Deployment > Web App > Anyone > Deploy
 * STEP 4: Copy URL to .env.local GAS_WEB_APP_URL
 */

var CONFIG = { ROOT_FOLDER: "FB-Banners", SHEET_NAME: "FB-Banner-Tracker", TZ: "Asia/Saigon" };

// ==================== SETUP ====================

function setup() {
  var folder = getOrCreateRootFolder();
  var ss = getOrCreateSpreadsheet();

  // Ensure all 3 sheets exist
  ensureSheet(ss, "Banners", ["Date","Brand","Post ID","Title","Type","Size","File URL","View URL","Thumbnail","Status","Prompt"]);
  ensureSheet(ss, "Posts", ["PostID","Brand","Title","Type","Prompt","Headline","Subline","CTA","Model","Reference","Style","Status","PreviewURL","DriveURL"]);
  ensureSheet(ss, "Brands", ["BrandID","Name","Tagline","ColorPrimary","ColorSecondary","ColorAccent","FontStyle","Tone","Industry","Audience","LogoURL","ModelsJSON","RefsJSON"]);

  Logger.log("Setup complete!");
  Logger.log("Sheet: " + ss.getUrl());
  Logger.log("Folder: " + folder.getUrl());
}

function ensureSheet(ss, name, headers) {
  var sheet = null;
  try { sheet = ss.getSheetByName(name); } catch(e) {}
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    var h = sheet.getRange(1, 1, 1, headers.length);
    h.setFontWeight("bold"); h.setBackground("#1a1a2e"); h.setFontColor("#ffffff");
  }
  return sheet;
}

// ==================== ROUTER ====================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "upload_image";

    switch(action) {
      case "upload_image": return handleUploadImage(data);
      case "list_brands":  return handleListBrands();
      case "save_brand":   return handleSaveBrand(data);
      case "list_posts":   return handleListPosts(data);
      case "save_posts":   return handleSavePosts(data);
      case "update_post":  return handleUpdatePost(data);
      default: return json({ success: false, error: "Unknown action: " + action });
    }
  } catch(err) { return json({ success: false, error: err.toString() }); }
}

function doGet() {
  try {
    var ss = getOrCreateSpreadsheet();
    var folder = getOrCreateRootFolder();
    var banners = ss.getSheetByName("Banners");
    return json({
      status: "running", name: "FB Banner v2 API",
      sheet_url: ss.getUrl(), drive_folder_url: folder.getUrl(),
      total_banners: banners ? Math.max(0, banners.getLastRow() - 1) : 0
    });
  } catch(err) { return json({ status: "error", error: err.toString() }); }
}

// ==================== BRANDS ====================

function handleListBrands() {
  var sheet = getOrCreateSpreadsheet().getSheetByName("Brands");
  if (!sheet || sheet.getLastRow() < 2) return json({ brands: [] });

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  var brands = data.filter(function(r) { return r[0]; }).map(function(r) {
    return {
      brand_id: r[0], brand_name: r[1], tagline: r[2],
      color_primary: r[3], color_secondary: r[4], color_accent: r[5],
      font_style: r[6], tone: r[7], industry: r[8], target_audience: r[9],
      logo: r[10],
      models: safeParseJSON(r[11], []),
      references: safeParseJSON(r[12], [])
    };
  });
  return json({ brands: brands });
}

function handleSaveBrand(data) {
  var b = data.brand;
  var sheet = getOrCreateSpreadsheet().getSheetByName("Brands");
  var row = findRow(sheet, 1, b.brand_id);
  var values = [
    b.brand_id, b.brand_name, b.tagline,
    b.color_primary, b.color_secondary, b.color_accent,
    b.font_style, b.tone, b.industry, b.target_audience,
    b.logo,
    JSON.stringify(b.models || []),
    JSON.stringify(b.references || [])
  ];

  if (row > 0) {
    sheet.getRange(row, 1, 1, 13).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
  return json({ success: true, brand_id: b.brand_id });
}

// ==================== POSTS ====================

function handleListPosts(data) {
  var sheet = getOrCreateSpreadsheet().getSheetByName("Posts");
  if (!sheet || sheet.getLastRow() < 2) return json({ posts: [] });

  var all = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  var posts = all.filter(function(r) { return r[0] && (!data.brand || r[1] === data.brand); }).map(function(r) {
    return {
      id: r[0], brand_id: r[1], title: r[2], type: r[3],
      prompt: r[4],
      text_overlay: { headline: r[5], subline: r[6], cta: r[7] },
      use_model: r[8] || null, use_reference: r[9] || null,
      style: r[10], status: r[11] || "pending",
      preview_url: r[12], drive_url: r[13]
    };
  });
  return json({ posts: posts });
}

function handleSavePosts(data) {
  var sheet = getOrCreateSpreadsheet().getSheetByName("Posts");
  var posts = data.posts || [];

  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var row = findRow(sheet, 1, p.id);
    var values = [
      p.id, data.brand || p.brand_id || "", p.title, p.type,
      p.prompt,
      (p.text_overlay && p.text_overlay.headline) || "",
      (p.text_overlay && p.text_overlay.subline) || "",
      (p.text_overlay && p.text_overlay.cta) || "",
      p.use_model || "", p.use_reference || "",
      p.style, p.status || "pending",
      p.preview_url || "", p.drive_url || ""
    ];
    if (row > 0) { sheet.getRange(row, 1, 1, 14).setValues([values]); }
    else { sheet.appendRow(values); }
  }
  return json({ success: true, count: posts.length });
}

function handleUpdatePost(data) {
  var sheet = getOrCreateSpreadsheet().getSheetByName("Posts");
  var row = findRow(sheet, 1, data.post_id);
  if (row < 2) return json({ success: false, error: "Post not found: " + data.post_id });

  var updates = data.updates || {};
  var cols = { title: 3, type: 4, prompt: 5, headline: 6, subline: 7, cta: 8, use_model: 9, use_reference: 10, style: 11, status: 12, preview_url: 13, drive_url: 14 };

  for (var key in updates) {
    if (cols[key]) { sheet.getRange(row, cols[key]).setValue(updates[key]); }
  }
  return json({ success: true });
}

// ==================== UPLOAD IMAGE ====================

function handleUploadImage(data) {
  var folder = getOrCreateBrandFolder(data.brand);
  var decoded = Utilities.base64Decode(data.image_base64);
  var blob = Utilities.newBlob(decoded, data.mime_type || "image/png", data.filename);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}

  var fileUrl = file.getUrl();
  var viewUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
  var thumbUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w200";

  var sheet = getOrCreateSpreadsheet().getSheetByName("Banners");
  sheet.appendRow([
    Utilities.formatDate(new Date(), CONFIG.TZ, "yyyy-MM-dd HH:mm"),
    data.brand || "", data.post_id || "", data.title || data.filename,
    data.type || "", data.size || "", fileUrl, viewUrl,
    '=IMAGE("' + thumbUrl + '")', "Generated",
    data.prompt ? data.prompt.substring(0, 150) : ""
  ]);

  return json({ success: true, file_id: file.getId(), file_url: fileUrl, view_url: viewUrl, download_url: "https://drive.google.com/uc?export=download&id=" + file.getId(), sheet_url: getOrCreateSpreadsheet().getUrl() });
}

// ==================== HELPERS ====================

function getOrCreateRootFolder() {
  var it = DriveApp.getRootFolder().getFoldersByName(CONFIG.ROOT_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(CONFIG.ROOT_FOLDER);
}

function getOrCreateBrandFolder(brand) {
  var parent = getOrCreateRootFolder();
  var it = parent.getFoldersByName(brand);
  var bf = it.hasNext() ? it.next() : parent.createFolder(brand);
  var month = Utilities.formatDate(new Date(), CONFIG.TZ, "yyyy-MM");
  var mit = bf.getFoldersByName(month);
  return mit.hasNext() ? mit.next() : bf.createFolder(month);
}

function getOrCreateSpreadsheet() {
  var files = DriveApp.getFilesByName(CONFIG.SHEET_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  var ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  try {
    var folder = getOrCreateRootFolder();
    var f = DriveApp.getFileById(ss.getId());
    folder.addFile(f); DriveApp.getRootFolder().removeFile(f);
  } catch(e) {}
  return ss;
}

function findRow(sheet, col, value) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  var data = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === value) return i + 2;
  }
  return -1;
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch(e) { return fallback; }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
