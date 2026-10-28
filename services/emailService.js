const nodemailer = require('nodemailer');

// In-memory audit log for email history (accessible via API for testing & verification)
const emailAuditLogs = [];

// Initialize transporter
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('📧 SMTP Email Transporter configured with host:', process.env.SMTP_HOST);
} else {
  console.log('ℹ️ Live SMTP not configured in .env. Email Service running in simulated/preview mode.');
}

/**
 * Standard CT University Letterhead HTML Wrapper
 */
function createEmailTemplate({ title, subtitle, preheader, bodyHtml, actionButtonText, actionButtonUrl, referenceCode }) {
  const portalUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const trackUrl = actionButtonUrl || `${portalUrl}/?tab=track&ref=${referenceCode || ''}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; }
      .container { max-width: 600px; margin: 30px auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
      .header { background: #1E3A8A; color: #FFFFFF; padding: 24px; text-align: left; }
      .brand-title { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; margin: 0; }
      .brand-sub { font-size: 12px; color: #93C5FD; margin-top: 4px; }
      .content { padding: 28px 24px; }
      .ref-badge { display: inline-block; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E3A8A; font-weight: 700; padding: 6px 14px; border-radius: 6px; font-size: 14px; margin: 14px 0; }
      .btn { display: inline-block; background: #1E3A8A; color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; margin: 20px 0 10px; text-align: center; }
      .footer { background: #F1F5F9; border-top: 1px solid #E2E8F0; padding: 16px 24px; font-size: 12px; color: #64748B; text-align: center; }
      .table-box { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
      .table-box td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
      .table-box td.label { font-weight: 600; color: #475569; width: 35%; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 24px; margin-bottom: 6px;">🏛️</div>
        <h1 class="brand-title">CT UNIVERSITY</h1>
        <div class="brand-sub">Campus Visitor & Hospitality Clearance Portal • Dept of CSE</div>
      </div>
      
      <div class="content">
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">${title}</h2>
        ${subtitle ? `<p style="font-size: 14px; color: #475569; margin-top: -6px;">${subtitle}</p>` : ''}
        
        ${referenceCode ? `
          <div style="margin: 12px 0;">
            <span style="font-size: 12px; color: #64748B; text-transform: uppercase;">Tracking Reference Code:</span><br/>
            <span class="ref-badge">${referenceCode}</span>
          </div>
        ` : ''}

        ${bodyHtml}

        ${actionButtonText ? `
          <div style="text-align: center;">
            <a href="${trackUrl}" class="btn" target="_blank">${actionButtonText}</a>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <strong>CT University • Ferozepur Road, Ludhiana, Punjab - 142024</strong><br/>
        This is an official automated notification from the Campus Visitor Management Desk.<br/>
        For campus inquiries: 📞 +91 161 520 2222 | ✉️ security@ctuniversity.in
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Dispatch mail or log to preview
 */
async function sendMail({ to, subject, html, logType, referenceCode }) {
  const from = process.env.EMAIL_FROM || '"CT University Campus Desk" <noreply@ctuniversity.in>';
  
  const logEntry = {
    id: 'MAIL-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    to,
    subject,
    logType,
    referenceCode,
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };

  emailAuditLogs.unshift(logEntry);
  if (emailAuditLogs.length > 50) emailAuditLogs.pop();

  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL DISPATCHED] -> To: ${to}`);
  console.log(`📌 Subject: ${subject}`);
  console.log(`🏷️ Type: ${logType} | Ref: ${referenceCode || 'N/A'}`);
  console.log(`======================================================\n`);

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log('✅ Real SMTP Email sent successfully! MessageId:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('❌ SMTP delivery failed:', err.message);
      logEntry.status = 'failed_smtp';
      logEntry.error = err.message;
      return { success: false, error: err.message };
    }
  }

  // Simulated delivery mode
  return { success: true, simulated: true, logId: logEntry.id };
}

/**
 * 1. Guest Form Submitted -> Thank you & Under Review Email
 */
async function sendApplicationReceivedEmail(request) {
  const title = 'Campus Visit Request Received';
  const subtitle = `Dear ${request.guestName}, thank you for registering your planned visit to CT University.`;
  
  const facilitiesRequested = [];
  if (request.accommodation?.selected) facilitiesRequested.push('On-Campus Lodging (' + request.accommodation.roomType + ')');
  if (request.food?.selected) facilitiesRequested.push('Hostel Mess Dining (' + (request.food.mealsRequired?.join(', ') || 'Meals') + ')');
  if (request.transport?.selected) facilitiesRequested.push('Campus Gate Shuttle (' + (request.transport.pickupLocation || 'Main Gate') + ')');
  if (facilitiesRequested.length === 0) facilitiesRequested.push('Day Visit Clearance Only (No Lodging/Mess)');

  const bodyHtml = `
    <p>Your visit clearance request has been successfully registered and placed in the review queue for the <strong>Dean / Super Admin Office</strong>.</p>
    
    <table class="table-box">
      <tr>
        <td class="label">Visitor Name:</td>
        <td><strong>${request.guestName}</strong> (${request.designation || 'Visitor'})</td>
      </tr>
      <tr>
        <td class="label">Home Organization:</td>
        <td>${request.institution || 'External'}</td>
      </tr>
      <tr>
        <td class="label">Host Department:</td>
        <td>${request.purposeOfVisit ? request.purposeOfVisit.split(']')[0].replace('[Host: ', '') : 'CT University'}</td>
      </tr>
      <tr>
        <td class="label">Facilities Requested:</td>
        <td>${facilitiesRequested.join('<br/>')}</td>
      </tr>
      <tr>
        <td class="label">Current Status:</td>
        <td><span style="color: #D97706; font-weight: 700;">⏳ Pending Dean Office Clearance</span></td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #475569;">
      Once the Super Admin / Dean approves your request, you will receive an official approval confirmation with your digital entry pass, and the respective Caretaker Desks (Hostel/Mess/Transport) will process your requested amenities.
    </p>
  `;

  const html = createEmailTemplate({
    title,
    subtitle,
    bodyHtml,
    referenceCode: request.referenceCode,
    actionButtonText: 'Check Application Status Live ➔',
  });

  return sendMail({
    to: request.guestEmail,
    subject: `[CT University] Application Received: Campus Visit Request #${request.referenceCode}`,
    html,
    logType: 'APPLICATION_RECEIVED',
    referenceCode: request.referenceCode,
  });
}

/**
 * 2. Super Admin Decision -> Approval or Rejection Email
 */
async function sendClearanceDecisionEmail(request, decision, notes = '') {
  const isApproved = decision === 'approved';
  const title = isApproved ? 'Campus Visit Clearance APPROVED! 🎉' : 'Campus Visit Request Update';
  const subtitle = isApproved
    ? `Dear ${request.guestName}, official visit clearance has been granted by the Dean Office.`
    : `Dear ${request.guestName}, update regarding your CT University campus visit request.`;

  let bodyHtml = '';

  if (isApproved) {
    bodyHtml = `
      <div style="background: #ECFDF5; border-left: 4px solid #059669; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
        <strong style="color: #065F46; font-size: 14px;">✓ Clearance Status: APPROVED & CLEARED</strong>
        <p style="margin: 4px 0 0; font-size: 13px; color: #047857;">
          Your campus entry permission is confirmed. Please show your Reference Code <strong>${request.referenceCode}</strong> at the University Main Security Gate.
        </p>
      </div>

      <p>Your requested facility requirements have been forwarded to the respective department heads:</p>
      
      <table class="table-box">
        <tr>
          <td class="label">Hostel Lodging:</td>
          <td>${request.accommodation?.selected ? '<span style="color: #D97706; font-weight: 600;">⏳ Dispatched to Hostel Warden for room assignment</span>' : 'Not Requested (Day Visit)'}</td>
        </tr>
        <tr>
          <td class="label">Mess Dining:</td>
          <td>${request.food?.selected ? '<span style="color: #D97706; font-weight: 600;">⏳ Dispatched to Mess In-Charge for meal pass coupon</span>' : 'Not Requested'}</td>
        </tr>
        <tr>
          <td class="label">Gate Shuttle:</td>
          <td>${request.transport?.selected ? '<span style="color: #D97706; font-weight: 600;">⏳ Dispatched to Transport Fleet for driver assignment</span>' : 'Own Conveyance'}</td>
        </tr>
      </table>

      ${notes ? `<p style="font-size: 13px; background: #F8FAFC; padding: 10px; border-radius: 4px;"><strong>Admin Remarks:</strong> ${notes}</p>` : ''}
    `;
  } else {
    bodyHtml = `
      <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
        <strong style="color: #991B1B; font-size: 14px;">✕ Clearance Status: NOT CLEARED / REJECTED</strong>
        <p style="margin: 4px 0 0; font-size: 13px; color: #B91C1C;">
          We regret to inform you that your campus visit request could not be approved at this time.
        </p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        <strong>Reason / Remarks:</strong> ${notes || 'Institutional schedule conflict or unverified host department endorsement.'}
      </p>

      <p style="font-size: 12px; color: #64748B;">
        For further details or clarifications, please contact the inviting department or the CT University Administrative Office.
      </p>
    `;
  }

  const html = createEmailTemplate({
    title,
    subtitle,
    bodyHtml,
    referenceCode: request.referenceCode,
    actionButtonText: isApproved ? 'View Live Digital Gate Pass ➔' : 'View Application Details',
  });

  return sendMail({
    to: request.guestEmail,
    subject: isApproved
      ? `[CT University] Visit Clearance Approved - Official Gate Reference #${request.referenceCode}`
      : `[CT University] Notice: Campus Visit Request #${request.referenceCode} Not Approved`,
    html,
    logType: isApproved ? 'CLEARANCE_APPROVED' : 'CLEARANCE_REJECTED',
    referenceCode: request.referenceCode,
  });
}

/**
 * 3. Individual Department Allotment Updates (Hostel Room / Mess Pass / Shuttle Driver)
 */
async function sendFacilityUpdateEmail(request, facilityType, details = {}) {
  let title = '';
  let subtitle = '';
  let bodyHtml = '';
  let subject = '';

  if (facilityType === 'accommodation') {
    title = 'Hostel Room Allotted! 🏠';
    subtitle = `Dear ${request.guestName}, your on-campus transit accommodation has been confirmed by the Hostel Warden.`;
    subject = `[CT University] Room Allotted: ${details.roomNumber || request.accommodation?.allocatedRoom} (Ref #${request.referenceCode})`;
    
    bodyHtml = `
      <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 14px 18px; border-radius: 6px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: #047857; text-transform: uppercase; font-weight: 700;">Confirmed Room Number:</div>
        <div style="font-size: 20px; font-weight: 800; color: #065F46; margin: 4px 0;">
          ${details.roomNumber || request.accommodation?.allocatedRoom || 'Faculty Transit Quarters'}
        </div>
        <div style="font-size: 12px; color: #059669;">Room Type: ${request.accommodation?.roomType || 'Standard Transit Room'}</div>
      </div>

      <table class="table-box">
        <tr>
          <td class="label">Check-In Date:</td>
          <td>${request.accommodation?.checkInDate || 'Arrival Day'}</td>
        </tr>
        <tr>
          <td class="label">Check-Out Date:</td>
          <td>${request.accommodation?.checkOutDate || 'Departure Day'}</td>
        </tr>
        <tr>
          <td class="label">Allotted By:</td>
          <td>${details.assignedBy || 'Hostel Warden Desk'}</td>
        </tr>
        <tr>
          <td class="label">Hostel Key Collection:</td>
          <td>Collect physical room keys from the Hostel Security Desk at Main Entrance.</td>
        </tr>
      </table>
    `;
  } else if (facilityType === 'food') {
    title = 'Hostel Mess Meal Passes Issued! 🍽️';
    subtitle = `Dear ${request.guestName}, your dining meal passes have been approved by the Mess In-Charge.`;
    subject = `[CT University] Mess Dining Passes Issued (Ref #${request.referenceCode})`;

    bodyHtml = `
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 14px 18px; border-radius: 6px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: #1E40AF; text-transform: uppercase; font-weight: 700;">Approved Meal Passes:</div>
        <div style="font-size: 18px; font-weight: 800; color: #1E3A8A; margin: 4px 0;">
          ${request.food?.mealsRequired?.join(', ') || 'Hostel Mess Thali'}
        </div>
        <div style="font-size: 12px; color: #2563EB;">Dietary Preference: ${request.food?.dietaryPreference || 'Vegetarian'}</div>
      </div>

      <p style="font-size: 13px; color: #475569;">
        Please present your Reference Code <strong>${request.referenceCode}</strong> at the Campus Dining Hall counter to receive your meal tray.
      </p>
    `;
  } else if (facilityType === 'transport') {
    title = 'Campus Gate Shuttle Scheduled! 🚗';
    subtitle = `Dear ${request.guestName}, transit assistance has been scheduled by the Campus Transport Desk.`;
    subject = `[CT University] Campus Shuttle Assigned (Ref #${request.referenceCode})`;

    bodyHtml = `
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 14px 18px; border-radius: 6px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: #166534; text-transform: uppercase; font-weight: 700;">Vehicle & Driver Details:</div>
        <div style="font-size: 18px; font-weight: 800; color: #14532D; margin: 4px 0;">
          ${details.vehicle || request.transport?.allocatedVehicle || 'Campus Shuttle Van'}
        </div>
        <div style="font-size: 13px; color: #15803D;">Driver: ${details.driver || request.transport?.allocatedDriver || 'Campus Fleet Driver'} ${details.driverPhone ? ' (📞 ' + details.driverPhone + ')' : ''}</div>
      </div>

      <table class="table-box">
        <tr>
          <td class="label">Pickup Location:</td>
          <td><strong>${request.transport?.pickupLocation || 'University Main Gate'}</strong></td>
        </tr>
        <tr>
          <td class="label">Pickup Date & Time:</td>
          <td>${request.transport?.pickupDateTime || 'As scheduled'}</td>
        </tr>
      </table>
    `;
  }

  const html = createEmailTemplate({
    title,
    subtitle,
    bodyHtml,
    referenceCode: request.referenceCode,
    actionButtonText: 'View Updated Digital Gate Pass ➔',
  });

  return sendMail({
    to: request.guestEmail,
    subject,
    html,
    logType: `FACILITY_${facilityType.toUpperCase()}_UPDATED`,
    referenceCode: request.referenceCode,
  });
}

/**
 * Send official credentials when Super Admin provisions a staff account
 */
async function sendStaffProvisionedEmail({ staffName, staffEmail, staffId, department, designation, tempPassword }) {
  const portalUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const loginUrl = `${portalUrl}/login`;

  const title = 'CT University Portal • Official Staff Credentials Issued';
  const subtitle = 'Department Governance & Academic Operational Desk Access';
  const subject = `[CT University] Official Staff Account Credentials - Staff ID: ${staffId}`;

  const bodyHtml = `
    <p>Dear <strong>${staffName}</strong>,</p>
    <p>Your institutional staff account has been created on the <strong>CT University Campus Visitor & Caretaker Operations Portal</strong> by the Dean's Office.</p>
    
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1E3A8A; letter-spacing: 0.5px; margin-bottom: 8px;">
        OFFICIAL LOGIN CREDENTIALS
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #475569; width: 40%;"><strong>Staff Login ID:</strong></td>
          <td style="padding: 6px 0;"><code style="background: #FFFFFF; border: 1px solid #CBD5E1; padding: 3px 8px; border-radius: 4px; font-weight: 700; color: #1E3A8A; font-size: 15px;">${staffId}</code></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #475569;"><strong>Official Email:</strong></td>
          <td style="padding: 6px 0;"><strong>${staffEmail}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #475569;"><strong>Temporary Password:</strong></td>
          <td style="padding: 6px 0;"><code style="background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 15px;">${tempPassword}</code></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #475569;"><strong>Department:</strong></td>
          <td style="padding: 6px 0;">${department || 'General Academic'}${designation ? ` (${designation})` : ''}</td>
        </tr>
      </table>
    </div>

    <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400E; margin: 16px 0;">
      <strong>⚠️ Mandatory First Login Security Policy:</strong><br />
      Upon your first login, the university system will prompt you to set your own permanent, confidential password before proceeding to your dashboard.
    </div>

    <p style="font-size: 13px; color: #64748B;">Please click the button below to sign in using your Staff ID and temporary password:</p>
  `;

  const html = createEmailTemplate({
    title,
    subtitle,
    bodyHtml,
    actionButtonText: 'Access Staff Login Portal ➔',
    actionButtonUrl: loginUrl,
    referenceCode: staffId,
  });

  return sendMail({
    to: staffEmail,
    subject,
    html,
    logType: 'STAFF_ACCOUNT_PROVISIONED',
    referenceCode: staffId,
  });
}

function getRecentEmailLogs() {
  return emailAuditLogs;
}

module.exports = {
  sendApplicationReceivedEmail,
  sendClearanceDecisionEmail,
  sendFacilityUpdateEmail,
  sendStaffProvisionedEmail,
  getRecentEmailLogs,
};
