import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  ChefHat,
  CheckCircle2,
  CircleX,
  Clock3,
  History as HistoryIcon,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  Star,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { apiRequest } from "./api";
import { addItemsToCart } from "./cartSlice";
import { getOrderStatus } from "../../shared/orderStatus";
import {
  getHandoffPreferenceLabel,
  getScheduleTypeLabel,
  getSpicePreferenceLabel,
} from "../../shared/fulfillment";
import { findMenuItemByCartKey } from "../../shared/menuItems";
import { formatCurrency } from "../../shared/pricing";
import { getDeliveryZoneLabel } from "../../shared/deliveryZones";
import { getPaymentStatusLabel } from "../../shared/paymentStatus";
import "./History.css";
import "./styles/history-theme.css";

const initialLookup = {
  email: "",
  phone: "",
};

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available";

const formatFulfillmentTiming = (fulfillment = {}, estimatedDeliveryTime = "") =>
  fulfillment.scheduleType === "scheduled"
    ? `Scheduled ${formatDateTime(fulfillment.scheduledFor)}`
    : `${getScheduleTypeLabel(fulfillment.scheduleType)} delivery${
        estimatedDeliveryTime ? ` - ${estimatedDeliveryTime}` : ""
      }`;

const trackingSteps = [
  { key: "received", label: "Received", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "out_for_delivery", label: "On the way", icon: Bike },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

const getOrderTracking = (order) => {
  const status = getOrderStatus(order.status);

  return {
    key: status.value,
    label: status.label,
    detail: status.detail,
    activeIndex: status.activeIndex,
    tone: status.tone,
  };
};

function History() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const authToken = useSelector((state) => state.auth.token);
  const [lookup, setLookup] = useState(initialLookup);
  const [orders, setOrders] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupMode, setLookupMode] = useState("guest");
  const [showGuestLookup, setShowGuestLookup] = useState(false);
  const [loadedAccountKey, setLoadedAccountKey] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSubmittingOrderId, setReviewSubmittingOrderId] = useState("");
  const requestIdRef = useRef(0);

  const isResolvingAccount = Boolean(authToken && !authUser);
  const accountLookupKey = authUser
    ? `${authUser.id || ""}:${authUser.email || ""}:${authUser.phone || ""}`
    : "";
  const accountContact = [authUser?.email, authUser?.phone].filter(Boolean).join(" / ");

  const totals = useMemo(
    () =>
      orders.reduce(
        (summary, order) => ({
          orders: summary.orders + 1,
          amount: summary.amount + Number(order.totals?.total || 0),
          items:
            summary.items +
            order.items.reduce((count, item) => count + Number(item.quantity || 0), 0),
        }),
        { orders: 0, amount: 0, items: 0 }
      ),
    [orders]
  );

  const loadHistory = useCallback(async ({ path, mode }) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    setError("");
    setOrders([]);
    setHasSearched(true);
    setLookupMode(mode);

    try {
      const data = await apiRequest(path);

      if (requestId !== requestIdRef.current) return;

      setOrders(data.orders || []);
      setLookupMode(data.lookup?.mode || mode);
    } catch (apiError) {
      if (requestId !== requestIdRef.current) return;

      setOrders([]);
      setError(apiError.message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadAccountHistory = useCallback(() => {
    loadHistory({ path: "/api/orders/history", mode: "account" });
  }, [loadHistory]);

  useEffect(() => {
    if (!authUser) {
      setLoadedAccountKey("");

      if (!authToken && lookupMode === "account") {
        setOrders([]);
        setHasSearched(false);
        setError("");
        setLookupMode("guest");
      }

      return;
    }

    if (!accountLookupKey || loadedAccountKey === accountLookupKey) {
      return;
    }

    setLoadedAccountKey(accountLookupKey);
    setShowGuestLookup(false);
    loadAccountHistory();
  }, [
    accountLookupKey,
    authToken,
    authUser,
    loadAccountHistory,
    loadedAccountKey,
    lookupMode,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setLookup((currentLookup) => ({
      ...currentLookup,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams({
      lookup: "guest",
      email: lookup.email.trim(),
      phone: lookup.phone.trim(),
    });

    loadHistory({
      path: `/api/orders/history?${params.toString()}`,
      mode: "guest",
    });
  };

  const handleRefreshAccount = () => {
    if (!authUser) return;

    setLoadedAccountKey(accountLookupKey);
    loadAccountHistory();
  };

  const handleReorder = (order) => {
    const reorderItems = order.items.map((item) => {
      const menuItem = findMenuItemByCartKey(item.cartKey);

      return {
        ...(menuItem || item),
        cartKey: item.cartKey || menuItem?.cartKey,
        name: menuItem?.name || item.name,
        category: menuItem?.category || item.category,
        image: menuItem?.image || item.image,
        price: Number(menuItem?.price || item.price || 0),
        quantity: Number(item.quantity || 1),
        description: menuItem?.description || "From your previous order",
      };
    });

    dispatch(addItemsToCart(reorderItems));
    toast.success(`${order.orderId} added to cart.`);
    navigate("/cart");
  };

  const handleReviewChange = (orderId, field, value) => {
    setReviewDrafts((currentDrafts) => ({
      ...currentDrafts,
      [orderId]: {
        rating: 5,
        comment: "",
        ...(currentDrafts[orderId] || {}),
        [field]: value,
      },
    }));
  };

  const handleReviewSubmit = async (order) => {
    const draft = reviewDrafts[order.orderId] || { rating: 5, comment: "" };

    setReviewSubmittingOrderId(order.orderId);
    setError("");

    try {
      const data = await apiRequest(
        `/api/orders/${encodeURIComponent(order.orderId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: order.customer.email,
            phone: order.customer.phone,
            rating: draft.rating,
            comment: draft.comment,
          }),
        }
      );

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.orderId === order.orderId
            ? { ...currentOrder, review: data.review }
            : currentOrder
        )
      );
      toast.success("Review saved. Thank you.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setReviewSubmittingOrderId("");
    }
  };

  const guestLookupForm = (
    <form
      className={`history-lookup-form${
        authUser ? " history-lookup-form-fallback" : ""
      }`}
      onSubmit={handleSubmit}
    >
      <label>
        Email
        <input
          name="email"
          type="text"
          inputMode="email"
          pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
          title="Enter a valid email address"
          value={lookup.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>
      <label>
        Phone
        <input
          name="phone"
          value={lookup.phone}
          onChange={handleChange}
          autoComplete="tel"
          placeholder="Mobile number"
          required
        />
      </label>
      <button
        type="submit"
        className={hasSearched && lookupMode === "guest" ? "is-searched" : ""}
        disabled={isLoading}
      >
        <Search aria-hidden="true" />
        <span>{isLoading && lookupMode === "guest" ? "Searching" : "Search history"}</span>
      </button>
    </form>
  );

  return (
    <main className="history-page">
      <section className="history-hero">
        <div>
          <p className="history-eyebrow">Customer history</p>
          <h1>{authUser ? "Your order history" : "Find your past orders"}</h1>
          <p>
            {authUser
              ? "We load receipts from your signed-in account details. Guest lookup is available for orders placed outside this account."
              : "Enter the same email and phone number used at checkout to view your saved order receipts."}
          </p>
        </div>
        <span className="history-hero-icon" aria-hidden="true">
          <HistoryIcon />
        </span>
      </section>

      <section className="history-lookup-panel">
        {isResolvingAccount ? (
          <div className="history-account-row">
            <span className="history-account-icon" aria-hidden="true">
              <UserRound />
            </span>
            <div className="history-account-copy">
              <span>Checking account</span>
              <h2>Loading your saved profile</h2>
              <p>We will use your account email and phone as soon as they are ready.</p>
            </div>
          </div>
        ) : authUser ? (
          <>
            <div className="history-account-row">
              <span className="history-account-icon" aria-hidden="true">
                <UserRound />
              </span>
              <div className="history-account-copy">
                <span>Signed in</span>
                <h2>{authUser.name ? `${authUser.name}'s orders` : "Account orders"}</h2>
                <p>Using {accountContact || "your account details"}.</p>
              </div>
              <div className="history-account-actions">
                <button
                  type="button"
                  className="history-refresh-button"
                  onClick={handleRefreshAccount}
                  disabled={isLoading && lookupMode === "account"}
                >
                  <RefreshCw aria-hidden="true" />
                  <span>
                    {isLoading && lookupMode === "account" ? "Loading" : "Refresh"}
                  </span>
                </button>
                <button
                  type="button"
                  className="history-secondary-button"
                  onClick={() => setShowGuestLookup((isShown) => !isShown)}
                >
                  <Search aria-hidden="true" />
                  <span>{showGuestLookup ? "Hide guest lookup" : "Guest lookup"}</span>
                </button>
              </div>
            </div>
            {showGuestLookup ? (
              <div className="history-guest-fallback">
                <p>Use this only for receipts placed without this account.</p>
                {guestLookupForm}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="history-guest-intro">
              <span>Guest lookup</span>
              <p>Search with the email and phone number from your checkout receipt.</p>
            </div>
            {guestLookupForm}
          </>
        )}
        {error ? <p className="history-error">{error}</p> : null}
      </section>

      {orders.length ? (
        <section className="history-summary" aria-label="History summary">
          <article>
            <ReceiptText aria-hidden="true" />
            <span>Orders</span>
            <strong>{totals.orders}</strong>
          </article>
          <article>
            <PackageCheck aria-hidden="true" />
            <span>Items</span>
            <strong>{totals.items}</strong>
          </article>
          <article>
            <UserRound aria-hidden="true" />
            <span>Total spent</span>
            <strong>{formatCurrency(totals.amount)}</strong>
          </article>
        </section>
      ) : null}

      <section className="history-results" aria-label="Order history results">
        {isLoading ? (
          <div className="history-empty history-loading" role="status">
            <span className="history-loading-mark" aria-hidden="true" />
            <h2>{lookupMode === "account" ? "Loading your orders" : "Searching receipts"}</h2>
            <p>
              {lookupMode === "account"
                ? "Checking saved receipts for your signed-in account."
                : "Matching the guest email and phone number with saved receipts."}
            </p>
          </div>
        ) : null}

        {!isLoading && orders.map((order) => {
          const tracking = getOrderTracking(order);

          return (
            <article className="history-order" key={order.orderId}>
              <div className="history-order-header">
                <div>
                  <span>Order ID</span>
                  <h2>{order.orderId}</h2>
                  <p>{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="history-order-header-side">
                  <span className={`history-status-badge history-status-badge-${tracking.tone}`}>
                    {tracking.tone === "success" ? (
                      <PackageCheck aria-hidden="true" />
                    ) : tracking.tone === "danger" ? (
                      <CircleX aria-hidden="true" />
                    ) : (
                      <Clock3 aria-hidden="true" />
                    )}
                    {tracking.label}
                  </span>
                  <strong>{formatCurrency(order.totals.total)}</strong>
                  <button
                    type="button"
                    className="history-reorder-button"
                    onClick={() => handleReorder(order)}
                  >
                    <ShoppingCart aria-hidden="true" />
                    Reorder
                  </button>
                </div>
              </div>

              <div className="history-order-meta">
                <span>{order.payment.displayName || "Payment selected"}</span>
                <span>{getPaymentStatusLabel(order.payment.status)}</span>
                <span>{getDeliveryZoneLabel(order.fulfillment?.deliveryZone)}</span>
                <span>{formatFulfillmentTiming(order.fulfillment, order.estimatedDeliveryTime)}</span>
                <span>{getSpicePreferenceLabel(order.fulfillment?.spicePreference)}</span>
                <span>{getHandoffPreferenceLabel(order.fulfillment?.handoffPreference)}</span>
                {order.fulfillment?.deliveryNotes ? (
                  <span>{order.fulfillment.deliveryNotes}</span>
                ) : null}
              </div>

              <div className="history-tracker" aria-label={`Tracking for ${order.orderId}`}>
                <p>{tracking.detail}</p>
                <div className="history-tracker-steps">
                  {trackingSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isDone = index <= tracking.activeIndex;

                    return (
                      <span
                        className={isDone ? "is-done" : ""}
                        key={`${order.orderId}-${step.key}`}
                      >
                        <StepIcon aria-hidden="true" />
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="history-item-list">
                {order.items.map((item) => (
                  <div className="history-item" key={`${order.orderId}-${item.name}`}>
                    <img src={item.image} alt={item.name} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        Qty {item.quantity} x {formatCurrency(item.price)}
                      </small>
                    </span>
                    <b>{formatCurrency(item.lineTotal)}</b>
                  </div>
                ))}
              </div>

              {tracking.key === "delivered" ? (
                <div className="history-review-panel">
                  {order.review ? (
                    <div className="history-review-saved">
                      <span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            aria-hidden="true"
                            className={star <= order.review.rating ? "is-filled" : ""}
                          />
                        ))}
                      </span>
                      <strong>Your review is saved.</strong>
                      {order.review.comment ? <p>{order.review.comment}</p> : null}
                    </div>
                  ) : (
                    <form
                      className="history-review-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleReviewSubmit(order);
                      }}
                    >
                      <label>
                        Rating
                        <select
                          value={reviewDrafts[order.orderId]?.rating || 5}
                          onChange={(event) =>
                            handleReviewChange(order.orderId, "rating", Number(event.target.value))
                          }
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option value={rating} key={rating}>
                              {rating} stars
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Review
                        <textarea
                          value={reviewDrafts[order.orderId]?.comment || ""}
                          onChange={(event) =>
                            handleReviewChange(order.orderId, "comment", event.target.value)
                          }
                          maxLength="500"
                          rows="3"
                          placeholder="How was your food?"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={reviewSubmittingOrderId === order.orderId}
                      >
                        <Star aria-hidden="true" />
                        {reviewSubmittingOrderId === order.orderId ? "Saving" : "Save review"}
                      </button>
                    </form>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}

        {hasSearched && !isLoading && !orders.length && !error ? (
          <div className="history-empty">
            <ReceiptText aria-hidden="true" />
            <h2>{lookupMode === "account" ? "No account orders yet" : "No orders found"}</h2>
            <p>
              {lookupMode === "account"
                ? "Orders placed with your account email and phone will appear here."
                : "Check the email and phone number from your checkout receipt."}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default History;
