import nodemailer from "nodemailer";
import { Resend } from "resend";
import { ENV } from "./_core/env";

const DEFAULT_FROM = "MineuQR <info@mineuqr.com>";

// إعداد البريد الإلكتروني باستخدام متغيرات البيئة المركزية
const transporter = nodemailer.createTransport({
  host: ENV.emailHost || "smtp.gmail.com",
  port: ENV.emailPort,
  secure: ENV.emailSecure,
  auth: {
    user: ENV.emailUser,
    pass: ENV.emailPassword,
  },
});

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(ENV.resendApiKey);
  }
  return resendClient;
}

/** Verified-domain From header (Resend + SMTP). */
function getEmailFrom(): string {
  const configured = ENV.emailFrom?.trim();
  if (!configured) {
    return DEFAULT_FROM;
  }
  return configured.includes("<") ? configured : `MineuQR <${configured}>`;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendViaResend(options: EmailOptions): Promise<boolean> {
  console.log("[Email] provider=resend");
  const { error } = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }

  console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
  return true;
}

async function sendViaSmtp(options: EmailOptions): Promise<boolean> {
  if (!ENV.emailUser || !ENV.emailPassword) {
    console.warn("[Email] Email credentials not configured, skipping");
    return false;
  }

  console.log("[Email] provider=smtp");
  await transporter.sendMail({
    from: getEmailFrom(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
  return true;
}

/**
 * إرسال بريد إلكتروني
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (ENV.resendApiKey) {
      return await sendViaResend(options);
    }
    return await sendViaSmtp(options);
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * رسالة ترحيب عند الاشتراك الجديد
 */
export async function sendWelcomeEmail(
  email: string,
  restaurantName: string,
  planName: string,
  language: "ar" | "en" = "ar"
): Promise<boolean> {
  const isArabic = language === "ar";

  const subject = isArabic
    ? `مرحباً بك في mineuqr - ${restaurantName}`
    : `Welcome to mineuqr - ${restaurantName}`;

  const html = isArabic
    ? `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #00bcd4; margin-bottom: 20px;">مرحباً بك في mineuqr! 🎉</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            شكراً لاختيارك mineuqr لمطعمك <strong>${restaurantName}</strong>
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            لقد تم تفعيل اشتراكك في الخطة <strong>${planName}</strong> بنجاح!
          </p>
          
          <div style="background: #f0f9ff; padding: 20px; border-right: 4px solid #00bcd4; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #00bcd4; margin-top: 0;">الخطوات التالية:</h3>
            <ol style="color: #555; line-height: 1.8;">
              <li>قم بتخصيص منيو مطعمك (الأسعار، الأصناف، الصور)</li>
              <li>اختر قالب التصميم المفضل لديك</li>
              <li>قم بتحميل رمز QR وضعه في مطعمك</li>
              <li>شارك رمز QR مع عملائك!</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            إذا كان لديك أي أسئلة، لا تتردد في التواصل معنا عبر البريد الإلكتروني.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            فريق mineuqr
          </p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #00bcd4; margin-bottom: 20px;">Welcome to mineuqr! 🎉</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Thank you for choosing mineuqr for your restaurant <strong>${restaurantName}</strong>
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Your subscription to the <strong>${planName}</strong> plan has been activated successfully!
          </p>
          
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #00bcd4; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #00bcd4; margin-top: 0;">Next Steps:</h3>
            <ol style="color: #555; line-height: 1.8;">
              <li>Customize your menu (prices, items, images)</li>
              <li>Choose your preferred design template</li>
              <li>Download your QR code and place it in your restaurant</li>
              <li>Share the QR code with your customers!</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions, feel free to contact us via email.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            mineuqr Team
          </p>
        </div>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * تنبيه قبل انتهاء الاشتراك
 */
export async function sendRenewalReminder(
  email: string,
  restaurantName: string,
  daysLeft: number,
  planName: string,
  renewalDate: string,
  language: "ar" | "en" = "ar"
): Promise<boolean> {
  const isArabic = language === "ar";

  const subject = isArabic
    ? `تنبيه: اشتراكك ينتهي في ${daysLeft} أيام`
    : `Reminder: Your subscription expires in ${daysLeft} days`;

  const html = isArabic
    ? `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #ff9800; margin-bottom: 20px;">⏰ تنبيه تجديد الاشتراك</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            مرحباً بك في mineuqr,
          </p>
          
          <div style="background: #fff3e0; padding: 20px; border-right: 4px solid #ff9800; margin: 20px 0; border-radius: 4px;">
            <p style="font-size: 16px; color: #e65100; margin: 0; font-weight: bold;">
              اشتراكك في الخطة <strong>${planName}</strong> لمطعم <strong>${restaurantName}</strong> سينتهي في <strong>${daysLeft} أيام</strong>
            </p>
            <p style="font-size: 14px; color: #e65100; margin: 10px 0 0 0;">
              تاريخ الانتهاء: <strong>${renewalDate}</strong>
            </p>
          </div>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            لضمان عدم انقطاع خدمة mineuqr لمطعمك، يرجى تجديد اشتراكك قبل انتهاء الفترة الحالية.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            عند انتهاء الاشتراك، سيتم إيقاف mineuqr الخاص بك مؤقتاً حتى تقوم بالتجديد.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            فريق mineuqr
          </p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #ff9800; margin-bottom: 20px;">⏰ Subscription Renewal Reminder</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Hello,
          </p>
          
          <div style="background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0; border-radius: 4px;">
            <p style="font-size: 16px; color: #e65100; margin: 0; font-weight: bold;">
              Your subscription to the <strong>${planName}</strong> plan for <strong>${restaurantName}</strong> will expire in <strong>${daysLeft} days</strong>
            </p>
            <p style="font-size: 14px; color: #e65100; margin: 10px 0 0 0;">
              Expiration date: <strong>${renewalDate}</strong>
            </p>
          </div>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            To ensure uninterrupted service for your mineuqr, please renew your subscription before the current period ends.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            When your subscription expires, your mineuqr will be temporarily suspended until you renew.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            mineuqr Team
          </p>
        </div>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * رسالة تأكيد التجديد
 */
export async function sendRenewalConfirmation(
  email: string,
  restaurantName: string,
  planName: string,
  amount: number,
  newExpiryDate: string,
  currency: string = "SAR",
  language: "ar" | "en" = "ar"
): Promise<boolean> {
  const isArabic = language === "ar";

  const subject = isArabic
    ? `تم تجديد اشتراكك بنجاح - ${restaurantName}`
    : `Your subscription has been renewed - ${restaurantName}`;

  const html = isArabic
    ? `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #4caf50; margin-bottom: 20px;">✓ تم تجديد اشتراكك بنجاح!</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            شكراً لتجديدك اشتراكك في mineuqr!
          </p>
          
          <div style="background: #e8f5e9; padding: 20px; border-right: 4px solid #4caf50; margin: 20px 0; border-radius: 4px;">
            <p style="color: #2e7d32; margin: 0;">
              <strong>المطعم:</strong> ${restaurantName}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>الخطة:</strong> ${planName}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>المبلغ:</strong> ${amount} ${currency}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>تاريخ الانتهاء الجديد:</strong> ${newExpiryDate}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            mineuqr الخاص بك نشط ويعمل بشكل طبيعي. استمتع بخدمة mineuqr المتميزة!
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            فريق mineuqr
          </p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #4caf50; margin-bottom: 20px;">✓ Your subscription has been renewed!</h1>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Thank you for renewing your mineuqr subscription!
          </p>
          
          <div style="background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 4px;">
            <p style="color: #2e7d32; margin: 0;">
              <strong>Restaurant:</strong> ${restaurantName}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>Plan:</strong> ${planName}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>Amount:</strong> ${amount} ${currency}
            </p>
            <p style="color: #2e7d32; margin: 10px 0 0 0;">
              <strong>New Expiration Date:</strong> ${newExpiryDate}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Your mineuqr is active and working normally. Enjoy our premium mineuqr service!
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            mineuqr Team
          </p>
        </div>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
