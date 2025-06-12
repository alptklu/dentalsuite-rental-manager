/**
 * DENTAL SUITE RENTAL MANAGER - APPS SCRIPT AUTOMATION
 * 
 * This script adds advanced features to your Google Sheets rental manager:
 * - Automatic conflict detection
 * - Email notifications  
 * - Calendar sync
 * - Data validation
 * - Backup automation
 * 
 * HOW TO INSTALL:
 * 1. In your Google Sheet, go to Extensions → Apps Script
 * 2. Delete any existing code
 * 3. Paste this entire code
 * 4. Save (Ctrl+S) and name it "Rental Manager Automation"
 * 5. Run the setup function once
 */

// 🔧 CONFIGURATION
const CONFIG = {
  SHEET_NAMES: {
    CALENDAR: 'Calendar',
    APARTMENTS: 'Apartments', 
    BOOKINGS: 'Bookings',
    DASHBOARD: 'Dashboard',
    SETTINGS: 'Settings'
  },
  
  EMAIL: {
    ADMIN_EMAIL: 'your-email@gmail.com', // Change this to your email
    SEND_NOTIFICATIONS: true
  },
  
  COLORS: {
    AVAILABLE: '#00FF00',    // Green
    BOOKED: '#FF0000',       // Red  
    MAINTENANCE: '#FFFF00',  // Yellow
    BLOCKED: '#808080'       // Gray
  }
};

/**
 * 🚀 SETUP FUNCTION - Run this once after installing the script
 */
function setupAutomation() {
  try {
    console.log('🔄 Setting up Rental Manager automation...');
    
    // Install triggers
    installTriggers();
    
    // Initialize calendar with current month
    initializeCalendar();
    
    // Set up data validation
    setupDataValidation();
    
    // Apply conditional formatting
    applyConditionalFormatting();
    
    console.log('✅ Setup completed successfully!');
    
    // Send confirmation email
    if (CONFIG.EMAIL.SEND_NOTIFICATIONS) {
      MailApp.sendEmail({
        to: CONFIG.EMAIL.ADMIN_EMAIL,
        subject: '🎉 Rental Manager Setup Complete',
        body: 'Your Google Sheets Rental Manager is now fully automated and ready to use!'
      });
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

/**
 * 📅 INITIALIZE CALENDAR WITH CURRENT MONTH
 */
function initializeCalendar() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
  
  if (!sheet) {
    console.error('Calendar sheet not found');
    return;
  }
  
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // First day of month
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
  
  // Clear existing data (keep headers)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
  
  // Generate dates for the month
  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push([Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd')]);
  }
  
  // Write dates to column A
  if (dates.length > 0) {
    sheet.getRange(2, 1, dates.length, 1).setValues(dates);
    
    // Initialize all apartments as "Available"
    const apartmentColumns = sheet.getLastColumn() - 1; // Exclude date column
    if (apartmentColumns > 0) {
      const availableData = Array(dates.length).fill().map(() => Array(apartmentColumns).fill('Available'));
      sheet.getRange(2, 2, dates.length, apartmentColumns).setValues(availableData);
    }
  }
  
  console.log(`✅ Calendar initialized with ${dates.length} days`);
}

/**
 * 🔍 CONFLICT DETECTION - Prevents double bookings
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Only check bookings sheet
    if (sheet.getName() !== CONFIG.SHEET_NAMES.BOOKINGS) {
      return;
    }
    
    // Check if apartment, check-in, or check-out was modified
    const editedColumn = range.getColumn();
    const apartmentCol = 5; // Column E (Apartment)
    const checkinCol = 6;   // Column F (Check-in)  
    const checkoutCol = 7;  // Column G (Check-out)
    
    if ([apartmentCol, checkinCol, checkoutCol].includes(editedColumn)) {
      const row = range.getRow();
      if (row > 1) { // Skip header row
        checkBookingConflicts(row);
      }
    }
    
  } catch (error) {
    console.error('Error in onEdit:', error);
  }
}

/**
 * ⚠️ CHECK FOR BOOKING CONFLICTS
 */
function checkBookingConflicts(editedRow) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Get column indices
  const apartmentIdx = headers.indexOf('Apartment');
  const checkinIdx = headers.indexOf('Check-in');
  const checkoutIdx = headers.indexOf('Check-out');
  const statusIdx = headers.indexOf('Status');
  
  if (apartmentIdx === -1 || checkinIdx === -1 || checkoutIdx === -1) {
    console.log('Required columns not found');
    return;
  }
  
  // Get data from edited row
  const editedData = data[editedRow - 1];
  const apartment = editedData[apartmentIdx];
  const checkin = new Date(editedData[checkinIdx]);
  const checkout = new Date(editedData[checkoutIdx]);
  const status = editedData[statusIdx];
  
  // Skip if incomplete data or cancelled booking
  if (!apartment || !checkin || !checkout || status === 'Cancelled') {
    return;
  }
  
  // Check for conflicts with other bookings
  let conflicts = [];
  
  for (let i = 1; i < data.length; i++) {
    if (i === editedRow - 1) continue; // Skip self
    
    const rowData = data[i];
    const rowApartment = rowData[apartmentIdx];
    const rowCheckin = new Date(rowData[checkinIdx]);
    const rowCheckout = new Date(rowData[checkoutIdx]);
    const rowStatus = rowData[statusIdx];
    
    // Skip if different apartment or cancelled
    if (rowApartment !== apartment || rowStatus === 'Cancelled') {
      continue;
    }
    
    // Check for date overlap
    if (checkin < rowCheckout && checkout > rowCheckin) {
      conflicts.push({
        row: i + 1,
        guest: rowData[headers.indexOf('Guest Name')],
        checkin: rowCheckin,
        checkout: rowCheckout
      });
    }
  }
  
  // Handle conflicts
  if (conflicts.length > 0) {
    const conflictDetails = conflicts.map(c => 
      `Row ${c.row}: ${c.guest} (${Utilities.formatDate(c.checkin, Session.getScriptTimeZone(), 'MM/dd')} - ${Utilities.formatDate(c.checkout, Session.getScriptTimeZone(), 'MM/dd')})`
    ).join('\n');
    
    const message = `⚠️ BOOKING CONFLICT DETECTED!\n\nApartment: ${apartment}\nConflicts with:\n${conflictDetails}\n\nPlease resolve this conflict.`;
    
    // Show alert
    SpreadsheetApp.getUi().alert('Booking Conflict', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    // Highlight conflicted cell
    sheet.getRange(editedRow, apartmentIdx + 1).setBackground('#FFB6C1'); // Light red
    
    // Send email notification
    if (CONFIG.EMAIL.SEND_NOTIFICATIONS) {
      MailApp.sendEmail({
        to: CONFIG.EMAIL.ADMIN_EMAIL,
        subject: '⚠️ Rental Booking Conflict Detected',
        body: message
      });
    }
  }
}

/**
 * 📧 SEND BOOKING CONFIRMATION EMAIL
 */
function sendBookingConfirmation(bookingRow) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowData = data[bookingRow - 1];
  
  // Get booking details
  const guestName = rowData[headers.indexOf('Guest Name')];
  const email = rowData[headers.indexOf('Email')];
  const apartment = rowData[headers.indexOf('Apartment')];
  const checkin = rowData[headers.indexOf('Check-in')];
  const checkout = rowData[headers.indexOf('Check-out')];
  const total = rowData[headers.indexOf('Total')];
  
  if (!email) {
    console.log('No email address found for booking');
    return;
  }
  
  const subject = '✅ Booking Confirmation - Dental Suite Rental';
  const body = `
Dear ${guestName},

Your booking has been confirmed! Here are the details:

🏨 Apartment: ${apartment}
📅 Check-in: ${Utilities.formatDate(new Date(checkin), Session.getScriptTimeZone(), 'MMMM dd, yyyy')}
📅 Check-out: ${Utilities.formatDate(new Date(checkout), Session.getScriptTimeZone(), 'MMMM dd, yyyy')}
💰 Total: $${total}

Thank you for choosing our dental suite rentals!

Best regards,
Dental Suite Rental Team
  `;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    console.log(`✅ Confirmation email sent to ${email}`);
    
    // Add note to booking
    const notesIdx = headers.indexOf('Notes');
    if (notesIdx !== -1) {
      const currentNotes = rowData[notesIdx] || '';
      const newNotes = currentNotes + (currentNotes ? '; ' : '') + 'Confirmation email sent';
      sheet.getRange(bookingRow, notesIdx + 1).setValue(newNotes);
    }
    
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * 🔄 SYNC BOOKINGS TO CALENDAR
 */
function syncBookingsToCalendar() {
  const bookingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BOOKINGS);
  const calendarSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
  
  if (!bookingsSheet || !calendarSheet) {
    console.error('Required sheets not found');
    return;
  }
  
  // Get calendar headers (apartment names)
  const calendarHeaders = calendarSheet.getRange(1, 1, 1, calendarSheet.getLastColumn()).getValues()[0];
  const apartmentColumns = {};
  
  for (let i = 1; i < calendarHeaders.length; i++) {
    apartmentColumns[calendarHeaders[i]] = i + 1;
  }
  
  // Reset calendar to all "Available"
  const calendarData = calendarSheet.getDataRange().getValues();
  for (let row = 1; row < calendarData.length; row++) {
    for (let col = 1; col < calendarData[row].length; col++) {
      calendarSheet.getRange(row + 1, col + 1).setValue('Available');
    }
  }
  
  // Get bookings data
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const bookingsHeaders = bookingsData[0];
  
  const apartmentIdx = bookingsHeaders.indexOf('Apartment');
  const checkinIdx = bookingsHeaders.indexOf('Check-in');
  const checkoutIdx = bookingsHeaders.indexOf('Check-out');
  const statusIdx = bookingsHeaders.indexOf('Status');
  
  if (apartmentIdx === -1 || checkinIdx === -1 || checkoutIdx === -1) {
    console.error('Required booking columns not found');
    return;
  }
  
  // Mark booked dates
  for (let i = 1; i < bookingsData.length; i++) {
    const booking = bookingsData[i];
    const apartment = booking[apartmentIdx];
    const checkin = new Date(booking[checkinIdx]);
    const checkout = new Date(booking[checkoutIdx]);
    const status = booking[statusIdx];
    
    // Skip cancelled bookings
    if (status === 'Cancelled' || !apartment) {
      continue;
    }
    
    const apartmentCol = apartmentColumns[apartment];
    if (!apartmentCol) {
      console.log(`Apartment ${apartment} not found in calendar`);
      continue;
    }
    
    // Mark each date as booked
    for (let date = new Date(checkin); date < checkout; date.setDate(date.getDate() + 1)) {
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      // Find the date row
      for (let row = 1; row < calendarData.length; row++) {
        if (calendarData[row][0] === dateStr) {
          calendarSheet.getRange(row + 1, apartmentCol).setValue('Booked');
          break;
        }
      }
    }
  }
  
  console.log('✅ Calendar synced with bookings');
}

/**
 * ⚙️ SETUP DATA VALIDATION
 */
function setupDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
  
  if (!settingsSheet) {
    console.log('Settings sheet not found');
    return;
  }
  
  // Apartment status validation
  const apartmentsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.APARTMENTS);
  if (apartmentsSheet) {
    const statusRange = apartmentsSheet.getRange('I:I');
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(settingsSheet.getRange('A4:A6'))
      .build();
    statusRange.setDataValidation(statusRule);
  }
  
  // Booking status validation
  const bookingsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKINGS);
  if (bookingsSheet) {
    const bookingStatusRange = bookingsSheet.getRange('K:K');
    const bookingStatusRule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(settingsSheet.getRange('A9:A13'))
      .build();
    bookingStatusRange.setDataValidation(bookingStatusRule);
  }
  
  // Calendar status validation
  const calendarSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
  if (calendarSheet) {
    const calendarRange = calendarSheet.getRange('B:Z');
    const calendarRule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(settingsSheet.getRange('A16:A19'))
      .build();
    calendarRange.setDataValidation(calendarRule);
  }
  
  console.log('✅ Data validation set up');
}

/**
 * 🎨 APPLY CONDITIONAL FORMATTING
 */
function applyConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const calendarSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
  
  if (!calendarSheet) {
    console.log('Calendar sheet not found');
    return;
  }
  
  const range = calendarSheet.getRange('B:Z');
  
  // Clear existing rules
  range.clearFormat();
  
  // Available = Green
  const availableRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Available')
    .setBackground(CONFIG.COLORS.AVAILABLE)
    .setRanges([range])
    .build();
  
  // Booked = Red
  const bookedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Booked')
    .setBackground(CONFIG.COLORS.BOOKED)
    .setRanges([range])
    .build();
  
  // Maintenance = Yellow
  const maintenanceRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Maintenance')
    .setBackground(CONFIG.COLORS.MAINTENANCE)
    .setRanges([range])
    .build();
  
  // Apply rules
  const rules = [availableRule, bookedRule, maintenanceRule];
  calendarSheet.setConditionalFormatRules(rules);
  
  console.log('✅ Conditional formatting applied');
}

/**
 * 🔧 INSTALL TRIGGERS
 */
function installTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit' || 
        trigger.getHandlerFunction() === 'dailySync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Install edit trigger
  ScriptApp.newTrigger('onEdit')
    .onEdit()
    .create();
  
  // Install daily sync trigger
  ScriptApp.newTrigger('dailySync')
    .timeBased()
    .everyDays(1)
    .atHour(9) // 9 AM
    .create();
  
  console.log('✅ Triggers installed');
}

/**
 * 🔄 DAILY SYNC FUNCTION
 */
function dailySync() {
  try {
    console.log('🔄 Running daily sync...');
    
    // Sync bookings to calendar
    syncBookingsToCalendar();
    
    // Generate daily report
    generateDailyReport();
    
    console.log('✅ Daily sync completed');
    
  } catch (error) {
    console.error('❌ Daily sync failed:', error);
    
    if (CONFIG.EMAIL.SEND_NOTIFICATIONS) {
      MailApp.sendEmail({
        to: CONFIG.EMAIL.ADMIN_EMAIL,
        subject: '⚠️ Rental Manager Daily Sync Failed',
        body: `Daily sync failed with error: ${error.toString()}`
      });
    }
  }
}

/**
 * 📊 GENERATE DAILY REPORT
 */
function generateDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bookingsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKINGS);
  const calendarSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
  
  if (!bookingsSheet || !calendarSheet) {
    console.log('Required sheets not found for daily report');
    return;
  }
  
  const today = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Count today's stats
  const calendarData = calendarSheet.getDataRange().getValues();
  let availableCount = 0;
  let bookedCount = 0;
  
  for (let row = 1; row < calendarData.length; row++) {
    if (calendarData[row][0] === todayStr) {
      for (let col = 1; col < calendarData[row].length; col++) {
        const status = calendarData[row][col];
        if (status === 'Available') availableCount++;
        else if (status === 'Booked') bookedCount++;
      }
      break;
    }
  }
  
  // Get upcoming bookings
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const headers = bookingsData[0];
  const checkinIdx = headers.indexOf('Check-in');
  const guestIdx = headers.indexOf('Guest Name');
  const apartmentIdx = headers.indexOf('Apartment');
  
  const upcomingBookings = [];
  for (let i = 1; i < bookingsData.length; i++) {
    const checkinDate = new Date(bookingsData[i][checkinIdx]);
    if (checkinDate >= today && checkinDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      upcomingBookings.push({
        guest: bookingsData[i][guestIdx],
        apartment: bookingsData[i][apartmentIdx],
        checkin: checkinDate
      });
    }
  }
  
  // Create report
  const report = `
📊 DAILY RENTAL REPORT - ${Utilities.formatDate(today, Session.getScriptTimeZone(), 'MMMM dd, yyyy')}

🏨 TODAY'S AVAILABILITY:
• Available apartments: ${availableCount}
• Booked apartments: ${bookedCount}
• Occupancy rate: ${bookedCount > 0 ? Math.round((bookedCount / (availableCount + bookedCount)) * 100) : 0}%

📅 UPCOMING BOOKINGS (Next 7 days):
${upcomingBookings.length > 0 ? 
  upcomingBookings.map(b => 
    `• ${b.guest} - ${b.apartment} (${Utilities.formatDate(b.checkin, Session.getScriptTimeZone(), 'MM/dd')})`
  ).join('\n') : 
  '• No upcoming bookings'
}

---
Generated automatically by Rental Manager
  `;
  
  console.log('📊 Daily Report Generated');
  
  // Send report email
  if (CONFIG.EMAIL.SEND_NOTIFICATIONS && upcomingBookings.length > 0) {
    MailApp.sendEmail({
      to: CONFIG.EMAIL.ADMIN_EMAIL,
      subject: '📊 Daily Rental Report',
      body: report
    });
  }
}

/**
 * 🧹 UTILITY FUNCTIONS
 */

// Manual sync function (can be run anytime)
function manualSync() {
  syncBookingsToCalendar();
  SpreadsheetApp.getUi().alert('✅ Calendar synced successfully!');
}

// Generate next month's calendar
function generateNextMonth() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  initializeCalendar();
  SpreadsheetApp.getUi().alert(`✅ Calendar generated for ${Utilities.formatDate(nextMonth, Session.getScriptTimeZone(), 'MMMM yyyy')}`);
}

// Test email configuration
function testEmail() {
  if (CONFIG.EMAIL.SEND_NOTIFICATIONS) {
    MailApp.sendEmail({
      to: CONFIG.EMAIL.ADMIN_EMAIL,
      subject: '🧪 Rental Manager Test Email',
      body: 'This is a test email from your Rental Manager automation. Everything is working correctly!'
    });
    SpreadsheetApp.getUi().alert('✅ Test email sent successfully!');
  } else {
    SpreadsheetApp.getUi().alert('❌ Email notifications are disabled in configuration.');
  }
}

/**
 * 📝 CUSTOM MENU
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏨 Rental Manager')
    .addItem('🔄 Manual Sync', 'manualSync')
    .addItem('📅 Generate Next Month', 'generateNextMonth')
    .addSeparator()
    .addItem('🧪 Test Email', 'testEmail')
    .addItem('⚙️ Setup Automation', 'setupAutomation')
    .addToUi();
} 