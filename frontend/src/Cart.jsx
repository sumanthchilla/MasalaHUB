import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  CircleCheckBig,
  CreditCard,
  HandCoins,
  Landmark,
  QrCode,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import CategoryBadge from "./components/CategoryBadge";
import QuantityStepper from "./components/QuantityStepper";
import {
  applyCoupon,
  clearCart,
  decrementQty,
  incrementQty,
  removeCart,
  removeCoupon,
} from "./cartSlice";
import {
  calculateOrderTotals,
  coupons,
  formatCurrency,
  getLineTotal,
  validateCoupon,
} from "../../shared/pricing";
import {
  getHandoffPreferenceLabel,
  getScheduleTypeLabel,
  getSpicePreferenceLabel,
  handoffPreferenceOptions,
  scheduleTypeOptions,
  spicePreferenceOptions,
} from "../../shared/fulfillment";
import {
  deliveryZoneOptions,
  getDeliveryZoneLabel,
} from "../../shared/deliveryZones";
import { getPaymentStatusLabel } from "../../shared/paymentStatus";
import "./Cart.css";
import "./styles/cart-theme.css";

const initialCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  landmark: "",
};

const initialFulfillment = {
  scheduleType: "asap",
  scheduledFor: "",
  deliveryZone: "nearby",
  deliveryNotes: "",
  spicePreference: "regular",
  handoffPreference: "meet_at_door",
};

const deliveryNoteSuggestions = ["Less spicy", "Call before delivery", "Leave at door"];

const paymentOptions = [
  {
    id: "bank_transfer",
    label: "Bank transfer",
    detail: "NEFT, IMPS, bank app",
    icon: Landmark,
  },
  {
    id: "upi",
    label: "UPI transfer",
    detail: "Pay to UPI ID",
    icon: QrCode,
  },
  {
    id: "cash_on_delivery",
    label: "Cash on delivery",
    detail: "Pay when food arrives",
    icon: HandCoins,
  },
  {
    id: "card",
    label: "Credit card",
    detail: "Visa, RuPay, Mastercard",
    icon: CreditCard,
  },
  {
    id: "netbanking",
    label: "Netbanking",
    detail: "Bank login",
    icon: Landmark,
  },
];

const bankPaymentDetails = {
  accountName: import.meta.env.VITE_PAYMENT_ACCOUNT_NAME || "Masala HUB Kitchen",
  bankName: import.meta.env.VITE_PAYMENT_BANK_NAME || "ICICI Bank",
  accountNumber: import.meta.env.VITE_PAYMENT_ACCOUNT_NUMBER || "",
  ifsc: import.meta.env.VITE_PAYMENT_IFSC || "",
  upiId: import.meta.env.VITE_PAYMENT_UPI_ID || "9347491797@ibl",
  upiQrImage:
    import.meta.env.VITE_PAYMENT_UPI_QR_IMAGE || "/payment/upi-9347491797-ibl.svg",
};

const bankOptions = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Punjab National Bank",
];

const getDigits = (value) => String(value || "").replace(/\D/g, "");

const formatCardNumber = (value) =>
  getDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

const formatExpiry = (value) => {
  const digits = getDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const maskCardNumber = (cardNumber) => {
  const digits = getDigits(cardNumber);
  if (!digits) return "**** **** **** ****";

  const lastFour = digits.slice(-4).padStart(4, "*");
  return `**** **** **** ${lastFour}`;
};

const toDateTimeLocalValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const getMinScheduleDateTime = () =>
  toDateTimeLocalValue(new Date(Date.now() + 20 * 60 * 1000));

const getMaxScheduleDateTime = () =>
  toDateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

const hasBankTransferDetails = Boolean(
  bankPaymentDetails.accountName &&
    bankPaymentDetails.bankName &&
    bankPaymentDetails.accountNumber &&
    bankPaymentDetails.ifsc
);

const hasUpiDetails = Boolean(bankPaymentDetails.upiId);

const visiblePaymentOptions = paymentOptions.filter((option) => {
  if (option.id === "bank_transfer") return hasBankTransferDetails;
  if (option.id === "upi") return hasUpiDetails;

  return true;
});

const selectablePaymentOptions = visiblePaymentOptions.length
  ? visiblePaymentOptions
  : paymentOptions;

const gatewayPaymentMethods = new Set(["card", "netbanking"]);

const getDefaultPaymentMethod = () =>
  selectablePaymentOptions.some((option) => option.id === "upi")
    ? "upi"
    : "cash_on_delivery";

const createInitialPayment = () => ({
  method: getDefaultPaymentMethod(),
  transferReference: "",
  bank: "",
  cardName: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
});

const formatDetail = (value, fallback) => value || fallback;

const buildPaymentReference = (total, quantity) =>
  `MASALA-${quantity}-${Math.round(total * 100)}`;

const launchOrderConfetti = () => {
  const duration = 5 * 1000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 30,
      angle: 90,
      spread: 30,
      startVelocity: 20,
      origin: { x: Math.random(), y: 1.2 },
      gravity: -0.3,
      shapes: ["circle"],
      colors: ["#ff4757", "#2ed573", "#1e90ff", "#ffa502", "#ff6bcb"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

const showOrderPlacedAlert = (order, emailInfo = {}, onTrackOrder) => {
  const emailNote = emailInfo.sent
    ? "Confirmation email sent to your inbox."
    : emailInfo.error
      ? "Order saved, but the receipt email could not be sent right now."
    : "Order saved. Receipt email is not configured yet.";

  Swal.fire({
    icon: "success",
    title: "Order Placed!",
    text: `Your order ${order.orderId} has been placed successfully.\n${emailNote}`,
    showConfirmButton: true,
    confirmButtonText: "Track Order",
    confirmButtonColor: "#2563eb",
    showCancelButton: true,
    cancelButtonText: "Close",
    cancelButtonColor: "#ef4444",
    timer: 3000,
    timerProgressBar: true,
  }).then((result) => {
    launchOrderConfetti();

    if (result.isConfirmed) {
      onTrackOrder?.();
    }
  });
};

const getLocalApiFallbackBase = () => {
  if (typeof window === "undefined") return "";

  const isLocalHost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  if (!isLocalHost || window.location.port === "5000") {
    return "";
  }

  return "http://127.0.0.1:5000";
};

const getOrderApiBases = () => {
  const configuredBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  const localFallbackBase = getLocalApiFallbackBase();

  return ["", ...new Set([configuredBase, localFallbackBase].filter(Boolean))];
};

const isMissingLocalApiResponse = (response, data) =>
  response.status === 404 && !data?.message;

const submitOrder = async (payload) => {
  const apiBases = getOrderApiBases();
  let lastError = null;

  for (let index = 0; index < apiBases.length; index += 1) {
    const apiBase = apiBases[index];
    const hasAnotherApiBase = index < apiBases.length - 1;

    let response;

    try {
      response = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error;

      if (hasAnotherApiBase) {
        continue;
      }

      throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return data;
    }

    const message = data.message || "Unable to place your order right now.";
    lastError = new Error(message);

    if (!apiBase && hasAnotherApiBase && isMissingLocalApiResponse(response, data)) {
      continue;
    }

    throw lastError;
  }

  throw lastError || new Error("Unable to place your order right now.");
};

function Cart() {
  const { items, appliedCoupon } = useSelector((state) => state.cart);
  const authUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || "");
  const [customer, setCustomer] = useState(initialCustomer);
  const [fulfillment, setFulfillment] = useState(initialFulfillment);
  const [payment, setPayment] = useState(() => createInitialPayment());

  useEffect(() => {
    if (!authUser) return;

    setCustomer((current) => ({
      ...current,
      name: current.name || authUser.name || "",
      email: current.email || authUser.email || "",
      phone: current.phone || authUser.phone || "",
    }));
  }, [authUser]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const cartQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const totals = useMemo(
    () => calculateOrderTotals(items, appliedCoupon?.code || "", fulfillment.deliveryZone),
    [items, appliedCoupon, fulfillment.deliveryZone]
  );
  const paymentReference = useMemo(
    () => buildPaymentReference(totals.total, cartQuantity),
    [cartQuantity, totals.total]
  );
  const minScheduleDateTime = useMemo(() => getMinScheduleDateTime(), []);
  const maxScheduleDateTime = useMemo(() => getMaxScheduleDateTime(), []);
  const isGatewayPaymentSelected = gatewayPaymentMethods.has(payment.method);
  const isGatewayPaymentUnavailable = isGatewayPaymentSelected;
  const isCashOnDeliverySelected = payment.method === "cash_on_delivery";
  const gatewayPaymentName =
    payment.method === "card" ? "Credit card" : "Netbanking";
  const gatewayPaymentIntro =
    payment.method === "card"
      ? "This is a checkout preview for card payments."
      : "This is a checkout preview for bank authorization.";

  const showToast = useCallback(
    (message, type = "success") => {
      const notify = toast[type] || toast;
      notify(message);
    },
    []
  );

  const handleClearCart = () => {
    dispatch(clearCart());
    toast.warn("Cart cleared.");
  };

  const handleRemoveCart = (item) => {
    dispatch(removeCart(item));
    toast.info(`${item.name} removed from cart.`);
  };

  const handleIncrementQty = (item) => {
    dispatch(incrementQty(item));
    toast.success(`${item.name} quantity increased.`);
  };

  const handleDecrementQty = (item) => {
    dispatch(decrementQty(item));
    if (item.quantity <= 1) {
      toast.info(`${item.name} removed from cart.`);
    } else {
      toast.info(`${item.name} quantity decreased.`);
    }
  };

  const handleApplyCoupon = (event) => {
    event.preventDefault();

    const result = validateCoupon(couponInput, totals.subtotal);

    if (!result.valid) {
      dispatch(removeCoupon());
      showToast(result.reason, "error");
      return;
    }

    dispatch(applyCoupon(result.coupon));
    setCouponInput(result.coupon.code);
    showToast(result.reason, "success");
  };

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [name]: value,
    }));
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPayment((currentPayment) => ({
      ...currentPayment,
      [name]: value,
    }));
  };

  const handleFulfillmentChange = (event) => {
    const { name, value } = event.target;

    setFulfillment((currentFulfillment) => ({
      ...currentFulfillment,
      [name]: value,
      ...(name === "scheduleType" && value === "asap" ? { scheduledFor: "" } : {}),
    }));
  };

  const handleAddDeliveryNote = (note) => {
    setFulfillment((currentFulfillment) => {
      const currentNotes = currentFulfillment.deliveryNotes.trim();
      const hasNote = currentNotes.toLowerCase().includes(note.toLowerCase());

      if (hasNote) return currentFulfillment;

      const nextNotes = [currentNotes, note].filter(Boolean).join(", ");

      return {
        ...currentFulfillment,
        deliveryNotes: nextNotes.slice(0, 240),
      };
    });
  };

  const handlePaymentMethodChange = (method) => {
    setPayment((currentPayment) => ({
      ...currentPayment,
      method,
    }));
  };

  const validatePayment = () => {
    const transferReference = payment.transferReference.trim();

    if (payment.method === "cash_on_delivery") {
      return true;
    }

    if (payment.method === "bank_transfer") {
      if (
        !bankPaymentDetails.accountName ||
        !bankPaymentDetails.bankName ||
        !bankPaymentDetails.accountNumber ||
        !bankPaymentDetails.ifsc
      ) {
        showToast("Add your bank account details in .env before taking bank payments.", "error");
        return false;
      }

      if (transferReference.length < 6) {
        showToast("Enter the bank UTR or transaction ID after payment.", "error");
        return false;
      }

      return true;
    }

    if (payment.method === "upi") {
      if (!bankPaymentDetails.upiId) {
        showToast("Add VITE_PAYMENT_UPI_ID in .env before taking UPI payments.", "error");
        return false;
      }

      if (transferReference.length < 6) {
        showToast("Enter the UPI reference or UTR after payment.", "error");
        return false;
      }

      return true;
    }

    if (gatewayPaymentMethods.has(payment.method)) {
      showToast(
        "Credit card and netbanking are demo options. Use UPI or cash on delivery to place the order.",
        "error"
      );
      return false;
    }

    showToast("Choose a valid payment method.", "error");
    return false;
  };

  const createPaymentPayload = () => {
    const basePayment = {
      method: payment.method,
      reference: payment.transferReference.trim(),
      orderReference: paymentReference,
      amount: totals.total,
    };

    if (payment.method === "cash_on_delivery") {
      return {
        ...basePayment,
        reference: "",
      };
    }

    if (payment.method === "bank_transfer") {
      return {
        ...basePayment,
        accountName: bankPaymentDetails.accountName,
        bankName: bankPaymentDetails.bankName,
        accountLast4: bankPaymentDetails.accountNumber.replace(/\D/g, "").slice(-4),
        ifsc: bankPaymentDetails.ifsc,
      };
    }

    if (payment.method === "upi") {
      return {
        ...basePayment,
        upiId: bankPaymentDetails.upiId,
      };
    }

    return basePayment;
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (!items.length) {
      showToast("Add at least one item before checkout.", "error");
      return;
    }

    if (appliedCoupon && totals.couponValidation && !totals.couponValidation.valid) {
      dispatch(removeCoupon());
      showToast(totals.couponValidation.reason, "error");
      return;
    }

    if (!validatePayment()) {
      return;
    }

    if (fulfillment.scheduleType === "scheduled" && !fulfillment.scheduledFor) {
      showToast("Choose a scheduled delivery time.", "error");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const deliveryAddress = [
        customer.address.trim(),
        customer.landmark.trim() ? `Landmark/location: ${customer.landmark.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const data = await submitOrder({
        items: items.map((item) => ({
          cartKey: item.cartKey,
          quantity: item.quantity,
        })),
        couponCode: appliedCoupon?.code || "",
        customer: {
          ...customer,
          address: deliveryAddress,
        },
        fulfillment,
        payment: createPaymentPayload(),
      });

      setOrderConfirmation({
        ...data.order,
        emailStatus: data.email || {},
      });
      setCustomer(initialCustomer);
      setFulfillment(initialFulfillment);
      setPayment(createInitialPayment());
      setCouponInput("");
      dispatch(clearCart());
      showOrderPlacedAlert(data.order, data.email, () => navigate("/history"));
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderConfirmation) {
    const receiptEmailSent = Boolean(orderConfirmation.emailStatus?.sent);
    const paymentLabel =
      orderConfirmation.payment?.displayName ||
      orderConfirmation.payment?.label ||
      "Payment selected";
    const paymentStatus =
      getPaymentStatusLabel(orderConfirmation.payment?.status);
    const paymentTransactionReference =
      orderConfirmation.payment?.method === "cash_on_delivery"
        ? "Not required"
        : orderConfirmation.payment?.reference || "Not provided";
    const fulfillmentSummary = orderConfirmation.fulfillment || initialFulfillment;
    const deliveryTiming =
      fulfillmentSummary.scheduleType === "scheduled"
        ? orderConfirmation.estimatedDeliveryTime
        : `${getScheduleTypeLabel(fulfillmentSummary.scheduleType)} delivery`;

    return (
      <main className="cart-page">
        <section className="order-success">
          <span className="success-mark" aria-hidden="true">
            <CircleCheckBig />
          </span>
          <p className="cart-eyebrow">Order confirmed</p>
          <h1>Thanks, {orderConfirmation.customer.name}.</h1>
          <p>
            Your order {orderConfirmation.orderId} is confirmed.{" "}
            {receiptEmailSent
              ? `We sent the receipt to ${orderConfirmation.customer.email}.`
              : "The order is saved, but receipt email is not active right now."}
          </p>

          <div className="success-grid">
            <div>
              <span>Estimated delivery</span>
              <strong>{orderConfirmation.estimatedDeliveryTime}</strong>
            </div>
            <div>
              <span>Total paid</span>
              <strong>{formatCurrency(orderConfirmation.totals.total)}</strong>
            </div>
            <div>
              <span>Payment method</span>
              <strong>{paymentLabel}</strong>
            </div>
            <div>
              <span>Payment status</span>
              <strong>{paymentStatus}</strong>
            </div>
            <div>
              <span>Payment reference</span>
              <strong>{paymentTransactionReference}</strong>
            </div>
            <div>
              <span>Delivery address</span>
              <strong>{orderConfirmation.customer.address}</strong>
            </div>
            <div>
              <span>Delivery zone</span>
              <strong>{getDeliveryZoneLabel(fulfillmentSummary.deliveryZone)}</strong>
            </div>
            <div>
              <span>Delivery timing</span>
              <strong>{deliveryTiming}</strong>
            </div>
            <div>
              <span>Food preference</span>
              <strong>{getSpicePreferenceLabel(fulfillmentSummary.spicePreference)}</strong>
            </div>
            <div>
              <span>Delivery handoff</span>
              <strong>{getHandoffPreferenceLabel(fulfillmentSummary.handoffPreference)}</strong>
            </div>
            {fulfillmentSummary.deliveryNotes ? (
              <div>
                <span>Delivery notes</span>
                <strong>{fulfillmentSummary.deliveryNotes}</strong>
              </div>
            ) : null}
          </div>

          <Link className="cart-primary-link" to="/">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="cart-page">
        <section className="empty-cart">
          <div className="empty-cart-icon" aria-hidden="true">
            <span />
          </div>
          <p className="cart-eyebrow">Cart is empty</p>
          <h1>Build a meal you will look forward to.</h1>
          <p>
            Add biryanis, curries, tiffin favorites, or desserts and your order
            summary will appear here.
          </p>

          <div className="empty-cart-actions">
            <Link className="cart-primary-link" to="/veg">
              Start with veg
            </Link>
            <Link className="cart-secondary-link" to="/nonveg">
              Browse non-veg
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <section className="cart-hero">
        <div className="cart-hero-copy">
          <p className="cart-eyebrow">Checkout</p>
          <h1>Your cart</h1>
          <p>
            {cartQuantity} item{cartQuantity === 1 ? "" : "s"} ready for checkout.
            Review quantities, apply a coupon, choose payment, and add delivery details.
          </p>
        </div>

        <div className="checkout-progress" aria-label="Checkout progress">
          <span className="is-active">
            <b>1</b>
            Review
          </span>
          <span className="is-active">
            <b>2</b>
            Details
          </span>
          <span>
            <b>3</b>
            Confirm
          </span>
        </div>
      </section>

      <div className="cart-layout">
        <section className="cart-items-panel" aria-label="Cart items">
          <div className="cart-section-header">
            <div>
              <h2>Order items</h2>
              <p>Prices are checked again on the server before email confirmation.</p>
            </div>
            <span className="section-count">{cartQuantity} items</span>
            <button
              type="button"
              className="text-button"
              onClick={handleClearCart}
            >
              Clear all
            </button>
          </div>

          <div className="checkout-assurance" aria-label="Checkout assurance">
            <span>Freshly prepared</span>
            <span>Price verified</span>
            <span>Email receipt</span>
          </div>

          <div className="cart-item-list">
            {items.map((item) => (
              <article className="cart-item" key={item.cartKey}>
                <img src={item.image} alt={item.name} />
                <div className="cart-item-main">
                  <div className="cart-item-title-row">
                    <div>
                      <CategoryBadge type={item.category} size="sm" />
                      <h3>{item.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="remove-item-button"
                      onClick={() => handleRemoveCart(item)}
                    >
                      Remove
                    </button>
                  </div>

                  <p>{item.description}</p>

                  <div className="cart-item-actions">
                    <QuantityStepper
                      quantity={item.quantity}
                      onDecrease={() => handleDecrementQty(item)}
                      onIncrease={() => handleIncrementQty(item)}
                    />
                    <div className="cart-item-price">
                      <span>{formatCurrency(item.price)} each</span>
                      <strong>{formatCurrency(getLineTotal(item))}</strong>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <form className="checkout-form" onSubmit={handlePlaceOrder}>
            <div className="cart-section-header">
              <div>
                <h2>Delivery details</h2>
                <p>Confirmation email and delivery updates use these details.</p>
              </div>
            </div>

            <div className="checkout-grid">
              <label>
                Name
                <input
                  name="name"
                  value={customer.name}
                  onChange={handleCustomerChange}
                  autoComplete="name"
                  required
                  placeholder="Your name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="text"
                  inputMode="email"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  title="Enter a valid email address"
                  value={customer.email}
                  onChange={handleCustomerChange}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                  autoComplete="tel"
                  required
                  placeholder="Mobile number"
                />
              </label>
              <label className="address-field">
                Delivery address
                <textarea
                  name="address"
                  value={customer.address}
                  onChange={handleCustomerChange}
                  autoComplete="street-address"
                  required
                  placeholder="Flat, street, area, city"
                  rows="4"
                />
              </label>
              <label>
                Location / landmark
                <input
                  name="landmark"
                  value={customer.landmark}
                  onChange={handleCustomerChange}
                  autoComplete="off"
                  placeholder="Apartment gate, nearby shop, map pin"
                />
              </label>
            </div>

            <section className="fulfillment-panel" aria-labelledby="fulfillment-heading">
              <div className="cart-section-header">
                <div>
                  <h2 id="fulfillment-heading">Delivery preferences</h2>
                  <p>Set spice level, handoff, notes, and optional scheduled delivery.</p>
                </div>
              </div>

              <div className="schedule-toggle" role="radiogroup" aria-label="Delivery timing">
                {scheduleTypeOptions.map((option) => (
                  <label
                    className={fulfillment.scheduleType === option.value ? "is-selected" : ""}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="scheduleType"
                      value={option.value}
                      checked={fulfillment.scheduleType === option.value}
                      onChange={handleFulfillmentChange}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              {fulfillment.scheduleType === "scheduled" ? (
                <label className="scheduled-time-field">
                  Scheduled delivery time
                  <input
                    type="datetime-local"
                    name="scheduledFor"
                    value={fulfillment.scheduledFor}
                    min={minScheduleDateTime}
                    max={maxScheduleDateTime}
                    onChange={handleFulfillmentChange}
                    required
                  />
                </label>
              ) : null}

              <div className="fulfillment-grid">
                <label>
                  Delivery zone
                  <select
                    name="deliveryZone"
                    value={fulfillment.deliveryZone}
                    onChange={handleFulfillmentChange}
                  >
                    {deliveryZoneOptions.map((zone) => (
                      <option value={zone.value} key={zone.value}>
                        {zone.label} - {zone.distanceLabel} / {formatCurrency(zone.deliveryFee)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Spice preference
                  <select
                    name="spicePreference"
                    value={fulfillment.spicePreference}
                    onChange={handleFulfillmentChange}
                  >
                    {spicePreferenceOptions.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Delivery handoff
                  <select
                    name="handoffPreference"
                    value={fulfillment.handoffPreference}
                    onChange={handleFulfillmentChange}
                  >
                    {handoffPreferenceOptions.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="delivery-notes-field">
                  Delivery notes
                  <textarea
                    name="deliveryNotes"
                    value={fulfillment.deliveryNotes}
                    onChange={handleFulfillmentChange}
                    maxLength="240"
                    rows="3"
                    placeholder="Less spicy, call before delivery, leave at door..."
                  />
                </label>
              </div>

              <div className="delivery-note-suggestions" aria-label="Quick delivery notes">
                {deliveryNoteSuggestions.map((note) => (
                  <button
                    type="button"
                    key={note}
                    onClick={() => handleAddDeliveryNote(note)}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </section>

            <section className="payment-panel" aria-labelledby="payment-heading">
              <div className="cart-section-header payment-heading-row">
                <div>
                  <h2 id="payment-heading">Payment method</h2>
                  <p>UPI and cash on delivery are ready for orders. Card and netbanking are demo previews.</p>
                </div>
                <span className="secure-payment-badge">
                  <ShieldCheck aria-hidden="true" />
                  Manual check
                </span>
              </div>

              <div className="payment-methods" role="radiogroup" aria-label="Payment method">
                {selectablePaymentOptions.map((option) => {
                  const PaymentIcon = option.icon;

                  return (
                    <label
                      className={`payment-method-card${
                        payment.method === option.id ? " is-selected" : ""
                      }`}
                      key={option.id}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.id}
                        checked={payment.method === option.id}
                        onChange={() => handlePaymentMethodChange(option.id)}
                      />
                      <span className="payment-method-icon" aria-hidden="true">
                        <PaymentIcon />
                      </span>
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </label>
                  );
                })}
              </div>

              {payment.method === "bank_transfer" ? (
                <div className="payment-detail-grid bank-transfer-grid">
                  <div className="bank-account-card">
                    <span>Bank account</span>
                    <strong>
                      {formatDetail(bankPaymentDetails.accountName, "Add account holder")}
                    </strong>
                    <dl>
                      <div>
                        <dt>Bank</dt>
                        <dd>{formatDetail(bankPaymentDetails.bankName, "Add bank name")}</dd>
                      </div>
                      <div>
                        <dt>Account</dt>
                        <dd>
                          {formatDetail(bankPaymentDetails.accountNumber, "Add account number")}
                        </dd>
                      </div>
                      <div>
                        <dt>IFSC</dt>
                        <dd>{formatDetail(bankPaymentDetails.ifsc, "Add IFSC")}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="payment-copy">
                    <span className="payment-pill">
                      <Landmark aria-hidden="true" />
                      Bank transfer
                    </span>
                    <h3>Transfer {formatCurrency(totals.total)}</h3>
                    <p>
                      Pay with NEFT, IMPS, or your bank app. Use the order
                      reference below as the payment note.
                    </p>
                    <div className="payment-meta-list">
                      <span>Order ref: {paymentReference}</span>
                      <span>Manual bank verification</span>
                    </div>
                    <label className="payment-reference-field">
                      Bank UTR / transaction ID
                      <input
                        name="transferReference"
                        value={payment.transferReference}
                        onChange={handlePaymentChange}
                        autoComplete="off"
                        required
                        placeholder="Example: 412345678901"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {payment.method === "upi" ? (
                <div className="payment-detail-grid upi-payment">
                  <div className="qr-shell">
                    <div className="qr-topline">
                      <QrCode aria-hidden="true" />
                      <span>Masala HUB Pay</span>
                    </div>
                    {bankPaymentDetails.upiQrImage ? (
                      <img
                        className="payment-qr-image"
                        src={bankPaymentDetails.upiQrImage}
                        alt="UPI QR code"
                      />
                    ) : (
                      <div className="upi-id-panel">
                        <span>UPI ID</span>
                        <strong>
                          {formatDetail(bankPaymentDetails.upiId, "Add VITE_PAYMENT_UPI_ID")}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="payment-copy">
                    <span className="payment-pill">
                      <Smartphone aria-hidden="true" />
                      UPI transfer
                    </span>
                    <h3>Pay {formatCurrency(totals.total)} by UPI</h3>
                    <p>
                      UPI ID{" "}
                      <strong>
                        {formatDetail(bankPaymentDetails.upiId, "Add VITE_PAYMENT_UPI_ID")}
                      </strong>
                    </p>
                    <div className="payment-meta-list">
                      <span>Order ref: {paymentReference}</span>
                      <span>Manual UPI verification</span>
                    </div>
                    <label className="payment-reference-field">
                      UPI reference / UTR
                      <input
                        name="transferReference"
                        value={payment.transferReference}
                        onChange={handlePaymentChange}
                        autoComplete="off"
                        required
                        placeholder="Example: 412345678901"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {payment.method === "cash_on_delivery" ? (
                <div className="payment-detail-grid cash-delivery-grid">
                  <div className="cash-delivery-card">
                    <span>Pay on delivery</span>
                    <strong>{formatCurrency(totals.total)}</strong>
                    <p>Collect cash when the order reaches the customer.</p>
                  </div>

                  <div className="payment-copy">
                    <span className="payment-pill">
                      <HandCoins aria-hidden="true" />
                      Cash on delivery
                    </span>
                    <h3>Pay {formatCurrency(totals.total)} at delivery</h3>
                    <p>
                      No online transfer is needed now. Keep the exact amount ready
                      and pay the delivery partner when your food arrives.
                    </p>
                    <div className="payment-meta-list">
                      <span>Order ref: {paymentReference}</span>
                      <span>No UTR required</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {isGatewayPaymentSelected ? (
                <div className="payment-detail-grid gateway-payment-grid">
                  {payment.method === "card" ? (
                    <>
                      <div className="payment-card-preview">
                        <div>
                          <span>Masala HUB Bank</span>
                          <WalletCards aria-hidden="true" />
                        </div>
                        <strong>{maskCardNumber(payment.cardNumber)}</strong>
                        <footer>
                          <span>{payment.cardName || "CARD HOLDER"}</span>
                          <span>{payment.cardExpiry || "MM/YY"}</span>
                        </footer>
                      </div>

                      <div className="card-form-grid">
                        <span className="payment-pill card-full-field">
                          <CreditCard aria-hidden="true" />
                          Demo card checkout
                        </span>
                        <label className="card-full-field">
                          Card holder
                          <input
                            name="cardName"
                            value={payment.cardName}
                            onChange={handlePaymentChange}
                            autoComplete="off"
                            placeholder="Name on card"
                          />
                        </label>
                        <label className="card-full-field">
                          Card number
                          <input
                            name="cardNumber"
                            value={payment.cardNumber}
                            onChange={(event) =>
                              setPayment((currentPayment) => ({
                                ...currentPayment,
                                cardNumber: formatCardNumber(event.target.value),
                              }))
                            }
                            autoComplete="off"
                            inputMode="numeric"
                            placeholder="1234 5678 9012 3456"
                          />
                        </label>
                        <label>
                          Expiry
                          <input
                            name="cardExpiry"
                            value={payment.cardExpiry}
                            onChange={(event) =>
                              setPayment((currentPayment) => ({
                                ...currentPayment,
                                cardExpiry: formatExpiry(event.target.value),
                              }))
                            }
                            autoComplete="off"
                            inputMode="numeric"
                            placeholder="MM/YY"
                          />
                        </label>
                        <label>
                          CVV
                          <input
                            name="cardCvv"
                            value={payment.cardCvv}
                            onChange={(event) =>
                              setPayment((currentPayment) => ({
                                ...currentPayment,
                                cardCvv: getDigits(event.target.value).slice(0, 4),
                              }))
                            }
                            autoComplete="off"
                            inputMode="numeric"
                            placeholder="123"
                          />
                        </label>
                        <p className="demo-payment-note card-full-field">
                          Demo preview only. Card payments are not processed.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="gateway-method-card">
                        <span>{gatewayPaymentName}</span>
                        <strong>{formatCurrency(totals.total)}</strong>
                        <p>Demo preview</p>
                      </div>

                      <div className="banking-panel">
                        <span className="payment-pill">
                          <Landmark aria-hidden="true" />
                          Demo netbanking checkout
                        </span>
                        <p className="demo-payment-copy">{gatewayPaymentIntro}</p>
                        <label>
                          Choose bank
                          <select
                            name="bank"
                            value={payment.bank}
                            onChange={handlePaymentChange}
                          >
                            <option value="">Select your bank</option>
                            {bankOptions.map((bank) => (
                              <option key={bank} value={bank}>
                                {bank}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="bank-route">
                          <span>Login</span>
                          <span>Authorize</span>
                          <span>Confirm</span>
                        </div>
                        <p className="demo-payment-note">
                          Demo preview only. Netbanking payments are not processed.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </section>

            <button
              type="submit"
              className="place-order-button"
              disabled={isPlacingOrder || isGatewayPaymentUnavailable}
            >
              {isPlacingOrder ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Placing order
                </>
              ) : isGatewayPaymentUnavailable ? (
                `${gatewayPaymentName} demo only - use UPI or COD`
              ) : isCashOnDeliverySelected ? (
                `Place order - pay ${formatCurrency(totals.total)} on delivery`
              ) : (
                `Submit paid order - ${formatCurrency(totals.total)}`
              )}
            </button>
          </form>
        </section>

        <aside className="order-summary" aria-label="Order summary">
          <div className="summary-header">
            <div>
              <p className="cart-eyebrow">Summary</p>
              <h2>Order total</h2>
            </div>
            <span>{cartQuantity} items</span>
          </div>

          <div className="summary-items">
            {items.map((item) => (
              <div className="summary-item" key={item.cartKey}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatCurrency(item.price)}
                  </span>
                </div>
                <b>{formatCurrency(getLineTotal(item))}</b>
              </div>
            ))}
          </div>

          <form className="coupon-form" onSubmit={handleApplyCoupon}>
            <label htmlFor="coupon">Coupon code</label>
            <div>
              <input
                id="coupon"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                placeholder="Try MASALA10"
              />
              <button type="submit">Apply</button>
            </div>
            <small>
              Available: {coupons.map((coupon) => coupon.code).join(", ")}
            </small>
          </form>

          {appliedCoupon && totals.coupon ? (
            <div className="applied-coupon">
              <span>{totals.coupon.description}</span>
              <button
                type="button"
                onClick={() => {
                  dispatch(removeCoupon());
                  showToast("Coupon removed.", "success");
                }}
              >
                Remove
              </button>
            </div>
          ) : null}

          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div>
              <span>Delivery fee ({getDeliveryZoneLabel(fulfillment.deliveryZone)})</span>
              <strong>
                {totals.deliveryFee === 0 ? "Free" : formatCurrency(totals.deliveryFee)}
              </strong>
            </div>
            <div>
              <span>Tax / GST ({Math.round(totals.taxRate * 100)}%)</span>
              <strong>{formatCurrency(totals.tax)}</strong>
            </div>
            <div className="discount-line">
              <span>Discount</span>
              <strong>-{formatCurrency(totals.discount)}</strong>
            </div>
          </div>

          <div className="summary-total">
            <span>Final total</span>
            <strong>{formatCurrency(totals.total)}</strong>
          </div>

          <div className="summary-support">
            <span>UPI enabled</span>
            <span>COD available</span>
            <span>Manual verification</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
