import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const GOOGLE_COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#0F9D58"];

function layout(title, bodyHtml) {
  const bar = GOOGLE_COLORS.map(
    (color) => `<td style="height:4px;background:${color};width:25%"></td>`
  ).join("");
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr>${bar}</tr>
    <tr><td colspan="4" style="padding:28px 32px">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:13px;color:#6b7280">Google Developer Group on Campus · Miami Dade College</p>
    </td></tr>
  </table>
</body></html>`;
}

function detailsTable(rows) {
  const cells = rows
    .filter(([, value]) => value !== undefined && value !== "" && !(Array.isArray(value) && !value.length))
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
        <td style="padding:6px 0">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" style="font-size:14px;border-collapse:collapse">${cells}</table>`;
}

export async function sendMail({ to, subject, html, replyTo }) {
  if (!to) return { skipped: true };
  const transport = getTransporter();
  if (!transport) {
    if (!env.isTest) console.log(`📧 [email not sent — SMTP not configured] to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  return transport.sendMail({ from: env.EMAIL_FROM, to, subject, html, replyTo });
}

// Email failures should never fail the HTTP request — log and move on.
export function sendInBackground(promises) {
  Promise.allSettled(promises).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") console.error("Email delivery failed:", result.reason?.message);
    }
  });
}

export function memberEmails(member) {
  const welcome = {
    to: member.email,
    subject: "Welcome to GDG on Campus MDC! 🎉",
    html: layout(
      `Welcome, ${member.firstName}!`,
      `<p style="font-size:15px;line-height:1.6">Thanks for joining the Google Developer Group on Campus at Miami Dade College.
       You'll be the first to hear about upcoming workshops, study jams and networking events.</p>
       <p style="font-size:15px;line-height:1.6">Make sure to also join our chapter on
       <a href="${env.GDG_CHAPTER_URL}" style="color:#4285F4">gdg.community.dev</a> to RSVP for events.</p>`
    ),
  };
  const notify = {
    to: env.CLUB_NOTIFY_EMAIL,
    replyTo: member.email,
    subject: `New member: ${member.firstName} ${member.lastName}`,
    html: layout(
      "New member sign-up",
      detailsTable([
        ["Name", `${member.firstName} ${member.lastName}`],
        ["Email", member.email],
        ["Phone", member.phone],
        ["Major", member.major],
        ["Year", member.year],
        ["Interests", member.interests],
        ["Heard about us", member.hearAboutUs],
        ["Additional info", member.additionalInfo],
      ])
    ),
  };
  return [welcome, notify];
}

export function partnerEmails(partner) {
  const thanks = {
    to: partner.email,
    subject: "Thanks for your interest in partnering with GDG on Campus MDC",
    html: layout(
      `Thank you, ${partner.contactName}!`,
      `<p style="font-size:15px;line-height:1.6">We received your partnership inquiry for
       <strong>${escapeHtml(partner.companyName)}</strong> (${escapeHtml(partner.partnershipInterest)}).
       A member of our leadership team will reach out within a few business days.</p>`
    ),
  };
  const notify = {
    to: env.CLUB_NOTIFY_EMAIL,
    replyTo: partner.email,
    subject: `New partner inquiry: ${partner.companyName}`,
    html: layout(
      "New partnership inquiry",
      detailsTable([
        ["Company", partner.companyName],
        ["Contact", partner.contactName],
        ["Email", partner.email],
        ["Phone", partner.phone],
        ["Website", partner.website],
        ["Address", `${partner.streetAddress}, ${partner.city}, ${partner.state} ${partner.zip}`],
        ["Interest", partner.partnershipInterest],
        ["Message", partner.message],
      ])
    ),
  };
  return [thanks, notify];
}
