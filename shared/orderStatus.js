export const orderStatusOptions = [
  {
    value: "received",
    label: "Received",
    detail: "We received your order and are lining it up for preparation.",
    tone: "new",
    activeIndex: 0,
  },
  {
    value: "preparing",
    label: "Preparing",
    detail: "The kitchen is preparing your food.",
    tone: "active",
    activeIndex: 1,
  },
  {
    value: "out_for_delivery",
    label: "On the way",
    detail: "Your order is heading to the delivery address.",
    tone: "info",
    activeIndex: 2,
  },
  {
    value: "delivered",
    label: "Delivered",
    detail: "Order delivered. Enjoy your meal.",
    tone: "success",
    activeIndex: 3,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    detail: "This order was cancelled. Contact support if this looks wrong.",
    tone: "danger",
    activeIndex: -1,
  },
];

export const defaultOrderStatus = "received";

export const orderStatusValues = orderStatusOptions.map((status) => status.value);

export const normalizeOrderStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  return orderStatusValues.includes(value) ? value : defaultOrderStatus;
};

export const isValidOrderStatus = (status) =>
  orderStatusValues.includes(String(status || "").trim().toLowerCase());

export const getOrderStatus = (status) =>
  orderStatusOptions.find((option) => option.value === normalizeOrderStatus(status)) ||
  orderStatusOptions[0];

export const getOrderStatusLabel = (status) => getOrderStatus(status).label;
