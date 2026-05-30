import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  brandLogoCid,
  getItemImageCid,
  renderOrderConfirmationEmail,
} from "./orderTemplate.js";
import { getOrderStatus } from "../../shared/orderStatus.js";
import { getPaymentStatus } from "../../shared/paymentStatus.js";
import { getDeliveryZoneLabel } from "../../shared/deliveryZones.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const frontendPublicPath = path.join(projectRoot, "frontend", "public");

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
const hasGmailConfig = Boolean(gmailUser && gmailAppPassword);
const hasSmtpConfig = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_HOST !== "smtp.example.com"
);
const emailFrom = process.env.EMAIL_FROM || (gmailUser ? `Masala HUB <${gmailUser}>` : "Masala HUB <orders@masalahub.local>");

export const getEmailStatus = () => ({
  mode: hasGmailConfig ? "gmail" : hasSmtpConfig ? "smtp" : "preview",
  sendingEnabled: hasGmailConfig || hasSmtpConfig,
  gmailUserConfigured: Boolean(gmailUser),
  gmailAppPasswordConfigured: Boolean(gmailAppPassword),
  smtpConfigured: hasSmtpConfig,
  fromConfigured: Boolean(process.env.EMAIL_FROM),
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const createTransport = () => {
  if (hasGmailConfig) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  if (hasSmtpConfig) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

const getBrandLogoAttachment = () => {
  const logoPath = path.join(frontendPublicPath, "masala-hub-logo-email.png");

  if (!fs.existsSync(logoPath)) {
    return null;
  }

  return {
    filename: "masala-hub-logo-email.png",
    path: logoPath,
    cid: brandLogoCid,
    contentDisposition: "inline",
    contentType: "image/png",
  };
};

const getFoodImageAttachments = (items) =>
  items
    .map((item) => {
      const relativeImagePath = String(item.image || "").replace(/^\/+/, "");
      const imagePath = path.join(frontendPublicPath, relativeImagePath);

      if (!relativeImagePath || !fs.existsSync(imagePath)) {
        return null;
      }

      return {
        filename: path.basename(imagePath),
        path: imagePath,
        cid: getItemImageCid(item),
        contentDisposition: "inline",
      };
    })
    .filter(Boolean);

export async function sendOrderConfirmationEmail(order) {
  const template = renderOrderConfirmationEmail(order);
  const transporter = createTransport();

  const info = await transporter.sendMail({
    from: emailFrom,
    to: order.customer.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [getBrandLogoAttachment(), ...getFoodImageAttachments(order.items)].filter(Boolean),
  });

  const sentForReal = hasGmailConfig || hasSmtpConfig;

  if (!sentForReal) {
    console.log(
      "Email preview only (JSON transport). Set GMAIL_USER and GMAIL_APP_PASSWORD in .env to send real receipts."
    );
  }

  return {
    ...info,
    sentForReal,
  };
}

export async function sendOrderStatusUpdateEmail(order) {
  const transporter = createTransport();
  const status = getOrderStatus(order.status);
  const paymentStatus = getPaymentStatus(order.payment?.status);
  const deliveryZone = getDeliveryZoneLabel(order.fulfillment?.deliveryZone);
  const subject = `Masala HUB update - ${order.orderId} is ${status.label}`;
  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 620px; margin: 0 auto; padding: 22px; border: 1px solid #eadfce; border-radius: 14px; background: #fffdf8; color: #23201d;">
      <h2 style="margin: 0 0 8px; color: #ff6b35;">Order status updated</h2>
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(order.customer.name)}, your Masala HUB order has a new update.</p>
      <div style="background: #fff4ef; border: 1px solid #f2c7b2; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 800; color: #a44618; text-transform: uppercase;">${escapeHtml(order.orderId)}</p>
        <strong style="display:block; font-size: 28px; color: #191714;">${escapeHtml(status.label)}</strong>
        <p style="margin: 8px 0 0; color: #594f47;">${escapeHtml(status.detail)}</p>
      </div>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #687078;">Estimated delivery</td><td align="right" style="padding: 8px 0; font-weight: 800;">${escapeHtml(order.estimatedDeliveryTime)}</td></tr>
        <tr><td style="padding: 8px 0; color: #687078;">Delivery zone</td><td align="right" style="padding: 8px 0; font-weight: 800;">${escapeHtml(deliveryZone)}</td></tr>
        <tr><td style="padding: 8px 0; color: #687078;">Payment</td><td align="right" style="padding: 8px 0; font-weight: 800;">${escapeHtml(paymentStatus.label)}</td></tr>
      </table>
      <p style="margin: 18px 0 0; color: #687078; font-size: 13px;">Thank you for ordering from Masala HUB.</p>
    </div>
  `;
  const text = [
    `Hi ${order.customer.name},`,
    `Your Masala HUB order ${order.orderId} is now ${status.label}.`,
    status.detail,
    `Estimated delivery: ${order.estimatedDeliveryTime}`,
    `Delivery zone: ${deliveryZone}`,
    `Payment: ${paymentStatus.label}`,
  ].join("\n");

  const info = await transporter.sendMail({
    from: emailFrom,
    to: order.customer.email,
    subject,
    html,
    text,
    attachments: [getBrandLogoAttachment()].filter(Boolean),
  });

  return {
    ...info,
    sentForReal: hasGmailConfig || hasSmtpConfig,
  };
}

export async function sendForgotPasswordEmail(email, name, otp) {
  const transporter = createTransport();

  const subject = "Reset your Masala HUB password";
  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eadfce; border-radius: 16px; background-color: #fffdf8;">
      <h2 style="color: #ff6b35; margin-bottom: 20px; text-align: center;">Masala HUB Password Reset</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your Masala HUB password. Please use the following 6-digit verification code to reset your password:</p>
      <div style="background-color: #f3ebe0; border: 1px solid #eadfce; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #23201d; margin: 24px 0; font-family: monospace;">
        ${otp}
      </div>
      <p style="color: #687078; font-size: 14px; line-height: 1.5;">This code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eadfce; margin: 24px 0;" />
      <p style="color: #a39b92; font-size: 12px; text-align: center; margin: 0;">Masala HUB Kitchen - Online delivery - Fresh food daily</p>
    </div>
  `;
  const text = `Hello ${name},\n\nWe received a request to reset your Masala HUB password. Please use the following 6-digit verification code to reset your password:\n\n${otp}\n\nThis code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.\n\nMasala HUB Kitchen`;

  const info = await transporter.sendMail({
    from: emailFrom,
    to: email,
    subject,
    html,
    text,
  });

  const sentForReal = hasGmailConfig || hasSmtpConfig;

  if (!sentForReal) {
    console.log(
      "Forgot Password Email Preview only (JSON transport). Verification code: ",
      otp
    );
  }

  return {
    ...info,
    sentForReal,
  };
}
