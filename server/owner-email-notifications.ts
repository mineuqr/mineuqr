import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

// Create reusable transporter
function createTransporter() {
  if (!ENV.emailHost || !ENV.emailUser || !ENV.emailPassword) {
    console.warn("[OwnerEmail] Email configuration is incomplete. Skipping email.");
    return null;
  }

  return nodemailer.createTransport({
    host: ENV.emailHost,
    port: ENV.emailPort,
    secure: ENV.emailSecure,
    auth: {
      user: ENV.emailUser,
      pass: ENV.emailPassword,
    },
  });
}

// Owner email address (from EMAIL_FROM env)
function getOwnerEmail(): string {
  return ENV.emailFrom || ENV.emailUser;
}

// Common email styles
const emailStyles = `
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; direction: rtl; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
    .header .subtitle { color: #4ecdc4; margin-top: 8px; font-size: 14px; }
    .body { padding: 30px; }
    .info-card { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 15px 0; border-right: 4px solid #4ecdc4; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 14px; font-weight: 600; }
    .info-value { color: #1e293b; font-size: 14px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
  </style>
`;

// Helper to send email
async function sendOwnerEmail(subject: string, htmlBody: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: `"منيو QR - إشعارات" <${getOwnerEmail()}>`,
      to: getOwnerEmail(),
      subject,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8">${emailStyles}</head>
        <body>${htmlBody}</body>
        </html>
      `,
    });
    console.log(`[OwnerEmail] Email sent: ${subject}`);
    return true;
  } catch (error) {
    console.error("[OwnerEmail] Failed to send email:", error);
    return false;
  }
}

// Format date for display
function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── 1. New User Registration ───────────────────────
export async function notifyOwnerNewUser(userData: {
  name: string | null;
  email: string | null;
  loginMethod: string | null;
}): Promise<boolean> {
  const subject = "🆕 مستخدم جديد سجّل في منيو QR";
  const html = `
    <div class="container">
      <div class="header">
        <h1>مستخدم جديد</h1>
        <div class="subtitle">تم تسجيل مستخدم جديد في المنصة</div>
      </div>
      <div class="body">
        <div class="info-card">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">الاسم</td>
              <td style="color:#1e293b;font-size:14px;">${userData.name || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">البريد الإلكتروني</td>
              <td style="color:#1e293b;font-size:14px;">${userData.email || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">طريقة التسجيل</td>
              <td style="color:#1e293b;font-size:14px;">${userData.loginMethod || "Manus OAuth"}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:14px;font-weight:600;">التاريخ</td>
              <td style="color:#1e293b;font-size:14px;">${formatDate()}</td>
            </tr>
          </table>
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center;">تم تفعيل اشتراك تجريبي مجاني لمدة 14 يوم للمستخدم الجديد.</p>
      </div>
      <div class="footer">
        <p>منيو QR - نظام إدارة المنيو الرقمي</p>
      </div>
    </div>
  `;
  return sendOwnerEmail(subject, html);
}

// ─── 2. New Subscription ───────────────────────
export async function notifyOwnerNewSubscription(data: {
  userName: string | null;
  userEmail: string | null;
  planName: string;
  billingCycle: string;
  amount: string;
}): Promise<boolean> {
  const subject = "💰 اشتراك جديد في منيو QR";
  const cycleText = data.billingCycle === "yearly" ? "سنوي" : "شهري";
  const html = `
    <div class="container">
      <div class="header">
        <h1>اشتراك جديد</h1>
        <div class="subtitle">تم تسجيل اشتراك مدفوع جديد</div>
      </div>
      <div class="body">
        <div class="info-card">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">المستخدم</td>
              <td style="color:#1e293b;font-size:14px;">${data.userName || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">البريد الإلكتروني</td>
              <td style="color:#1e293b;font-size:14px;">${data.userEmail || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">الخطة</td>
              <td style="color:#1e293b;font-size:14px;"><span class="badge badge-success">${data.planName}</span></td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">نوع الاشتراك</td>
              <td style="color:#1e293b;font-size:14px;">${cycleText}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">المبلغ</td>
              <td style="color:#1e293b;font-size:14px;font-weight:700;">${data.amount}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:14px;font-weight:600;">التاريخ</td>
              <td style="color:#1e293b;font-size:14px;">${formatDate()}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="footer">
        <p>منيو QR - نظام إدارة المنيو الرقمي</p>
      </div>
    </div>
  `;
  return sendOwnerEmail(subject, html);
}

// ─── 3. New Restaurant Created ───────────────────────
export async function notifyOwnerNewRestaurant(data: {
  restaurantNameAr: string;
  restaurantNameEn?: string;
  ownerName: string | null;
  ownerEmail: string | null;
}): Promise<boolean> {
  const subject = "🍽️ مطعم جديد تم إضافته في منيو QR";
  const html = `
    <div class="container">
      <div class="header">
        <h1>مطعم جديد</h1>
        <div class="subtitle">تم إضافة مطعم جديد في المنصة</div>
      </div>
      <div class="body">
        <div class="info-card">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">اسم المطعم (عربي)</td>
              <td style="color:#1e293b;font-size:14px;">${data.restaurantNameAr}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">اسم المطعم (إنجليزي)</td>
              <td style="color:#1e293b;font-size:14px;">${data.restaurantNameEn || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">صاحب المطعم</td>
              <td style="color:#1e293b;font-size:14px;">${data.ownerName || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">البريد الإلكتروني</td>
              <td style="color:#1e293b;font-size:14px;">${data.ownerEmail || "غير محدد"}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:14px;font-weight:600;">التاريخ</td>
              <td style="color:#1e293b;font-size:14px;">${formatDate()}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="footer">
        <p>منيو QR - نظام إدارة المنيو الرقمي</p>
      </div>
    </div>
  `;
  return sendOwnerEmail(subject, html);
}

// ─── 4. Subscription Cancelled ───────────────────────
export async function notifyOwnerSubscriptionCancelled(data: {
  userName: string | null;
  userEmail: string | null;
  planName: string;
  subscriptionId: number;
}): Promise<boolean> {
  const subject = "❌ إلغاء اشتراك في منيو QR";
  const html = `
    <div class="container">
      <div class="header" style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);">
        <h1>إلغاء اشتراك</h1>
        <div class="subtitle" style="color:#fca5a5;">تم إلغاء اشتراك مستخدم</div>
      </div>
      <div class="body">
        <div class="info-card" style="border-right-color:#ef4444;">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">المستخدم</td>
              <td style="color:#1e293b;font-size:14px;">${data.userName || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">البريد الإلكتروني</td>
              <td style="color:#1e293b;font-size:14px;">${data.userEmail || "غير محدد"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">الخطة</td>
              <td style="color:#1e293b;font-size:14px;"><span class="badge badge-danger">${data.planName}</span></td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="color:#64748b;font-size:14px;font-weight:600;">رقم الاشتراك</td>
              <td style="color:#1e293b;font-size:14px;">#${data.subscriptionId}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:14px;font-weight:600;">تاريخ الإلغاء</td>
              <td style="color:#1e293b;font-size:14px;">${formatDate()}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="footer">
        <p>منيو QR - نظام إدارة المنيو الرقمي</p>
      </div>
    </div>
  `;
  return sendOwnerEmail(subject, html);
}
