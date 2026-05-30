import { getDeliveryZone, getDeliveryZoneFee } from "./deliveryZones.js";

export const TAX_RATE = 0.05;
export const DELIVERY_FEE = 40;
export const FREE_DELIVERY_THRESHOLD = 499;

export const coupons = [
  {
    code: "MASALA10",
    type: "percentage",
    value: 10,
    minOrderAmount: 199,
    expiresAt: "2027-12-31T23:59:59.999Z",
    description: "10% off on orders above Rs 199",
  },
  {
    code: "SAVE75",
    type: "flat",
    value: 75,
    minOrderAmount: 499,
    expiresAt: "2027-12-31T23:59:59.999Z",
    description: "Rs 75 off on orders above Rs 499",
  },
  {
    code: "SWEET50",
    type: "flat",
    value: 50,
    minOrderAmount: 299,
    expiresAt: "2027-12-31T23:59:59.999Z",
    description: "Rs 50 off when dessert is on the table",
  },
];

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const formatCurrency = (value) => `Rs ${roundMoney(value).toFixed(2)}`;

export const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

export const getLineTotal = (item) =>
  roundMoney((Number(item.price) || 0) * (Number(item.quantity) || 0));

export const calculateSubtotal = (items) =>
  roundMoney(items.reduce((total, item) => total + getLineTotal(item), 0));

export function validateCoupon(code, subtotal, now = new Date()) {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    return {
      valid: false,
      reason: "Enter a coupon code.",
    };
  }

  const coupon = coupons.find((item) => item.code === normalizedCode);

  if (!coupon) {
    return {
      valid: false,
      reason: "This coupon code is not valid.",
    };
  }

  if (new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return {
      valid: false,
      reason: "This coupon has expired.",
      coupon,
    };
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      reason: `Add ${formatCurrency(coupon.minOrderAmount - subtotal)} more to use ${coupon.code}.`,
      coupon,
    };
  }

  return {
    valid: true,
    coupon,
    reason: `${coupon.code} applied successfully.`,
  };
}

export function calculateDiscount(coupon, subtotal) {
  if (!coupon) return 0;

  if (coupon.type === "percentage") {
    return roundMoney((subtotal * coupon.value) / 100);
  }

  if (coupon.type === "flat") {
    return roundMoney(Math.min(coupon.value, subtotal));
  }

  return 0;
}

// Shared by the browser and API so totals, GST, delivery, and coupon rules cannot drift.
export function calculateOrderTotals(items, couponCode = "", deliveryZoneId = "") {
  const subtotal = calculateSubtotal(items);
  const couponValidation = couponCode ? validateCoupon(couponCode, subtotal) : null;
  const discount = couponValidation?.valid
    ? calculateDiscount(couponValidation.coupon, subtotal)
    : 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = roundMoney(taxableAmount * TAX_RATE);
  const deliveryZone = getDeliveryZone(deliveryZoneId);
  const deliveryFee =
    subtotal > 0 && taxableAmount < FREE_DELIVERY_THRESHOLD
      ? getDeliveryZoneFee(deliveryZone.value)
      : 0;
  const total = roundMoney(taxableAmount + tax + deliveryFee);

  return {
    subtotal,
    deliveryFee,
    deliveryZone,
    tax,
    taxRate: TAX_RATE,
    discount,
    total,
    coupon: couponValidation?.valid ? couponValidation.coupon : null,
    couponValidation,
  };
}
