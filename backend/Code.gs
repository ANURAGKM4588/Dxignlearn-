/**
 * Dxign.learn Apps Script Webhook
 * Handles Razorpay registration updates and automatically syncs them
 * to the Firebase database to whitelist student login on the mobile app.
 */

// REPLACE with your Firebase Realtime Database or Firestore project URL and Web API key
var FIREBASE_PROJECT_ID = "dxign-website";
var FIREBASE_API_KEY = getScriptProp('FIREBASE_API_KEY') || Utilities.newBlob(Utilities.base64Decode("QUl6YVN5REFoRDhYNnpmOWllN2c0UUxCTEhSYW55cm9IZkZOT184")).getDataAsString();
var FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/";

/**
 * Handle POST request from Razorpay webhook / Webpage payment callback
 */
function doPost(e) {
  var data = {};
  try {
    var jsonString = e.postData.contents;
    data = JSON.parse(jsonString);
    
    // A. Handle Google Drive File Upload for doubt attachments
    if (data.action === 'upload_file') {
      var folderName = "Dxignlearn Doubt Attachments";
      var folder;
      var folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
      
      var fileBlob = Utilities.newBlob(Utilities.base64Decode(data.base64Data), data.mimeType, data.fileName);
      var file = folder.createFile(fileBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      
      return ContentService.createTextOutput(JSON.stringify({ 
        "status": "success", 
        "fileUrl": fileUrl 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. Log to the Google Sheet
    var sheet = getSheet();
    sheet.appendRow([
      data.date,
      data.name,
      data.email,
      data.phone,
      data.course,
      data.price,
      data.status,
      data.paymentId
    ]);
    
    // 2. Sync & Send Welcome Notifications
    var statusNorm = (data.status || '').toLowerCase();
    if (statusNorm === 'success' || statusNorm.indexOf('success') === 0) {
      try {
        whitelistInFirebase(data.email.toLowerCase().trim(), data.phone.trim(), data.name, data.course);
      } catch (err) {
        logErrorToSheet('Firebase Whitelist Failure', err.toString(), data.email);
      }
      
      try {
        sendWelcomeEmail(data.email, data.name, data.course);
      } catch (err) {
        logErrorToSheet('Welcome Email Failure', err.toString(), data.email);
      }
      
      try {
        sendWhatsAppNotification(data.phone, data.name, data.course);
      } catch (err) {
        logErrorToSheet('WhatsApp Failure', err.toString(), data.email);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logErrorToSheet('General Webhook Failure', error.toString(), data ? data.email : 'Unknown');
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Logs script errors to a tab named "Error Logs" in the active Google Sheet.
 */
function logErrorToSheet(type, message, email) {
  try {
    var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID.trim()) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    
    var errorSheet = ss.getSheetByName("Error Logs");
    if (!errorSheet) {
      errorSheet = ss.insertSheet("Error Logs");
      errorSheet.appendRow(["Timestamp", "Error Type", "Details / Error Message", "Target Email"]);
      errorSheet.setFrozenRows(1);
    }
    
    errorSheet.appendRow([
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      type,
      message,
      email || 'N/A'
    ]);
  } catch (e) {
    Logger.log("Failed logging to error sheet: " + e.toString());
  }
}

/**
 * Handle GET request for the Admin Portal & Mobile OTP Authentication
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var email = e.parameter.email;
    
    // B. Verify Admin Passkey
    if (action === 'verify_admin_passkey') {
      var inputPasskey = e.parameter.passkey;
      var correctPasskey = "123456";
      if (inputPasskey === correctPasskey) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Incorrect Admin Passkey." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // A. Handle Google Drive File Retrieval (Base64 conversion) for inline playback without CORS/Download block
    if (action === 'get_file_base64' && e.parameter.id) {
      try {
        var file = DriveApp.getFileById(e.parameter.id);
        var base64Data = Utilities.base64Encode(file.getBlob().getBytes());
        var mimeType = file.getMimeType();
        var result = {
          "status": "success",
          "mimeType": mimeType,
          "base64": base64Data
        };
        return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 1. Request OTP Flow
    if (action === 'send_otp' && email) {
      email = email.toLowerCase().trim();
      var sheet = getSheet();
      var rows = sheet.getDataRange().getValues();
      var isRegistered = false;
      var studentName = "";
      var courses = [];
      
      // Scan Google Sheets for a successful purchase
      for (var i = 1; i < rows.length; i++) {
        var sheetEmail = String(rows[i][2]).toLowerCase().trim();
        var sheetStatus = String(rows[i][6]).toLowerCase().trim();
        if (sheetEmail === email && sheetStatus === 'success') {
          isRegistered = true;
          studentName = rows[i][1];
          courses.push(rows[i][4]);
        }
      }
      
      if (!isRegistered) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "This email is not registered or payment was not successful." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // Generate 6-digit verification code
      var otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Cache OTP in script memory for 10 minutes
      var cache = CacheService.getScriptCache();
      cache.put("otp_" + email, otp, 600);
      cache.put("meta_" + email, JSON.stringify({ name: studentName, courses: courses }), 600);
      
      // Email OTP to student
      var subject = "Your Dxign Learn sign-in code";
      var body = "Hello " + studentName + ",\n\n" +
                 "Your sign-in code for the Dxign Learn student portal is:\n\n" +
                 "Code: " + otp + "\n\n" +
                 "This code expires in 10 minutes. Do not share it with anyone.\n\n" +
                 "Best regards,\n" +
                 "Dxign Learn Team";
      
      GmailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        from: "support@dxignlearn.com",
        name: "Dxign Learn",
        replyTo: "support@dxignlearn.com"
      });
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Verify OTP Flow
    if (action === 'verify_otp' && email) {
      email = email.toLowerCase().trim();
      var otpInput = e.parameter.otp;
      
      var cache = CacheService.getScriptCache();
      var cachedOtp = cache.get("otp_" + email);
      
      if (cachedOtp && cachedOtp === otpInput) {
        var metaStr = cache.get("meta_" + email);
        var meta = metaStr ? JSON.parse(metaStr) : { name: "Student", courses: [] };
        
        // Remove code from cache to prevent reuse
        cache.remove("otp_" + email);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          "status": "success", 
          "name": meta.name,
          "courses": meta.courses,
          "firebaseCustomToken": null // Fallback to secure local session
        }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Incorrect or expired verification code." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Admin Passkey Gatekeeper for all subsequent actions
    var inputPasskey = e.parameter.passkey;
    var correctPasskey = "123456";
    if (inputPasskey !== correctPasskey) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Unauthorized access. Invalid passkey." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 4. WhatsApp Config Management
    if (action === 'saveWhatsAppConfig') {
      return ContentService.createTextOutput(saveWhatsAppConfig(e.parameter))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getWhatsAppConfig') {
      return ContentService.createTextOutput(getWhatsAppConfig())
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'testWhatsApp' && e.parameter.phone) {
      return ContentService.createTextOutput(testWhatsApp(e.parameter.phone))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. Fallback: Default Admin Dashboard List
    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    var data = [];
    
    for (var i = 1; i < rows.length; i++) {
      data.push({
        date: rows[i][0],
        name: rows[i][1],
        email: rows[i][2],
        phone: rows[i][3],
        course: rows[i][4],
        price: rows[i][5],
        status: rows[i][6],
        paymentId: rows[i][7]
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sync whitelist details to Firestore
 */
function whitelistInFirebase(email, phone, name, course) {
  var url = FIRESTORE_URL + "whitelisted_students/" + encodeURIComponent(email);
  
  var payload = {
    "fields": {
      "email": { "stringValue": email },
      "phone": { "stringValue": phone },
      "name": { "stringValue": name },
      "course": { "stringValue": course },
      "whitelistedAt": { "timestampValue": new Date().toISOString() }
    }
  };
  
  var options = {
    "method": "patch", // Patch will create or overwrite the document
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    Logger.log("Failed to sync to Firebase: " + response.getContentText());
    throw new Error("Firebase sync failed: " + response.getContentText());
  } else {
    Logger.log("Successfully whitelisted student in Firebase: " + email);
  }
}

/**
 * Automatically cleans up chat messages older than 24 hours to save Firestore/Cloud storage space.
 * Set up a daily/hourly time-driven trigger in Google Apps Script console to run this function.
 */
function cleanupOldMessages() {
  try {
    // We scan chats path in Firestore to clean up old subcollection messages
    // To list subcollections or collections, we can query documents in 'chats' collection
    var chatsUrl = FIRESTORE_URL + "chats";
    var options = {
      "method": "get",
      "muteHttpExceptions": true
    };
    
    var response = UrlFetchApp.fetch(chatsUrl, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Failed to fetch active chat rooms: " + response.getContentText());
      return;
    }
    
    var chatsData = JSON.parse(response.getContentText());
    if (!chatsData.documents || chatsData.documents.length === 0) {
      Logger.log("No chat rooms found.");
      return;
    }
    
    var now = new Date();
    var cutOffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    var deletedCount = 0;
    
    // Iterate through all student chat rooms
    for (var i = 0; i < chatsData.documents.length; i++) {
      var chatRoom = chatsData.documents[i];
      var roomPath = chatRoom.name; // projects/{id}/databases/(default)/documents/chats/{room_id}
      var messagesUrl = "https://firestore.googleapis.com/v1/" + roomPath + "/messages";
      
      var msgRes = UrlFetchApp.fetch(messagesUrl, options);
      if (msgRes.getResponseCode() !== 200) continue;
      
      var msgData = JSON.parse(msgRes.getContentText());
      if (!msgData.documents || msgData.documents.length === 0) continue;
      
      // Delete old message documents in this chat room
      for (var j = 0; j < msgData.documents.length; j++) {
        var doc = msgData.documents[j];
        var docName = doc.name; // projects/{id}/databases/(default)/documents/chats/{room_id}/messages/{msg_id}
        
        var timestampStr = null;
        if (doc.fields && doc.fields.timestamp && doc.fields.timestamp.timestampValue) {
          timestampStr = doc.fields.timestamp.timestampValue;
        }
        
        if (timestampStr) {
          var msgTime = new Date(timestampStr);
          if (msgTime < cutOffTime) {
            var deleteUrl = "https://firestore.googleapis.com/v1/" + docName;
            var deleteOptions = {
              "method": "delete",
              "muteHttpExceptions": true
            };
            var delResponse = UrlFetchApp.fetch(deleteUrl, deleteOptions);
            if (delResponse.getResponseCode() === 200) {
              deletedCount++;
            }
          }
        }
      }
    }
    
    Logger.log("Cleanup complete. Successfully deleted " + deletedCount + " messages older than 24 hours.");
    
  } catch (error) {
    Logger.log("Error during Firestore cleanup: " + error.toString());
  }
}

/**
 * Helper to get property from PropertiesService or legacy ScriptProperties.
 */
function getScriptProp(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (err) {
    return ScriptProperties.getProperty(key);
  }
}

/**
 * Helper to set property in PropertiesService or legacy ScriptProperties.
 */
function setScriptProp(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
  } catch (err) {
    ScriptProperties.setProperty(key, value);
  }
}

/**
 * Replace placeholders like {name} and {course} in templates.
 */
function parseTemplate(template, name, course, email, phone) {
  if (!template) return "";
  
  // Replace the standard placeholders
  var parsed = template
    .replace(/{name}/gi, name || "")
    .replace(/{course}/gi, course || "")
    .replace(/{email}/gi, email || "")
    .replace(/{phone}/gi, phone || "");
    
  // Dynamic Safeguard: If the template has the hardcoded test email, swap it with the actual student's email
  if (email) {
    parsed = parsed.replace(/anuragkm1999@gmail\.com/gi, email);
  }
  
  return parsed;
}

/**
 * Send a welcome email to the student when payment is completed.
 * Uses GmailApp with a verified domain alias to avoid spam classification.
 * IMPORTANT: Set up "support@dxignlearn.com" as a "Send mail as" alias in
 * your Gmail settings (Settings > Accounts > Send mail as) so the `from`
 * parameter works. Without this, Gmail will still show the sender's raw
 * Gmail address and emails may land in spam.
 */
function sendWelcomeEmail(email, name, course) {
  if (!email) { Logger.log('Welcome email skipped: no email address'); return; }
  email  = String(email).trim().toLowerCase();
  name   = name   ? String(name).trim()   : 'Student';
  course = course ? String(course).trim() : 'your course';

  var subjectTemplate = getScriptProp('WELCOME_EMAIL_SUBJECT') ||
    '{course} - Enrollment Confirmed';
  var subject = parseTemplate(subjectTemplate, name, course, email, '');

  var bodyTemplate = getScriptProp('WELCOME_EMAIL_BODY');
  var plainText, htmlBody;

  if (bodyTemplate) {
    plainText = parseTemplate(bodyTemplate, name, course, email, '');
    if (plainText.indexOf('<html') !== -1 || plainText.indexOf('<p>') !== -1 || plainText.indexOf('<br') !== -1) {
      htmlBody  = plainText;
      plainText = plainText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    } else {
      htmlBody = getBeautifulHtmlWrapper(name, course, email, plainText.replace(/\n/g, '<br>'));
    }
  } else {
    plainText =
      'Hi ' + name + ',\n\n' +
      'Thank you for enrolling in ' + course + '.\n\n' +
      'Your course portal is ready:\n\n' +
      '1. Visit: https://www.dxignlearn.com/studentportal/\n' +
      '2. Log in with: ' + email + '\n' +
      '3. Enter the OTP sent to your inbox\n' +
      '4. Start learning!\n\n' +
      'Questions? Reply to this email.\n\n' +
      'Best,\nDxign Learn Team';
    htmlBody = getBeautifulHtmlWrapper(name, course, email, null);
  }

  // GmailApp with NO replyTo (domain mismatch was causing spam).
  // All other anti-spam fixes remain: simple HTML, no external images, plain text included.
  GmailApp.sendEmail(email, subject, plainText, {
    htmlBody: htmlBody,
    name:     'Dxign Learn'
  });
}

/**
 * Generates a clean, lightweight HTML email.
 * Minimal styling = high text-to-HTML ratio = better inbox placement.
 * No external images (logo loaded from external URL = spam trigger).
 */
function getBeautifulHtmlWrapper(name, course, email, customContentHtml) {
  var contentArea = '';
  if (customContentHtml) {
    contentArea = customContentHtml;
  } else {
    contentArea =
      '<p style="margin:0 0 16px 0;">Hi ' + name + ',</p>' +
      '<p style="margin:0 0 16px 0;">Thank you for enrolling in <strong>' + course + '</strong> at Dxign Learn.</p>' +
      '<p style="margin:0 0 8px 0;"><strong>How to access your course:</strong></p>' +
      '<p style="margin:0 0 4px 0;">1. Go to <a href="https://www.dxignlearn.com/studentportal/" style="color:#0066cc;">www.dxignlearn.com/studentportal</a></p>' +
      '<p style="margin:0 0 4px 0;">2. Log in with: <strong>' + email + '</strong></p>' +
      '<p style="margin:0 0 4px 0;">3. Enter the OTP sent to your inbox</p>' +
      '<p style="margin:0 0 16px 0;">4. Start learning!</p>' +
      '<p style="margin:0 0 16px 0;">If you need help, just reply to this email.</p>' +
      '<p style="margin:0;">Best regards,<br><strong>Dxign Learn Team</strong></p>';
  }

  return '<html><head><meta charset="utf-8"></head>' +
    '<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;margin:0;padding:0;">' +
      '<div style="max-width:560px;margin:0 auto;padding:24px;">' +
        '<div style="text-align:center;padding:16px 0 24px 0;border-bottom:1px solid #eee;margin-bottom:24px;">' +
          '<strong style="font-size:18px;color:#0f172a;">DXIGN LEARN</strong>' +
        '</div>' +
        contentArea +
        '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center;">' +
          '<p style="margin:0 0 4px 0;">You received this because you enrolled in a course at Dxign Learn.</p>' +
          '<p style="margin:0;">Dxign Learn | www.dxignlearn.com</p>' +
        '</div>' +
      '</div>' +
    '</body></html>';
}

/**
 * Send a WhatsApp notification when payment is completed.
 * Uses a configurable API endpoint (saved via ScriptProperties).
 */
function sendWhatsAppNotification(phone, name, course) {
  if (!phone) { Logger.log('WhatsApp notification skipped: no phone number'); return; }
  phone = String(phone);
  var apiUrl = getScriptProp('WHATSAPP_API_URL');
  var apiKey = getScriptProp('WHATSAPP_API_KEY');
  var phoneNumberId = getScriptProp('WHATSAPP_PHONE_ID');
  
  if (!apiUrl || !apiUrl.trim()) {
    Logger.log('WhatsApp notification skipped: no API URL configured');
    return;
  }
  
  var bodyTemplate = getScriptProp('WELCOME_WHATSAPP_BODY') || 
    "Hi {name}! Welcome to Dxign Learn! Thank you for completing your registration for the {course} program. Your learning journey begins now. Our team will reach out shortly with course access details. - Dxign Learn Team";
    
  var msg = parseTemplate(bodyTemplate, name, course, "", phone);
  
  if (apiUrl.indexOf('graph.facebook.com') !== -1) {
    // WhatsApp Cloud API format
    var payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: msg }
    };
    var headers = {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    var url = apiUrl.replace('{phone-number-id}', phoneNumberId || '') + '/messages';
    UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } else {
    // Generic webhook format (supports UltraMsg, Twilio, etc.)
    var payload = {
      phone: phone,
      message: msg,
      name: name,
      course: course,
      apiKey: apiKey
    };
    UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
      muteHttpExceptions: true
    });
  }
}

/**
 * Save WhatsApp automation configuration to ScriptProperties.
 * Called via GET with ?action=saveWhatsAppConfig&apiUrl=...&apiKey=...&phoneId=...
 */
function saveWhatsAppConfig(params) {
  if (params.apiUrl !== undefined) setScriptProp('WHATSAPP_API_URL', params.apiUrl.trim());
  if (params.apiKey !== undefined) setScriptProp('WHATSAPP_API_KEY', params.apiKey.trim());
  if (params.phoneId !== undefined) setScriptProp('WHATSAPP_PHONE_ID', params.phoneId.trim());
  
  if (params.emailSubject !== undefined) setScriptProp('WELCOME_EMAIL_SUBJECT', params.emailSubject.trim());
  if (params.emailBody !== undefined) setScriptProp('WELCOME_EMAIL_BODY', params.emailBody.trim());
  if (params.whatsappBody !== undefined) setScriptProp('WELCOME_WHATSAPP_BODY', params.whatsappBody.trim());
  
  return JSON.stringify({ "status": "success" });
}

/**
 * Get WhatsApp automation configuration from ScriptProperties.
 * Called via GET with ?action=getWhatsAppConfig
 */
function getWhatsAppConfig() {
  var emailBody = getScriptProp('WELCOME_EMAIL_BODY') || '';
  if (!emailBody || emailBody.indexOf('Mobile App') !== -1 || emailBody.indexOf('expect:') !== -1) {
    emailBody = "Hi {name},\n\nWelcome to Dxign Learn! 🚀\n\nThank you for completing your registration for the {course} program. We are thrilled to have you join our learning community!\n\n💻 How to Access Your Course Portal:\n1. Go to the Student Course Portal at: https://www.dxignlearn.com/studentportal/\n2. Log in using the email address you registered with: {email}\n3. Enter the 6-digit secure verification OTP code sent to your inbox.\n4. Start streaming lectures, downloading resources, and chatting directly with mentors!\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nDxign Learn Team";
    setScriptProp('WELCOME_EMAIL_BODY', emailBody);
  } else if (emailBody.indexOf('anuragkm1999@gmail.com') !== -1) {
    // Automatically fix database if the hardcoded test email got saved previously
    emailBody = emailBody.replace(/anuragkm1999@gmail\.com/gi, "{email}");
    setScriptProp('WELCOME_EMAIL_BODY', emailBody);
  }
  
  var whatsappBody = getScriptProp('WELCOME_WHATSAPP_BODY') || '';
  if (!whatsappBody || whatsappBody.indexOf('Mobile App') !== -1) {
    whatsappBody = "Hi {name}! 🎉 Welcome to Dxign Learn! Thank you for completing your registration for the *{course}* program. Your learning journey begins now. To start, go to the Student Course Portal at https://www.dxignlearn.com/studentportal/ and log in with your email to receive your OTP. - Dxign Learn Team";
    setScriptProp('WELCOME_WHATSAPP_BODY', whatsappBody);
  } else if (whatsappBody.indexOf('anuragkm1999@gmail.com') !== -1) {
    whatsappBody = whatsappBody.replace(/anuragkm1999@gmail\.com/gi, "{email}");
    setScriptProp('WELCOME_WHATSAPP_BODY', whatsappBody);
  }
  
  var emailSubject = getScriptProp('WELCOME_EMAIL_SUBJECT');
  if (!emailSubject) {
    emailSubject = "🎉 Welcome to Dxign Learn! - {course}";
    setScriptProp('WELCOME_EMAIL_SUBJECT', emailSubject);
  } else if (emailSubject.indexOf('anuragkm1999@gmail.com') !== -1) {
    emailSubject = emailSubject.replace(/anuragkm1999@gmail\.com/gi, "{email}");
    setScriptProp('WELCOME_EMAIL_SUBJECT', emailSubject);
  }

  return JSON.stringify({
    "apiUrl": getScriptProp('WHATSAPP_API_URL') || '',
    "apiKey": getScriptProp('WHATSAPP_API_KEY') || '',
    "phoneId": getScriptProp('WHATSAPP_PHONE_ID') || '',
    "emailSubject": emailSubject,
    "emailBody": emailBody,
    "whatsappBody": whatsappBody,
    "isConfigured": !!getScriptProp('WHATSAPP_API_URL')
  });
}

/**
 * Test WhatsApp configuration by sending a test message.
 * Called via GET with ?action=testWhatsApp&phone=...
 */
function testWhatsApp(phone) {
  if (!phone) return JSON.stringify({ "status": "error", "message": "Phone number required" });
  sendWhatsAppNotification(phone, "Test User", "Test Course");
  return JSON.stringify({ "status": "success", "message": "Test message sent to " + phone });
}

/**
 * Helper function to explicitly trigger Google Drive permissions.
 * Run this function once in the Apps Script editor to authorize Google Drive access.
 */
function authorizeDrive() {
  Logger.log("Triggering Google Drive access authorization...");
  var folders = DriveApp.getFoldersByName("Dxignlearn Doubt Attachments");
  Logger.log("Access status: authorized. Found folders count: " + (folders.hasNext() ? "yes" : "no"));
}

// Add your Spreadsheet ID here if running as a standalone script (or leave empty if container-bound)
var SPREADSHEET_ID = "1Ntbo756KnbZw_SJS5P367Abf2BD7l9jxiKh2LO_8VMc";

/**
 * Helper to retrieve the target Google Sheet.
 */
function getSheet() {
  var ss = null;
  
  // Try active spreadsheet first (best for container-bound scripts)
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    Logger.log("Active spreadsheet lookup failed, trying by ID...");
  }
  
  // Fall back to opening by ID
  if (!ss && SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_NEW_SPREADSHEET_ID_HERE" && SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (err) {
      throw new Error("Could not open spreadsheet by ID: " + SPREADSHEET_ID + ". Make sure the ID is correct and your script account has access to it.");
    }
  }
  
  if (ss) {
    return ss.getActiveSheet();
  }
  throw new Error("Could not access your Google Sheet. Verify SPREADSHEET_ID and Web App permissions.");
}

/**
 * Diagnostic test function you can run directly from the editor.
 */
function runDiagnosticTest() {
  var testEmail = "anuragkm1999@gmail.com"; // Test recipient email
  Logger.log("=== START DIAGNOSTIC TEST ===");
  Logger.log("Spreadsheet ID: " + SPREADSHEET_ID);
  
  // 1. Test Sheet Connection
  try {
    var sheet = getSheet();
    Logger.log("SUCCESS: Connected to Sheet. Active sheet name: " + sheet.getName());
  } catch (err) {
    Logger.log("FAILED: Sheet connection error: " + err.toString());
  }
  
  // 2. Test Email Delivery
  try {
    Logger.log("Sending welcome email to: " + testEmail);
    sendWelcomeEmail(testEmail, "Test Anurag", "AI-Powered UI/UX Design");
    Logger.log("SUCCESS: Welcome email function executed without errors. Check your inbox and Spam folder!");
  } catch (err) {
    Logger.log("FAILED: Email delivery error: " + err.toString());
  }
  
  Logger.log("=== END DIAGNOSTIC TEST ===");
}
