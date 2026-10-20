import "server-only";
import { Resend } from "resend";
import { SITE } from "@/lib/constants";
import { formatNPR } from "@/lib/money";
import { formatDateLong, formatDateTime } from "@/lib/utils";

type MailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const from = process.env.EMAIL_FROM ?? "Purple Haze <onboarding@resend.dev>";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@example.com";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandEmail({
  title,
  preheader,
  content,
}: {
  title: string;
  preheader: string;
  content: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#faf8ff;font-family:Inter,Arial,sans-serif;color:#1a1025;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8ff;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5dcf6;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:#1a1025;padding:28px 32px;">
              <p style="margin:0;color:#f5b942;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;">Purple Haze Restro &amp; Garden</p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-family:Georgia,serif;font-size:28px;line-height:1.2;font-weight:600;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr><td style="padding:32px;">${content}</td></tr>
          <tr>
            <td style="padding:22px 32px;background:#f3effc;color:#655c72;font-size:12px;line-height:1.7;">
              ${escapeHtml(SITE.address.line1)}, ${escapeHtml(SITE.address.line2)}<br />
              ${escapeHtml(SITE.phone)} · ${escapeHtml(SITE.email)}<br />
              <a href="${SITE.url}" style="color:#5b21b6;">${escapeHtml(SITE.url)}</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:#5b21b6;">
    <a href="${href}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export async function sendEmail(input: MailInput) {
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      // Local development convenience only. Never log reset/verification
      // bodies or recipient PII from a production server.
      console.info("[email:development]", {
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
    } else {
      console.error(
        "[email] RESEND_API_KEY is not configured; message was not sent.",
      );
    }
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) {
      console.error("Resend email failed", error);
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (error) {
    console.error("Email failed", error);
    return { sent: false, reason: "Unexpected email error" };
  }
}

export async function sendVerificationEmail(email: string, url: string) {
  return sendEmail({
    to: email,
    subject: "Confirm your Purple Haze email",
    html: brandEmail({
      title: "One quick hello",
      preheader: "Confirm your email to finish creating your account.",
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Welcome to Purple Haze. Please confirm your email address so we can keep your account and orders secure.</p>
        ${button(url, "Confirm my email")}
        <p style="margin:0;color:#655c72;font-size:13px;line-height:1.7;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>`,
    }),
    text: `Confirm your Purple Haze email: ${url}`,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  return sendEmail({
    to: email,
    subject: "Reset your Purple Haze password",
    html: brandEmail({
      title: "Let’s get you back in",
      preheader: "A password reset link is waiting for you.",
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">We received a request to reset your password. Choose a new one using the button below.</p>
        ${button(url, "Reset my password")}
        <p style="margin:0;color:#655c72;font-size:13px;line-height:1.7;">This link expires in one hour. If you did not request a reset, no action is needed.</p>`,
    }),
    text: `Reset your Purple Haze password: ${url}`,
  });
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  type: string;
  total: number;
  status: string;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
  deliveryAddress?: string | null;
  scheduledFor?: Date | null;
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  const itemRows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee7fb;">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee7fb;text-align:right;">${formatNPR(item.lineTotal)}</td></tr>`,
    )
    .join("");

  return sendEmail({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} received — Purple Haze`,
    html: brandEmail({
      title: "Your table is in motion",
      preheader: `We have received order ${order.orderNumber}.`,
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(order.customerName)}, thank you for choosing Purple Haze. Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been received.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;font-size:14px;">${itemRows}
          <tr><td style="padding:12px 0;font-weight:700;">Total</td><td style="padding:12px 0;font-weight:700;text-align:right;">${formatNPR(order.total)}</td></tr>
        </table>
        <p style="margin:0;font-size:14px;line-height:1.7;"><strong>Type:</strong> ${escapeHtml(order.type.replace("_", "-").toLowerCase())}<br />
        ${order.deliveryAddress ? `<strong>Delivery:</strong> ${escapeHtml(order.deliveryAddress)}<br />` : ""}
        ${order.scheduledFor ? `<strong>Requested time:</strong> ${formatDateTime(order.scheduledFor)}<br />` : ""}
        <strong>Status:</strong> ${escapeHtml(order.status.replaceAll("_", " ").toLowerCase())}</p>
        ${button(`${SITE.url}/track?order=${encodeURIComponent(order.orderNumber)}`, "Track my order")}
        <p style="margin:0;color:#655c72;font-size:13px;line-height:1.7;">You can track this order with your order number and phone number. Questions? Call ${escapeHtml(SITE.phone)}.</p>`,
    }),
    text: `Order ${order.orderNumber} received. Total ${formatNPR(order.total)}. Track: ${SITE.url}/track?order=${order.orderNumber}`,
  });
}

export async function sendOrderStatusEmail(
  order: Pick<
    OrderEmailData,
    "orderNumber" | "customerName" | "customerEmail" | "status" | "total"
  >,
  note?: string,
) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} is ${order.status.replaceAll("_", " ").toLowerCase()}`,
    html: brandEmail({
      title: "A little update",
      preheader: `Order ${order.orderNumber} is now ${order.status.replaceAll("_", " ").toLowerCase()}.`,
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(order.customerName)}, your order <strong>${escapeHtml(order.orderNumber)}</strong> is now <strong>${escapeHtml(order.status.replaceAll("_", " ").toLowerCase())}</strong>.</p>
        ${note ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.7;">${escapeHtml(note)}</p>` : ""}
        ${button(`${SITE.url}/track?order=${encodeURIComponent(order.orderNumber)}`, "View order status")}`,
    }),
    text: `Order ${order.orderNumber} is now ${order.status}.`,
  });
}

export async function sendAdminNotification(
  subject: string,
  content: string,
  replyTo?: string,
) {
  return sendEmail({
    to: adminEmail,
    subject,
    replyTo,
    html: brandEmail({
      title: subject,
      preheader: subject,
      content,
    }),
    text: content.replace(/<[^>]+>/g, " "),
  });
}

export async function sendContactAutoReply(name: string, email: string) {
  return sendEmail({
    to: email,
    subject: "We received your message — Purple Haze",
    html: brandEmail({
      title: "Thank you for writing",
      preheader: "Our team will get back to you soon.",
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(name)}, thank you for reaching out to Purple Haze Restro &amp; Garden. Our team will reply as soon as we can during opening hours.</p>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;">For urgent bookings, call ${escapeHtml(SITE.phone)}.</p>`,
    }),
    text: `Thank you for contacting Purple Haze. We will reply soon. Call ${SITE.phone} for urgent requests.`,
  });
}

export async function sendReservationConfirmation(data: {
  name: string;
  email: string;
  date: Date;
  guests: number;
  status: string;
}) {
  return sendEmail({
    to: data.email,
    subject: "Your table request at Purple Haze",
    html: brandEmail({
      title: "We have your table request",
      preheader: "Our team will confirm your reservation shortly.",
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data.name)}, thank you for requesting a table for ${data.guests} on <strong>${formatDateTime(data.date)}</strong>.</p>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;">Your request is currently <strong>${escapeHtml(data.status.toLowerCase())}</strong>. We will contact you to confirm. For changes, call ${escapeHtml(SITE.phone)}.</p>`,
    }),
    text: `Reservation request received for ${formatDateTime(data.date)}. Status: ${data.status}.`,
  });
}

export async function sendEventBookingConfirmation(data: {
  name: string;
  email: string;
  eventDate: Date;
  guests: number;
  eventType: string;
  status: string;
}) {
  return sendEmail({
    to: data.email,
    subject: "Your event enquiry at Purple Haze",
    html: brandEmail({
      title: "Let’s make it memorable",
      preheader: "Our events team will be in touch.",
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data.name)}, thank you for thinking of Purple Haze for your ${escapeHtml(data.eventType.toLowerCase())}.</p>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;">We have noted <strong>${data.guests} guests</strong> on <strong>${formatDateTime(data.eventDate)}</strong>. Your enquiry is <strong>${escapeHtml(data.status.toLowerCase())}</strong>. Our team will contact you to discuss availability and a tailored package.</p>`,
    }),
    text: `Event enquiry received for ${formatDateTime(data.eventDate)}.`,
  });
}

export async function sendBookingStatusEmail(data: {
  kind: "reservation" | "event";
  name: string;
  email: string;
  status: string;
  date: Date;
  guests: number;
  reference?: string;
  venue?: string | null;
  notes?: string | null;
}) {
  const label =
    data.kind === "reservation" ? "table reservation" : "event enquiry";
  return sendEmail({
    to: data.email,
    subject: `Your ${label} is ${data.status.toLowerCase()} — Purple Haze`,
    html: brandEmail({
      title:
        data.status === "CONFIRMED"
          ? "You’re on the list"
          : data.status === "CANCELLED"
            ? "An update on your booking"
            : "A booking update",
      preheader: `Your ${label} is now ${data.status.toLowerCase()}.`,
      content: `<p style="margin:0;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data.name)}, your ${label} with Purple Haze is now <strong>${escapeHtml(data.status.toLowerCase())}</strong>.</p>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;"><strong>Date:</strong> ${formatDateLong(data.date)}<br /><strong>Guests:</strong> ${data.guests}${data.venue ? `<br /><strong>Venue:</strong> ${escapeHtml(data.venue)}` : ""}${data.reference ? `<br /><strong>Reference:</strong> ${escapeHtml(data.reference)}` : ""}</p>
        ${data.notes ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.7;">${escapeHtml(data.notes)}</p>` : ""}
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;">If you need to make a change, please call ${escapeHtml(SITE.phone)} and speak to our team.</p>
        ${button(`${SITE.url}/account/bookings`, "View my bookings")}`,
    }),
    text: `Your ${label} is now ${data.status}. Date: ${formatDateLong(data.date)}. Guests: ${data.guests}.`,
  });
}

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  return sendAdminNotification(
    `New website message: ${data.subject}`,
    `<p style="font-size:14px;line-height:1.7;"><strong>${escapeHtml(data.name)}</strong> &lt;${escapeHtml(data.email)}&gt;${data.phone ? ` · ${escapeHtml(data.phone)}` : ""}</p><p style="font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</p>`,
    data.email,
  );
}
