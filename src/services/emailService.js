const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Core send — all templates call this.
 * Returns silently if SMTP_USER is not configured (dev mode).
 */
const sendMail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
    console.log(`[Email] DEV MODE – would send "${subject}" to ${to}`);
    return;
  }
  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'QuickMate ERP <noreply@quickmate.app>',
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent: ${info.messageId}`);
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
  }
};

// ─── Templates ───────────────────────────────────────────────────────────────

const sendWelcomeEmail = async ({ to, name, tempPassword }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
  await sendMail({
    to,
    subject: 'Welcome to QuickMate ERP — Your Account is Ready',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#6366f1">Welcome, ${name}!</h2>
        <p>Your QuickMate ERP account has been created. Use the credentials below to log in.</p>
        <table style="background:#f4f4f5;border-radius:8px;padding:16px;width:100%">
          <tr><td><strong>Email:</strong></td><td>${to}</td></tr>
          <tr><td><strong>Temporary Password:</strong></td><td style="font-family:monospace">${tempPassword}</td></tr>
        </table>
        <p><a href="${frontendUrl}/login" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:white;border-radius:6px;text-decoration:none">Login Now</a></p>
        <p style="color:#888;font-size:12px">Please change your password immediately after logging in.</p>
      </div>`,
  });
};

const sendPoApprovalRequest = async ({ to, approverName, entityNumber, amount, requesterName, notes }) => {
  await sendMail({
    to,
    subject: `Action Required: Approve ${entityNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#f59e0b">⚠ Approval Required</h2>
        <p>Hi ${approverName},</p>
        <p><strong>${requesterName}</strong> has submitted <strong>${entityNumber}</strong> for your approval.</p>
        <table style="background:#f4f4f5;border-radius:8px;padding:16px;width:100%">
          <tr><td><strong>Order:</strong></td><td>${entityNumber}</td></tr>
          <tr><td><strong>Amount:</strong></td><td>₹${Number(amount).toLocaleString()}</td></tr>
          ${notes ? `<tr><td><strong>Notes:</strong></td><td>${notes}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px">Log in to the ERP to approve or reject this request.</p>
      </div>`,
  });
};

const sendApprovalResult = async ({ to, userName, entityNumber, approved, reason }) => {
  const color  = approved ? '#10b981' : '#ef4444';
  const status = approved ? '✅ Approved' : '❌ Rejected';
  await sendMail({
    to,
    subject: `${entityNumber} has been ${approved ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:${color}">${status}</h2>
        <p>Hi ${userName},</p>
        <p>Your request <strong>${entityNumber}</strong> has been <strong>${approved ? 'approved' : 'rejected'}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>`,
  });
};

const sendMoCreatedEmail = async ({ to, managerName, moNumber, productName, quantity }) => {
  await sendMail({
    to,
    subject: `Manufacturing Order ${moNumber} Created`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#6366f1">🏭 New Manufacturing Order</h2>
        <p>Hi ${managerName},</p>
        <p>A new Manufacturing Order has been created automatically.</p>
        <table style="background:#f4f4f5;border-radius:8px;padding:16px;width:100%">
          <tr><td><strong>MO Number:</strong></td><td>${moNumber}</td></tr>
          <tr><td><strong>Product:</strong></td><td>${productName}</td></tr>
          <tr><td><strong>Quantity:</strong></td><td>${quantity}</td></tr>
        </table>
      </div>`,
  });
};

const sendShortageAlert = async ({ to, recipientName, shortages }) => {
  const rows = shortages
    .map(s => `<tr><td>${s.component}</td><td>${s.available}</td><td>${s.required}</td><td style="color:#ef4444"><strong>${s.gap}</strong></td></tr>`)
    .join('');
  await sendMail({
    to,
    subject: '🔴 Material Shortage Alert — Action Required',
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto">
        <h2 style="color:#ef4444">Material Shortage Alert</h2>
        <p>Hi ${recipientName},</p>
        <p>The following materials are critically low:</p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#fee2e2">
            <th style="padding:8px;text-align:left">Component</th>
            <th>Available</th><th>Required</th><th>Gap</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px">Log in to review procurement recommendations.</p>
      </div>`,
  });
};

const sendDeliveryReadyEmail = async ({ to, recipientName, soNumber, customerName }) => {
  await sendMail({
    to,
    subject: `📦 ${soNumber} Ready for Delivery`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#10b981">Ready for Delivery</h2>
        <p>Hi ${recipientName},</p>
        <p>Sales Order <strong>${soNumber}</strong> for <strong>${customerName}</strong> is ready to be dispatched.</p>
      </div>`,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendPoApprovalRequest,
  sendApprovalResult,
  sendMoCreatedEmail,
  sendShortageAlert,
  sendDeliveryReadyEmail,
};
