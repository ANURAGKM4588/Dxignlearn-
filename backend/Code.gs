/**
 * Dxign.learn Apps Script Webhook
 * Handles Razorpay registration updates and automatically syncs them
 * to the Firebase database to whitelist student login on the mobile app.
 */

// REPLACE with your Firebase Realtime Database or Firestore project URL and Web API key
var FIREBASE_PROJECT_ID = "dxign-website";
var FIREBASE_API_KEY = "AIzaSyDAhD8X6zf9ie7g4QLBLHRanyroHgFNO_8";
var FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/";

/**
 * Handle POST request from Razorpay webhook / Webpage payment callback
 */
function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
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
      
      // Decode base64 file data
      var fileBlob = Utilities.newBlob(Utilities.base64Decode(data.base64Data), data.mimeType, data.fileName);
      var file = folder.createFile(fileBlob);
      
      // Make the file public
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Get the download / direct view URL
      var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      
      return ContentService.createTextOutput(JSON.stringify({ 
        "status": "success", 
        "fileUrl": fileUrl 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. Log to the Google Sheet (Current existing behavior)
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
    
    // 2. If the payment was successful, whitelist the student in Firebase + send welcome notifications
    var statusNorm = (data.status || '').toLowerCase();
    if (statusNorm === 'success' || statusNorm.indexOf('success') === 0) {
      try {
        whitelistInFirebase(data.email.toLowerCase().trim(), data.phone.trim(), data.name, data.course);
      } catch (err) {
        Logger.log('Firebase whitelist failed: ' + err.toString());
      }
      
      // Send welcome email (free via Google Apps Script MailApp)
      try {
        sendWelcomeEmail(data.email, data.name, data.course);
      } catch (e) {
        Logger.log('Welcome email failed: ' + e.toString());
      }
      
      // Send WhatsApp notification if API is configured
      try {
        sendWhatsAppNotification(data.phone, data.name, data.course);
      } catch (e) {
        Logger.log('WhatsApp notification failed: ' + e.toString());
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET request for the Admin Portal & Mobile OTP Authentication
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var email = e.parameter.email;
    
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
      
      // Email OTP to student (completely free via Google Daily Limits)
      var subject = "Dxign.learn Mobile App - Verification Code";
      var body = "Hello " + studentName + ",\n\n" +
                 "Your verification code for logging into the Dxign.learn Mobile App is:\n\n" +
                 "Your code: " + otp + "\n\n" +
                 "This code is valid for 10 minutes. Please do not share this code with anyone.\n\n" +
                 "Best regards,\n" +
                 "Dxign.learn Support Team";
      
      MailApp.sendEmail(email, subject, body);
      
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
  return template
    .replace(/{name}/gi, name || "")
    .replace(/{course}/gi, course || "")
    .replace(/{email}/gi, email || "")
    .replace(/{phone}/gi, phone || "");
}

/**
 * Send a welcome email to the student when payment is completed.
 * Uses Google Apps Script's free MailApp service (100 recipients/day for free accounts).
 */
function sendWelcomeEmail(email, name, course) {
  if (!email) { Logger.log('Welcome email skipped: no email address'); return; }
  email = String(email);
  
  var subjectTemplate = getScriptProp('WELCOME_EMAIL_SUBJECT') || "Welcome to Dxign Learn - {course}";
  var bodyTemplate = getScriptProp('WELCOME_EMAIL_BODY');
  
  var subject = parseTemplate(subjectTemplate, name, course, email, "");
  
  if (bodyTemplate) {
    // If user saved a custom template in the admin dashboard
    var body = parseTemplate(bodyTemplate, name, course, email, "");
    
    // Check if it's already HTML (contains <html> or <p> tags)
    if (body.indexOf('<html') !== -1 || body.indexOf('<p>') !== -1 || body.indexOf('<br>') !== -1) {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: body
      });
    } else {
      // Wrap plain text in a nice brand-styled HTML layout
      var htmlFormattedBody = body.replace(/\n/g, '<br>');
      var fullHtml = getBeautifulHtmlWrapper(name, course, email, htmlFormattedBody);
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        htmlBody: fullHtml
      });
    }
  } else {
    // Send the default gorgeous premium HTML email template
    var defaultHtml = getBeautifulHtmlWrapper(name, course, email, null);
    var defaultText = "Hi " + name + ",\n\n" +
                      "Welcome to Dxign Learn! 🚀\n\n" +
                      "Thank you for completing your registration for the " + course + " program. We are thrilled to have you join our learning community!\n\n" +
                      "📱 How to Access Your Course Portal:\n" +
                      "1. Open the Dxign Learn Mobile App on your phone.\n" +
                      "2. Log in using the email address you registered with: " + email + "\n" +
                      "3. Enter the 6-digit secure verification OTP code sent to your inbox.\n" +
                      "4. Start streaming lectures, downloading resources, and chatting directly with mentors!\n\n" +
                      "If you have any questions or need assistance, feel free to reply directly to this email.\n\n" +
                      "Best regards,\n" +
                      "Dxign Learn Team";
    
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: defaultText,
      htmlBody: defaultHtml
    });
  }
}

/**
 * Generates a premium styled HTML wrapper matching the Dxign Learn brand.
 */
function getBeautifulHtmlWrapper(name, course, email, customContentHtml) {
  var contentArea = "";
  if (customContentHtml) {
    contentArea = customContentHtml;
  } else {
    contentArea = 
      "<div style='font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px;'>Hi " + name + ",</div>" +
      "<p style='margin: 0 0 16px 0; color: #4f5e71;'>Welcome to <strong>Dxign Learn</strong>! 🚀</p>" +
      "<p style='margin: 0 0 16px 0; color: #4f5e71;'>Thank you for enrolling in the <span style='color: #008fa0; font-weight: bold;'>" + course + "</span> program. We are thrilled to have you join our learning community!</p>" +
      
      "<div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 30px 0;'>" +
        "<div style='font-size: 13px; font-weight: bold; color: #6b21a8; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;'>📱 How to Access Your Course Portal</div>" +
        
        "<table border='0' cellpadding='0' cellspacing='0' width='100%'>" +
          "<tr>" +
            "<td style='vertical-align: top; width: 34px; padding-bottom: 14px;'>" +
              "<div style='background-color: #0f172a; color: #ffffff; font-weight: bold; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 11px;'>1</div>" +
            "</td>" +
            "<td style='color: #334155; font-size: 14px; padding-bottom: 14px; line-height: 1.5;'>" +
              "Open the <strong>Dxign Learn Mobile App</strong> on your phone." +
            "</td>" +
          "</tr>" +
          "<tr>" +
            "<td style='vertical-align: top; width: 34px; padding-bottom: 14px;'>" +
              "<div style='background-color: #0f172a; color: #ffffff; font-weight: bold; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 11px;'>2</div>" +
            "</td>" +
            "<td style='color: #334155; font-size: 14px; padding-bottom: 14px; line-height: 1.5;'>" +
              "Log in using the email address you registered with: <strong>" + email + "</strong>." +
            "</td>" +
          "</tr>" +
          "<tr>" +
            "<td style='vertical-align: top; width: 34px; padding-bottom: 14px;'>" +
              "<div style='background-color: #0f172a; color: #ffffff; font-weight: bold; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 11px;'>3</div>" +
            "</td>" +
            "<td style='color: #334155; font-size: 14px; padding-bottom: 14px; line-height: 1.5;'>" +
              "Enter the 6-digit secure verification OTP code sent to your inbox." +
            "</td>" +
          "</tr>" +
          "<tr>" +
            "<td style='vertical-align: top; width: 34px;'>" +
              "<div style='background-color: #0f172a; color: #ffffff; font-weight: bold; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 11px;'>4</div>" +
            "</td>" +
            "<td style='color: #334155; font-size: 14px; line-height: 1.5;'>" +
              "Start streaming lectures, downloading resources, and chatting directly with mentors!" +
            "</td>" +
          "</tr>" +
        "</table>" +
      "</div>" +
      
      "<p style='margin: 0 0 16px 0; color: #4f5e71;'>If you have any questions, difficulty logging in, or need immediate assistance, simply reply directly to this email.</p>" +
      "<p style='margin: 0; color: #4f5e71;'>Best regards,<br><strong>Dxign Learn Team</strong></p>";
  }

  return "<!DOCTYPE html>" +
    "<html>" +
    "<head>" +
      "<meta charset='utf-8'>" +
      "<title>Welcome to Dxign Learn</title>" +
    "</head>" +
    "<body style=\"font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f7; color: #333333; margin: 0; padding: 20px;\">" +
      "<div style='max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>" +
        "<div style='background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #f0f1f3;'>" +
          "<img src='https://www.dxignlearn.com/public/Images/logo/Dxign-logo.png' alt='Dxign Learn' style='height: 40px; max-width: 200px; display: inline-block; border: 0;' />" +
        "</div>" +
        "<div style='padding: 40px 35px; line-height: 1.6; font-size: 15px; color: #4f5e71;'>" +
          contentArea +
        "</div>" +
        "<div style='background-color: #f8fafc; padding: 25px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9;'>" +
          "&copy; 2026 Dxign Learn. All rights reserved.<br>" +
          "Need help? Contact us at <a href='mailto:dxignlearn@gmail.com' style='color: #008fa0; text-decoration: none; font-weight: 500;'>dxignlearn@gmail.com</a>" +
        "</div>" +
      "</div>" +
    "</body>" +
    "</html>";
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
  return JSON.stringify({
    "apiUrl": getScriptProp('WHATSAPP_API_URL') || '',
    "apiKey": getScriptProp('WHATSAPP_API_KEY') || '',
    "phoneId": getScriptProp('WHATSAPP_PHONE_ID') || '',
    "emailSubject": getScriptProp('WELCOME_EMAIL_SUBJECT') || '',
    "emailBody": getScriptProp('WELCOME_EMAIL_BODY') || '',
    "whatsappBody": getScriptProp('WELCOME_WHATSAPP_BODY') || '',
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
  var ss;
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_NEW_SPREADSHEET_ID_HERE" && SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (err) {
      throw new Error("Could not open spreadsheet by ID: " + SPREADSHEET_ID + ". Make sure the ID is correct and you have permission to access it.");
    }
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (ss) {
    return ss.getActiveSheet();
  }
  throw new Error("Could not find active spreadsheet. Open this script from your Google Sheet via Extensions -> Apps Script or configure SPREADSHEET_ID in Code.gs.");
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
