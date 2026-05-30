export const deliveryZoneOptions = [
  {
    value: "central",
    label: "Central zone",
    distanceLabel: "0-3 km",
    deliveryFee: 25,
    etaMinutes: 30,
    description: "Closest delivery area with the fastest handoff.",
  },
  {
    value: "nearby",
    label: "Nearby zone",
    distanceLabel: "3-6 km",
    deliveryFee: 40,
    etaMinutes: 40,
    description: "Standard delivery area around the kitchen.",
  },
  {
    value: "outer",
    label: "Outer zone",
    distanceLabel: "6-10 km",
    deliveryFee: 70,
    etaMinutes: 55,
    description: "Farther addresses with a longer delivery route.",
  },
  {
    value: "extended",
    label: "Extended zone",
    distanceLabel: "10-15 km",
    deliveryFee: 100,
    etaMinutes: 70,
    description: "Long-distance delivery for supported nearby towns.",
  },
];

export const defaultDeliveryZone = "nearby";

export const deliveryZoneValues = deliveryZoneOptions.map((zone) => zone.value);

export const normalizeDeliveryZone = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return deliveryZoneValues.includes(normalizedValue)
    ? normalizedValue
    : defaultDeliveryZone;
};

export const getDeliveryZone = (value) =>
  deliveryZoneOptions.find((zone) => zone.value === normalizeDeliveryZone(value)) ||
  deliveryZoneOptions.find((zone) => zone.value === defaultDeliveryZone);

export const getDeliveryZoneLabel = (value) => {
  const zone = getDeliveryZone(value);
  return `${zone.label} (${zone.distanceLabel})`;
};

export const getDeliveryZoneFee = (value) => getDeliveryZone(value).deliveryFee;
