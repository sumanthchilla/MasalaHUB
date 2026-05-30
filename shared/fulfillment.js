export const scheduleTypeOptions = [
  { value: "asap", label: "ASAP" },
  { value: "scheduled", label: "Scheduled" },
];

export const spicePreferenceOptions = [
  { value: "regular", label: "Regular spice" },
  { value: "less_spicy", label: "Less spicy" },
  { value: "extra_spicy", label: "Extra spicy" },
];

export const handoffPreferenceOptions = [
  { value: "meet_at_door", label: "Meet at door" },
  { value: "call_before_delivery", label: "Call before delivery" },
  { value: "leave_at_door", label: "Leave at door" },
];

const normalizeOption = (value, options, fallback) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return options.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : fallback;
};

const getOptionLabel = (value, options, fallback) =>
  options.find((option) => option.value === value)?.label || fallback;

export const normalizeScheduleType = (value) =>
  normalizeOption(value, scheduleTypeOptions, "asap");

export const normalizeSpicePreference = (value) =>
  normalizeOption(value, spicePreferenceOptions, "regular");

export const normalizeHandoffPreference = (value) =>
  normalizeOption(value, handoffPreferenceOptions, "meet_at_door");

export const getScheduleTypeLabel = (value) =>
  getOptionLabel(normalizeScheduleType(value), scheduleTypeOptions, "ASAP");

export const getSpicePreferenceLabel = (value) =>
  getOptionLabel(normalizeSpicePreference(value), spicePreferenceOptions, "Regular spice");

export const getHandoffPreferenceLabel = (value) =>
  getOptionLabel(normalizeHandoffPreference(value), handoffPreferenceOptions, "Meet at door");
