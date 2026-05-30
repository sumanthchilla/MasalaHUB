export const paymentStatusOptions = [
  {
    value: "pending",
    label: "Pending verification",
    detail: "Payment reference was received and needs manual confirmation.",
    tone: "warning",
  },
  {
    value: "verified",
    label: "Verified",
    detail: "Payment has been checked and approved.",
    tone: "success",
  },
  {
    value: "failed",
    label: "Failed",
    detail: "Payment could not be verified.",
    tone: "danger",
  },
  {
    value: "refunded",
    label: "Refunded",
    detail: "Payment was returned to the customer.",
    tone: "info",
  },
  {
    value: "due_on_delivery",
    label: "Due on delivery",
    detail: "Customer will pay when the order arrives.",
    tone: "new",
  },
];

const legacyPaymentStatusMap = new Map([
  ["awaiting upi verification", "pending"],
  ["awaiting bank verification", "pending"],
  ["payment due on delivery", "due_on_delivery"],
  ["payment selected", "pending"],
]);

export const defaultPaymentStatus = "pending";

export const paymentStatusValues = paymentStatusOptions.map((status) => status.value);

export const normalizePaymentStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  const legacyValue = legacyPaymentStatusMap.get(value);

  if (legacyValue) return legacyValue;

  return paymentStatusValues.includes(value) ? value : defaultPaymentStatus;
};

export const isValidPaymentStatus = (status) =>
  paymentStatusValues.includes(String(status || "").trim().toLowerCase());

export const getPaymentStatus = (status) =>
  paymentStatusOptions.find(
    (option) => option.value === normalizePaymentStatus(status)
  ) || paymentStatusOptions[0];

export const getPaymentStatusLabel = (status) => getPaymentStatus(status).label;
