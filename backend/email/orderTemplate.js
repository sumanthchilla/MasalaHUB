import { formatCurrency, getLineTotal } from "../../shared/pricing.js";
import {
  getHandoffPreferenceLabel,
  getScheduleTypeLabel,
  getSpicePreferenceLabel,
} from "../../shared/fulfillment.js";
import { getDeliveryZoneLabel } from "../../shared/deliveryZones.js";
import { getPaymentStatusLabel } from "../../shared/paymentStatus.js";

export const brandLogoCid = "masala-hub-brand-logo";
export const getItemImageCid = (item) => `masala-hub-${item.cartKey || item.id}`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderItemsHtml = (items) =>
  items
    .map(
      (item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td width="82" valign="top">
                  <img
                    src="cid:${escapeHtml(getItemImageCid(item))}"
                    alt="${escapeHtml(item.name)}"
                    width="72"
                    height="72"
                    style="display:block;width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid #eee;"
                  />
                </td>
                <td valign="top" style="padding-left:12px;">
                  <strong style="display:block;color:#23201d;font-size:15px;">${escapeHtml(item.name)}</strong>
                  <span style="display:block;color:#777;margin-top:4px;">Qty: ${escapeHtml(item.quantity)}</span>
                  <span style="display:block;color:#777;margin-top:4px;">Item price: ${escapeHtml(formatCurrency(item.price))}</span>
                </td>
                <td align="right" valign="top" style="font-weight:800;color:#23201d;white-space:nowrap;">
                  ${escapeHtml(formatCurrency(getLineTotal(item)))}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    )
    .join("");

const renderItemsText = (items) =>
  items
    .map(
      (item) =>
        `${item.name} - Qty ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(getLineTotal(item))}`
    )
    .join("\n");

const getPaymentSummary = (payment = {}) =>
  payment.displayName || payment.label || "Payment selected";

export function renderOrderConfirmationEmail(order) {
  const subject = `Masala HUB bill - ${order.orderId}`;
  const address = escapeHtml(order.customer.address);
  const paymentSummary = escapeHtml(getPaymentSummary(order.payment));
  const paymentStatus = escapeHtml(getPaymentStatusLabel(order.payment?.status));
  const paymentReference = order.payment?.reference
    ? escapeHtml(order.payment.reference)
    : "";
  const scheduleLabel = escapeHtml(getScheduleTypeLabel(order.fulfillment?.scheduleType));
  const deliveryZoneLabel = escapeHtml(getDeliveryZoneLabel(order.fulfillment?.deliveryZone));
  const spiceLabel = escapeHtml(getSpicePreferenceLabel(order.fulfillment?.spicePreference));
  const handoffLabel = escapeHtml(getHandoffPreferenceLabel(order.fulfillment?.handoffPreference));
  const deliveryNotes = order.fulfillment?.deliveryNotes
    ? escapeHtml(order.fulfillment.deliveryNotes)
    : "";

  const html = `
    <div style="margin:0;background:#fff7ef;padding:24px;font-family:Arial,sans-serif;color:#23201d;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eadfce;border-radius:12px;overflow:hidden;">
        <div style="background:#173f35;color:#fff;padding:26px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td width="78" valign="top">
                <img
                  src="cid:${brandLogoCid}"
                  alt="Masala HUB"
                  width="64"
                  height="64"
                  style="display:block;width:64px;height:64px;border-radius:16px;border:1px solid rgba(255,255,255,0.22);"
                />
              </td>
              <td valign="middle" style="padding-left:14px;">
                <p style="margin:0 0 8px;color:#ffd36a;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Order confirmed</p>
                <h1 style="margin:0;font-size:30px;line-height:1.1;">Masala HUB bill</h1>
                <p style="margin:12px 0 0;color:#f6eadc;">Thanks, ${escapeHtml(order.customer.name)}. Your food is being prepared.</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:24px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fffaf5;border:1px solid #f0e4d8;border-radius:10px;">
            <tr>
              <td style="padding:14px;color:#777;">Order ID</td>
              <td align="right" style="padding:14px;font-weight:800;">${escapeHtml(order.orderId)}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Estimated delivery</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${escapeHtml(order.estimatedDeliveryTime)}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Delivery address</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${address}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Delivery timing</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${scheduleLabel}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Delivery zone</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${deliveryZoneLabel}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Food preference</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${spiceLabel}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Delivery handoff</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${handoffLabel}</td>
            </tr>
            ${
              deliveryNotes
                ? `<tr>
              <td style="padding:0 14px 14px;color:#777;">Delivery notes</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${deliveryNotes}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Payment method</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${paymentSummary}</td>
            </tr>
            <tr>
              <td style="padding:0 14px 14px;color:#777;">Payment status</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${paymentStatus}</td>
            </tr>
            ${
              paymentReference
                ? `<tr>
              <td style="padding:0 14px 14px;color:#777;">Payment reference</td>
              <td align="right" style="padding:0 14px 14px;font-weight:800;">${paymentReference}</td>
            </tr>`
                : ""
            }
          </table>

          <h2 style="margin:24px 0 10px;font-size:20px;color:#23201d;">Purchased items</h2>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${renderItemsHtml(order.items)}
          </table>

          <h2 style="margin:24px 0 10px;font-size:20px;color:#23201d;">Bill summary</h2>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fffaf5;border:1px solid #f0e4d8;border-radius:10px;">
            <tr>
              <td style="padding:14px 14px 6px;color:#777;">Subtotal</td>
              <td align="right" style="padding:14px 14px 6px;">${escapeHtml(formatCurrency(order.totals.subtotal))}</td>
            </tr>
            <tr>
              <td style="padding:6px 14px;color:#777;">Delivery fee</td>
              <td align="right" style="padding:6px 14px;">${order.totals.deliveryFee === 0 ? "Free" : escapeHtml(formatCurrency(order.totals.deliveryFee))}</td>
            </tr>
            <tr>
              <td style="padding:6px 14px;color:#777;">Tax / GST</td>
              <td align="right" style="padding:6px 14px;">${escapeHtml(formatCurrency(order.totals.tax))}</td>
            </tr>
            <tr>
              <td style="padding:6px 14px;color:#15803d;">Discount</td>
              <td align="right" style="padding:6px 14px;color:#15803d;">-${escapeHtml(formatCurrency(order.totals.discount))}</td>
            </tr>
            <tr>
              <td style="padding:14px;font-size:18px;font-weight:800;border-top:1px solid #eadfce;">Total purchase</td>
              <td align="right" style="padding:14px;font-size:24px;font-weight:900;color:#ff6b35;border-top:1px solid #eadfce;">
                ${escapeHtml(formatCurrency(order.totals.total))}
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Masala HUB bill - ${order.orderId}`,
    "",
    `Name: ${order.customer.name}`,
    `Estimated delivery: ${order.estimatedDeliveryTime}`,
    `Delivery address: ${order.customer.address}`,
    `Delivery timing: ${getScheduleTypeLabel(order.fulfillment?.scheduleType)}`,
    `Delivery zone: ${getDeliveryZoneLabel(order.fulfillment?.deliveryZone)}`,
    `Food preference: ${getSpicePreferenceLabel(order.fulfillment?.spicePreference)}`,
    `Delivery handoff: ${getHandoffPreferenceLabel(order.fulfillment?.handoffPreference)}`,
    order.fulfillment?.deliveryNotes ? `Delivery notes: ${order.fulfillment.deliveryNotes}` : "",
    `Payment method: ${getPaymentSummary(order.payment)}`,
    `Payment status: ${getPaymentStatusLabel(order.payment?.status)}`,
    order.payment?.reference ? `Payment reference: ${order.payment.reference}` : "",
    "",
    "Purchased items:",
    renderItemsText(order.items),
    "",
    `Subtotal: ${formatCurrency(order.totals.subtotal)}`,
    `Delivery fee: ${order.totals.deliveryFee === 0 ? "Free" : formatCurrency(order.totals.deliveryFee)}`,
    `Tax / GST: ${formatCurrency(order.totals.tax)}`,
    `Discount: -${formatCurrency(order.totals.discount)}`,
    `Total purchase: ${formatCurrency(order.totals.total)}`,
  ].join("\n");

  return { subject, html, text };
}
