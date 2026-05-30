import { calculateOrderTotals } from "../../shared/pricing.js";
import { normalizeDeliveryZone } from "../../shared/deliveryZones.js";
import {
  normalizeHandoffPreference,
  normalizeScheduleType,
  normalizeSpicePreference,
} from "../../shared/fulfillment.js";
import {
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePersonName,
  validatePhone,
} from "../../shared/validation.js";
import { getMenuItemByCartKey } from "../db/mysql.js";

const createOrderId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FD-${datePart}-${randomPart}`;
};

const normalizeQuantity = (quantity) => {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 25) return null;
  return parsed;
};

const formatDeliveryEstimate = (date, { includeDate = false } = {}) =>
  new Intl.DateTimeFormat("en-IN", {
    ...(includeDate ? { dateStyle: "medium" } : {}),
    timeStyle: "short",
  }).format(date);

const sanitizeCustomer = (customer = {}) => {
  const sanitized = {
    name: String(customer.name || "").trim(),
    email: normalizeEmail(customer.email),
    phone: String(customer.phone || "").trim(),
    address: String(customer.address || "").trim(),
  };
  const nameValidation = validatePersonName(sanitized.name, "Customer name");
  const emailValidation = validateEmail(sanitized.email);
  const phoneValidation = validatePhone(sanitized.phone, { required: true });

  if (!nameValidation.valid) throw new Error(nameValidation.message);
  if (!emailValidation.valid) throw new Error(emailValidation.message);
  if (!phoneValidation.valid) throw new Error(phoneValidation.message);
  if (sanitized.address.length < 10) throw new Error("Delivery address is too short.");

  return {
    ...sanitized,
    phone: normalizePhone(sanitized.phone),
  };
};

const sanitizeFulfillment = (fulfillment = {}) => {
  const scheduleType = normalizeScheduleType(fulfillment.scheduleType);
  const spicePreference = normalizeSpicePreference(fulfillment.spicePreference);
  const handoffPreference = normalizeHandoffPreference(fulfillment.handoffPreference);
  const deliveryZone = normalizeDeliveryZone(fulfillment.deliveryZone);
  const deliveryNotes = String(fulfillment.deliveryNotes || "")
    .trim()
    .replace(/\s+/g, " ");
  let scheduledFor = null;

  if (deliveryNotes.length > 240) {
    throw new Error("Delivery notes must be 240 characters or fewer.");
  }

  if (scheduleType === "scheduled") {
    const scheduledDate = new Date(fulfillment.scheduledFor);
    const minDate = new Date(Date.now() + 20 * 60 * 1000);
    const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(scheduledDate.getTime())) {
      throw new Error("Choose a valid scheduled delivery time.");
    }

    if (scheduledDate < minDate) {
      throw new Error("Schedule delivery at least 20 minutes from now.");
    }

    if (scheduledDate > maxDate) {
      throw new Error("Schedule delivery within the next 7 days.");
    }

    scheduledFor = scheduledDate.toISOString();
  }

  return {
    scheduleType,
    scheduledFor,
    deliveryZone,
    deliveryNotes,
    spicePreference,
    handoffPreference,
  };
};

const paymentLabels = {
  bank_transfer: "Bank transfer",
  upi: "UPI QR",
  cash_on_delivery: "Cash on delivery",
  netbanking: "Netbanking",
  card: "Credit card",
};

const supportedBanks = new Set([
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Punjab National Bank",
]);

const getEnvPaymentValue = (name) =>
  String(process.env[name] || process.env[`VITE_${name}`] || "").trim();

const getManualPaymentConfig = () => ({
  accountName: getEnvPaymentValue("PAYMENT_ACCOUNT_NAME"),
  bankName: getEnvPaymentValue("PAYMENT_BANK_NAME"),
  accountNumber: getEnvPaymentValue("PAYMENT_ACCOUNT_NUMBER"),
  ifsc: getEnvPaymentValue("PAYMENT_IFSC").toUpperCase(),
  upiId: getEnvPaymentValue("PAYMENT_UPI_ID"),
});

const rejectGatewayPayment = () => {
  throw new Error("Credit card and netbanking need a payment gateway setup first.");
};

const sanitizePaymentReference = (reference) =>
  String(reference || "")
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .slice(0, 80);

const getAccountLast4 = (accountNumber) =>
  String(accountNumber || "").replace(/\D/g, "").slice(-4);

const assertPaymentAmountMatches = (payment, totals) => {
  const amount = Number(payment.amount);

  if (Number.isFinite(amount) && Math.abs(amount - totals.total) > 0.01) {
    throw new Error("Payment amount does not match the order total.");
  }
};

const sanitizePayment = (payment = {}, totals) => {
  const method = String(payment.method || "upi").trim().toLowerCase();
  const reference = sanitizePaymentReference(payment.reference);
  const orderReference = sanitizePaymentReference(payment.orderReference);

  if (!paymentLabels[method]) {
    throw new Error("Choose a valid payment method.");
  }

  assertPaymentAmountMatches(payment, totals);

  if (method === "cash_on_delivery") {
    return {
      method,
      label: paymentLabels[method],
      reference: "",
      orderReference,
      displayName: "Cash on delivery",
      status: "due_on_delivery",
    };
  }

  if (method === "bank_transfer") {
    const paymentConfig = getManualPaymentConfig();

    if (
      !paymentConfig.accountName ||
      !paymentConfig.bankName ||
      !paymentConfig.accountNumber ||
      !paymentConfig.ifsc
    ) {
      throw new Error("Bank payment details are not configured.");
    }

    if (reference.length < 6) {
      throw new Error("Enter a valid bank UTR or transaction ID.");
    }

    return {
      method,
      label: paymentLabels[method],
      reference,
      orderReference,
      accountName: paymentConfig.accountName,
      bankName: paymentConfig.bankName,
      accountLast4: getAccountLast4(paymentConfig.accountNumber),
      ifsc: paymentConfig.ifsc,
      displayName: `${paymentConfig.bankName} bank transfer`,
      status: "pending",
    };
  }

  if (method === "upi") {
    const paymentConfig = getManualPaymentConfig();

    if (!paymentConfig.upiId) {
      throw new Error("UPI payment details are not configured.");
    }

    if (reference.length < 6) {
      throw new Error("Enter a valid UPI reference or UTR.");
    }

    return {
      method,
      label: "UPI transfer",
      reference,
      orderReference,
      upiId: paymentConfig.upiId,
      displayName: `UPI transfer - ${paymentConfig.upiId}`,
      status: "pending",
    };
  }

  if (method === "netbanking") {
    rejectGatewayPayment();

    const bank = String(payment.bank || "").trim();

    if (!supportedBanks.has(bank)) {
      throw new Error("Choose a valid netbanking bank.");
    }

    return {
      method,
      label: paymentLabels[method],
      bank,
      reference,
      displayName: `${bank} netbanking`,
      status: "Bank authorization selected",
    };
  }

  if (method === "card") {
    rejectGatewayPayment();

    const cardLast4 = String(payment.cardLast4 || "").replace(/\D/g, "").slice(-4);
    const cardNetwork = ["Visa", "Mastercard", "RuPay", "Card"].includes(
      payment.cardNetwork
    )
      ? payment.cardNetwork
      : "Card";

    if (cardLast4.length !== 4) {
      throw new Error("Enter valid credit card details.");
    }

    return {
      method,
      label: paymentLabels[method],
      cardLast4,
      cardNetwork,
      reference,
      displayName: `${cardNetwork} ending ${cardLast4}`,
      status: "Card details verified",
    };
  }

  return {
    method,
    label: paymentLabels[method],
    upiId: "masalahub@bank",
    reference,
    displayName: "UPI QR - masalahub@bank",
    status: "UPI payment selected",
  };
};

export async function buildOrderFromPayload(payload) {
  const incomingItems = Array.isArray(payload.items) ? payload.items : [];

  if (!incomingItems.length) {
    throw new Error("Cart is empty.");
  }

  // Rehydrate item name and price from the server-side catalog so users cannot tamper with totals.
  const items = await Promise.all(incomingItems.map(async (item) => {
    const menuItem = await getMenuItemByCartKey(item.cartKey || item.id);
    const quantity = normalizeQuantity(item.quantity);

    if (!menuItem) {
      throw new Error("One or more cart items are no longer available.");
    }

    if (menuItem.available === false) {
      throw new Error(`${menuItem.name} is currently unavailable.`);
    }

    if (!quantity) {
      throw new Error("Invalid item quantity.");
    }

    return {
      ...menuItem,
      quantity,
    };
  }));

  const fulfillment = sanitizeFulfillment(payload.fulfillment);
  const totals = calculateOrderTotals(items, payload.couponCode, fulfillment.deliveryZone);

  if (payload.couponCode && !totals.couponValidation?.valid) {
    throw new Error(totals.couponValidation?.reason || "Coupon is not valid.");
  }

  const now = new Date();
  const estimatedDelivery = fulfillment.scheduledFor
    ? new Date(fulfillment.scheduledFor)
    : new Date(now.getTime() + 35 * 60 * 1000);

  return {
    orderId: createOrderId(),
    createdAt: now.toISOString(),
    estimatedDeliveryTime: formatDeliveryEstimate(estimatedDelivery, {
      includeDate: Boolean(fulfillment.scheduledFor),
    }),
    customer: sanitizeCustomer(payload.customer),
    fulfillment,
    payment: sanitizePayment(payload.payment, totals),
    items,
    totals,
  };
}
