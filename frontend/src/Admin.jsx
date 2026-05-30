import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Crown,
  Download,
  Edit3,
  LockKeyhole,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  TriangleAlert,
  Utensils,
  WalletCards,
} from "lucide-react";

import { apiRequest } from "./api";
import { formatCurrency } from "../../shared/pricing";
import { categoryMeta } from "../../shared/menuItems";
import { getOrderStatus, orderStatusOptions } from "../../shared/orderStatus";
import { getPaymentStatus, paymentStatusOptions } from "../../shared/paymentStatus";
import { getDeliveryZoneLabel } from "../../shared/deliveryZones";
import {
  getHandoffPreferenceLabel,
  getScheduleTypeLabel,
  getSpicePreferenceLabel,
} from "../../shared/fulfillment";
import "./Admin.css";

const adminStorageKey = "masala-hub-admin-access-key";

const initialMenuForm = {
  cartKey: "",
  category: "veg",
  name: "",
  description: "",
  price: "",
  image: "",
  available: true,
};

const categoryOptions = Object.entries(categoryMeta).map(([value, meta]) => ({
  value,
  label: meta.fullLabel || meta.label,
}));

const getAdminStorage = () =>
  typeof window === "undefined" ? null : window.sessionStorage;

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available";

const getOrderItemCount = (order) =>
  (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);

const formatFulfillmentTiming = (fulfillment = {}) =>
  fulfillment.scheduleType === "scheduled"
    ? formatDateTime(fulfillment.scheduledFor)
    : `${getScheduleTypeLabel(fulfillment.scheduleType)} delivery`;

const escapeCsvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const buildOrdersCsv = (orders) => {
  const headers = [
    "Order ID",
    "Created At",
    "Status",
    "Customer",
    "Email",
    "Phone",
    "Address",
    "Delivery Timing",
    "Spice Preference",
    "Handoff",
    "Delivery Notes",
    "Total",
    "Payment",
    "Payment Status",
    "Items",
  ];
  const rows = orders.map((order) => {
    const status = getOrderStatus(order.status).label;
    const items = (order.items || [])
      .map((item) => `${item.quantity} x ${item.name}`)
      .join("; ");

    return [
      order.orderId,
      order.createdAt,
      status,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.customer?.address,
      formatFulfillmentTiming(order.fulfillment),
      getSpicePreferenceLabel(order.fulfillment?.spicePreference),
      getHandoffPreferenceLabel(order.fulfillment?.handoffPreference),
      order.fulfillment?.deliveryNotes || "",
      order.totals?.total,
      order.payment?.displayName || order.payment?.method || "",
      getPaymentStatus(order.payment?.status).label,
      items,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
};

function MetricCard({ icon, label, value, detail }) {
  const MetricIcon = icon;

  return (
    <article className="admin-metric-card">
      <span className="admin-metric-icon" aria-hidden="true">
        <MetricIcon />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function OrderBarChart({ title, subtitle, data, tone = "green" }) {
  const maxOrders = Math.max(...data.map((point) => Number(point.orders || 0)), 1);

  return (
    <section className="admin-panel admin-chart-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className={`admin-chart-chip admin-chart-chip-${tone}`}>
          <BarChart3 aria-hidden="true" />
          Orders
        </span>
      </div>

      <div className="admin-bar-chart" aria-label={title}>
        {data.map((point) => {
          const orders = Number(point.orders || 0);
          const barHeight = Math.max(orders ? 8 : 2, Math.round((orders / maxOrders) * 100));

          return (
            <div className="admin-bar-column" key={point.label}>
              <span className="admin-bar-value">{orders ? formatNumber(orders) : ""}</span>
              <span
                className={`admin-bar admin-bar-${tone}`}
                style={{ "--bar-height": `${barHeight}%` }}
                title={`${point.label}: ${formatNumber(orders)} orders`}
              />
              <small>{point.label}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Admin() {
  const [inputKey, setInputKey] = useState("");
  const [verifiedKey, setVerifiedKey] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [managedOrders, setManagedOrders] = useState([]);
  const [orderScope, setOrderScope] = useState("today");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [menuForm, setMenuForm] = useState(initialMenuForm);
  const [editingMenuKey, setEditingMenuKey] = useState("");
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [isMenuSaving, setIsMenuSaving] = useState(false);

  const loadManagedOrders = useCallback(async (key, filters = {}) => {
    const trimmedKey = String(key || "").trim();
    const {
      scope = "today",
      status = "",
      paymentStatus = "",
      search = "",
    } = filters;

    if (!trimmedKey) {
      setManagedOrders([]);
      return;
    }

    const params = new URLSearchParams({
      scope,
      limit: "120",
    });

    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (search.trim()) params.set("search", search.trim());

    setIsOrdersLoading(true);

    try {
      const data = await apiRequest(`/api/admin/orders?${params.toString()}`, {
        headers: {
          "x-admin-key": trimmedKey,
        },
      });

      setManagedOrders(data.orders || []);
    } catch (apiError) {
      setManagedOrders([]);
      setError(apiError.message);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (key, options = {}) => {
    const { silent = false } = options;
    const trimmedKey = String(key || "").trim();

    if (!trimmedKey) {
      if (!silent) {
        setError("Admin access key is required.");
      }
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/admin/order-analytics", {
        headers: {
          "x-admin-key": trimmedKey,
        },
      });

      setAnalytics(data.analytics);
      setVerifiedKey(trimmedKey);
      getAdminStorage()?.setItem(adminStorageKey, trimmedKey);
    } catch (apiError) {
      setAnalytics(null);
      setVerifiedKey("");
      getAdminStorage()?.removeItem(adminStorageKey);

      if (silent) {
        setInputKey("");
        setError("");
      } else {
        setError(apiError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const metrics = useMemo(() => {
    if (!analytics) return [];

    const averageOrderValue =
      analytics.summary.allTime.orders > 0
        ? analytics.summary.allTime.revenue / analytics.summary.allTime.orders
        : 0;

    return [
      {
        icon: CalendarDays,
        label: "Today",
        value: formatNumber(analytics.summary.today.orders),
        detail: `${formatCurrency(analytics.summary.today.revenue)} revenue`,
      },
      {
        icon: Activity,
        label: "This month",
        value: formatNumber(analytics.summary.month.orders),
        detail: `${formatCurrency(analytics.summary.month.revenue)} revenue`,
      },
      {
        icon: WalletCards,
        label: "Average order",
        value: formatCurrency(averageOrderValue),
        detail: `${formatNumber(analytics.summary.allTime.orders)} total orders`,
      },
      {
        icon: Crown,
        label: "All time",
        value: formatNumber(analytics.summary.allTime.orders),
        detail: `${formatCurrency(analytics.summary.allTime.revenue)} revenue`,
      },
    ];
  }, [analytics]);

  const dashboardSnapshot = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        label: "Generated",
        value: formatDateTime(analytics.generatedAt),
      },
      {
        label: "Year revenue",
        value: formatCurrency(analytics.summary.year.revenue),
      },
      {
        label: "Payment types",
        value: formatNumber(analytics.paymentMethods.length),
      },
      {
        label: orderScope === "today" ? "Today table" : "Order table",
        value: formatNumber(managedOrders.length),
      },
    ];
  }, [analytics, managedOrders.length, orderScope]);

  const handleSubmit = (event) => {
    event.preventDefault();
    loadAnalytics(inputKey);
  };

  useEffect(() => {
    window.localStorage.removeItem(adminStorageKey);
    const savedKey = getAdminStorage()?.getItem(adminStorageKey);

    if (savedKey) {
      loadAnalytics(savedKey, { silent: true });
    }
  }, [loadAnalytics]);

  useEffect(() => {
    if (!verifiedKey || !analytics) {
      setManagedOrders([]);
      return;
    }

    loadManagedOrders(verifiedKey, {
      scope: orderScope,
      status: orderStatusFilter,
      paymentStatus: paymentStatusFilter,
      search: orderSearch,
    });
  }, [
    analytics,
    loadManagedOrders,
    orderScope,
    orderSearch,
    orderStatusFilter,
    paymentStatusFilter,
    verifiedKey,
  ]);

  const handleLock = () => {
    getAdminStorage()?.removeItem(adminStorageKey);
    setInputKey("");
    setVerifiedKey("");
    setAnalytics(null);
    setManagedOrders([]);
    setMenuItems([]);
    setError("");
  };

  const handleExportOrders = () => {
    if (!managedOrders.length) {
      setError("No orders to export for this filter.");
      return;
    }

    const csv = buildOrdersCsv(managedOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = `masala-hub-${orderScope}-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadLink.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (order, status) => {
    setUpdatingOrderId(order.orderId);
    setError("");

    try {
      const data = await apiRequest(
        `/api/admin/orders/${encodeURIComponent(order.orderId)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": verifiedKey,
          },
          body: JSON.stringify({ status }),
        }
      );

      setAnalytics((currentAnalytics) =>
        currentAnalytics
          ? {
              ...currentAnalytics,
              recentOrders: currentAnalytics.recentOrders.map((recentOrder) =>
                recentOrder.orderId === order.orderId
                  ? {
                      ...recentOrder,
                      status: data.order.status,
                      statusUpdatedAt: new Date().toISOString(),
                    }
                  : recentOrder
              ),
            }
          : currentAnalytics
      );
      setManagedOrders((currentOrders) =>
        currentOrders.map((managedOrder) =>
          managedOrder.orderId === order.orderId
            ? {
                ...managedOrder,
                status: data.order.status,
                statusUpdatedAt: new Date().toISOString(),
              }
            : managedOrder
        )
      );
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUpdatingOrderId("");
    }
  };

  const handlePaymentStatusChange = async (order, paymentStatus) => {
    setUpdatingOrderId(order.orderId);
    setError("");

    try {
      const data = await apiRequest(
        `/api/admin/orders/${encodeURIComponent(order.orderId)}/payment-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": verifiedKey,
          },
          body: JSON.stringify({ paymentStatus }),
        }
      );

      setManagedOrders((currentOrders) =>
        currentOrders.map((managedOrder) =>
          managedOrder.orderId === order.orderId
            ? {
                ...managedOrder,
                payment: {
                  ...managedOrder.payment,
                  status: data.order.paymentStatus,
                },
              }
            : managedOrder
        )
      );
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUpdatingOrderId("");
    }
  };

  const loadAdminMenu = useCallback(async (key) => {
    const trimmedKey = String(key || "").trim();

    if (!trimmedKey) return;

    setIsMenuLoading(true);

    try {
      const data = await apiRequest("/api/admin/menu", {
        headers: {
          "x-admin-key": trimmedKey,
        },
      });

      setMenuItems(data.menu || []);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!verifiedKey || !analytics) return;

    loadAdminMenu(verifiedKey);
  }, [analytics, loadAdminMenu, verifiedKey]);

  const handleMenuFormChange = (event) => {
    const { checked, name, type, value } = event.target;

    setMenuForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditMenuItem = (item) => {
    setEditingMenuKey(item.cartKey);
    setMenuForm({
      cartKey: item.cartKey,
      category: item.category,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      image: item.image || "",
      available: item.available !== false,
    });
  };

  const handleNewMenuItem = () => {
    setEditingMenuKey("");
    setMenuForm(initialMenuForm);
  };

  const handleMenuSubmit = async (event) => {
    event.preventDefault();
    setIsMenuSaving(true);
    setError("");

    try {
      const path = editingMenuKey
        ? `/api/admin/menu/${encodeURIComponent(editingMenuKey)}`
        : "/api/admin/menu";
      const data = await apiRequest(path, {
        method: editingMenuKey ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": verifiedKey,
        },
        body: JSON.stringify({
          ...menuForm,
          price: Number(menuForm.price),
        }),
      });

      setMenuItems((currentItems) => {
        const exists = currentItems.some((item) => item.cartKey === data.item.cartKey);

        if (exists) {
          return currentItems.map((item) =>
            item.cartKey === data.item.cartKey ? data.item : item
          );
        }

        return [...currentItems, data.item].sort((firstItem, secondItem) =>
          `${firstItem.category}-${firstItem.menuId}`.localeCompare(
            `${secondItem.category}-${secondItem.menuId}`
          )
        );
      });
      setEditingMenuKey(data.item.cartKey);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsMenuSaving(false);
    }
  };

  if (!analytics) {
    return (
      <main className="admin-page admin-lock-page">
        <section className="admin-lock-panel">
          <span className="admin-lock-icon" aria-hidden="true">
            <LockKeyhole />
          </span>
          <p className="admin-eyebrow">Admin only</p>
          <h1>Order analytics dashboard</h1>
          <p>
            View daily, monthly, and yearly order calculations after entering
            the server admin access key.
          </p>

          <form className="admin-login-form" onSubmit={handleSubmit}>
            <label>
              Admin access key
              <input
                type="password"
                value={inputKey}
                onChange={(event) => {
                  setInputKey(event.target.value);
                  if (error) setError("");
                }}
                autoComplete="current-password"
                placeholder="Enter admin key"
              />
            </label>
            <button
              type="submit"
              className={isLoading ? "is-loading" : ""}
              disabled={isLoading}
            >
              {isLoading ? "Checking" : "Go to dashboard"}
            </button>
          </form>

          {error ? (
            <p className="admin-error" role="alert">
              <TriangleAlert aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">Admin dashboard</p>
          <h1>Order performance</h1>
          <p>
            Track order volume by day, month, and year with live totals from
            your stored order history.
          </p>
        </div>
        <div className="admin-actions">
          <span>
            <ShieldCheck aria-hidden="true" />
            Admin verified
          </span>
          <button type="button" onClick={() => loadAnalytics(verifiedKey)} disabled={isLoading}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={handleLock}>
            <LockKeyhole aria-hidden="true" />
            Lock
          </button>
        </div>
      </section>

      {error ? (
        <p className="admin-error admin-dashboard-error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <section className="admin-metrics" aria-label="Order totals">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="admin-snapshot" aria-label="Dashboard snapshot">
        {dashboardSnapshot.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <OrderBarChart
          title="Daily orders"
          subtitle="Current month, grouped by day"
          data={analytics.charts.daily}
          tone="orange"
        />
        <OrderBarChart
          title="Monthly orders"
          subtitle="Current year, grouped by month"
          data={analytics.charts.monthly}
          tone="green"
        />
      </div>

      <div className="admin-dashboard-grid admin-dashboard-grid-secondary">
        <OrderBarChart
          title="Yearly orders"
          subtitle="Last five years"
          data={analytics.charts.yearly}
          tone="blue"
        />

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Best sellers</h2>
              <p>Top dishes by quantity sold</p>
            </div>
            <PackageCheck aria-hidden="true" />
          </div>
          <div className="admin-ranked-list">
            {analytics.topItems.length ? (
              analytics.topItems.map((item, index) => (
                <div className="admin-ranked-row" key={`${item.name}-${item.category}`}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.category}</small>
                  </span>
                  <em>{formatNumber(item.quantity)} sold</em>
                </div>
              ))
            ) : (
              <p className="admin-empty-note">No order items yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="admin-lower-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Payment mix</h2>
              <p>Orders by selected payment method</p>
            </div>
          </div>
          <div className="admin-payment-list">
            {analytics.paymentMethods.length ? (
              analytics.paymentMethods.map((method) => (
                <div className="admin-payment-row" key={method.label}>
                  <span>{method.label}</span>
                  <strong>{formatNumber(method.orders)}</strong>
                </div>
              ))
            ) : (
              <p className="admin-empty-note">No payment data yet.</p>
            )}
          </div>
        </section>

        <section className="admin-panel admin-order-management">
          <div className="admin-panel-heading admin-order-heading">
            <div>
              <h2>Order management</h2>
              <p>Filter, inspect, update status, and export customer orders</p>
            </div>
            <div className="admin-order-tools">
              <label className="admin-order-search">
                <Search aria-hidden="true" />
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Search order, customer, phone, address, UTR"
                />
              </label>
              <div className="admin-order-scope" role="group" aria-label="Order filter">
                <button
                  type="button"
                  className={orderScope === "today" ? "is-active" : ""}
                  onClick={() => setOrderScope("today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={orderScope === "all" ? "is-active" : ""}
                  onClick={() => setOrderScope("all")}
                >
                  All
                </button>
              </div>
              <select
                className="admin-filter-select"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
                aria-label="Filter by order status"
              >
                <option value="">All order statuses</option>
                {orderStatusOptions.map((status) => (
                  <option value={status.value} key={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <select
                className="admin-filter-select"
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                aria-label="Filter by payment status"
              >
                <option value="">All payment statuses</option>
                {paymentStatusOptions.map((status) => (
                  <option value={status.value} key={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="admin-export-button"
                onClick={handleExportOrders}
                disabled={isOrdersLoading || !managedOrders.length}
              >
                <Download aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          {isOrdersLoading ? (
            <p className="admin-empty-note">Loading orders...</p>
          ) : managedOrders.length ? (
            <div className="admin-order-table">
              <div className="admin-order-table-head" aria-hidden="true">
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Total</span>
                <span>Details</span>
              </div>

              {managedOrders.map((order) => {
                const orderStatus = getOrderStatus(order.status);
                const paymentStatus = getPaymentStatus(order.payment?.status);
                const isUpdating = updatingOrderId === order.orderId;
                const itemCount = getOrderItemCount(order);

                return (
                  <article className="admin-order-row" key={order.orderId}>
                    <span className="admin-order-id">
                      <strong>{order.orderId}</strong>
                      <small>{formatDateTime(order.createdAt)}</small>
                    </span>
                    <span className="admin-order-customer">
                      <strong>{order.customer.name}</strong>
                      <small>{order.customer.phone}</small>
                    </span>
                    <span className="admin-status-stack">
                      <label className="admin-status-select">
                        <span>Order: {orderStatus.label}</span>
                        <select
                          value={orderStatus.value}
                          onChange={(event) => handleStatusChange(order, event.target.value)}
                          disabled={isUpdating}
                        >
                          {orderStatusOptions.map((status) => (
                            <option value={status.value} key={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-status-select">
                        <span>Payment: {paymentStatus.label}</span>
                        <select
                          value={paymentStatus.value}
                          onChange={(event) =>
                            handlePaymentStatusChange(order, event.target.value)
                          }
                          disabled={isUpdating}
                        >
                          {paymentStatusOptions.map((status) => (
                            <option value={status.value} key={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </span>
                    <span className="admin-order-total">
                      <b>{formatCurrency(order.totals.total)}</b>
                      <small>{formatNumber(itemCount)} items</small>
                    </span>
                    <details className="admin-order-details">
                      <summary>View</summary>
                      <div className="admin-order-detail-panel">
                        <dl>
                          <div>
                            <dt>Email</dt>
                            <dd>{order.customer.email}</dd>
                          </div>
                          <div>
                            <dt>Phone</dt>
                            <dd>{order.customer.phone}</dd>
                          </div>
                          <div>
                            <dt>Address</dt>
                            <dd>{order.customer.address}</dd>
                          </div>
                          <div>
                            <dt>Delivery timing</dt>
                            <dd>{formatFulfillmentTiming(order.fulfillment)}</dd>
                          </div>
                          <div>
                            <dt>Delivery zone</dt>
                            <dd>{getDeliveryZoneLabel(order.fulfillment?.deliveryZone)}</dd>
                          </div>
                          <div>
                            <dt>Food preference</dt>
                            <dd>{getSpicePreferenceLabel(order.fulfillment?.spicePreference)}</dd>
                          </div>
                          <div>
                            <dt>Delivery handoff</dt>
                            <dd>{getHandoffPreferenceLabel(order.fulfillment?.handoffPreference)}</dd>
                          </div>
                          {order.fulfillment?.deliveryNotes ? (
                            <div>
                              <dt>Delivery notes</dt>
                              <dd>{order.fulfillment.deliveryNotes}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt>Payment</dt>
                            <dd>{order.payment.displayName || order.payment.method || "Not available"}</dd>
                          </div>
                          <div>
                            <dt>Payment status</dt>
                            <dd>{paymentStatus.label}</dd>
                          </div>
                          {order.review ? (
                            <div>
                              <dt>Customer review</dt>
                              <dd>
                                {order.review.rating}/5
                                {order.review.comment ? ` - ${order.review.comment}` : ""}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                        <div className="admin-order-items">
                          {(order.items || []).map((item) => (
                            <span key={`${order.orderId}-${item.cartKey || item.name}`}>
                              {item.quantity} x {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="admin-empty-note">
              {orderScope === "today" ? "No orders found for today." : "No orders found."}
            </p>
          )}
        </section>
      </div>

      <section className="admin-panel admin-menu-management">
        <div className="admin-panel-heading admin-menu-heading">
          <div>
            <h2>Menu management</h2>
            <p>Add dishes, edit prices/images, and pause unavailable items.</p>
          </div>
          <div className="admin-order-tools">
            <button
              type="button"
              className="admin-export-button"
              onClick={() => loadAdminMenu(verifiedKey)}
              disabled={isMenuLoading}
            >
              <RefreshCw aria-hidden="true" />
              Refresh menu
            </button>
            <button
              type="button"
              className="admin-export-button"
              onClick={handleNewMenuItem}
            >
              <Plus aria-hidden="true" />
              New item
            </button>
          </div>
        </div>

        <div className="admin-menu-grid">
          <form className="admin-menu-form" onSubmit={handleMenuSubmit}>
            <span className="admin-form-kicker">
              <Utensils aria-hidden="true" />
              {editingMenuKey ? `Editing ${editingMenuKey}` : "New menu item"}
            </span>

            <label>
              Category
              <select
                name="category"
                value={menuForm.category}
                onChange={handleMenuFormChange}
                disabled={Boolean(editingMenuKey)}
              >
                {categoryOptions.map((category) => (
                  <option value={category.value} key={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Name
              <input
                name="name"
                value={menuForm.name}
                onChange={handleMenuFormChange}
                placeholder="Dish name"
                required
              />
            </label>

            <label>
              Price
              <input
                name="price"
                type="number"
                min="1"
                step="1"
                value={menuForm.price}
                onChange={handleMenuFormChange}
                placeholder="120"
                required
              />
            </label>

            <label className="admin-menu-full">
              Image path or URL
              <input
                name="image"
                value={menuForm.image}
                onChange={handleMenuFormChange}
                placeholder="/Vegitems/Veg Biryani.jpg"
              />
            </label>

            <label className="admin-menu-full">
              Description
              <textarea
                name="description"
                value={menuForm.description}
                onChange={handleMenuFormChange}
                rows="3"
                placeholder="Short menu description"
              />
            </label>

            <label className="admin-menu-toggle">
              <input
                type="checkbox"
                name="available"
                checked={menuForm.available}
                onChange={handleMenuFormChange}
              />
              Available for customers
            </label>

            <button type="submit" className="admin-menu-save" disabled={isMenuSaving}>
              <Save aria-hidden="true" />
              {isMenuSaving ? "Saving" : "Save menu item"}
            </button>
          </form>

          <div className="admin-menu-list">
            {isMenuLoading ? (
              <p className="admin-empty-note">Loading menu...</p>
            ) : menuItems.length ? (
              menuItems.map((item) => (
                <article
                  className={`admin-menu-row${item.available === false ? " is-paused" : ""}`}
                  key={item.cartKey}
                >
                  <img src={item.image} alt="" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {categoryMeta[item.category]?.label || item.category} - Rs {item.price}
                    </small>
                    <em>{item.available === false ? "Unavailable" : "Available"}</em>
                  </span>
                  <button type="button" onClick={() => handleEditMenuItem(item)}>
                    <Edit3 aria-hidden="true" />
                    Edit
                  </button>
                </article>
              ))
            ) : (
              <p className="admin-empty-note">No menu items found.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Admin;
