export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "");

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));

export const getPasswordIssues = (password) => {
  const value = String(password || "");
  const issues = [];

  if (value.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(value)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(value)) issues.push("one lowercase letter");
  if (!/\d/.test(value)) issues.push("one number");

  return issues;
};

export const validatePassword = (password) => {
  const issues = getPasswordIssues(password);

  if (issues.length) {
    return {
      valid: false,
      message: `Password must include ${issues.join(", ")}.`,
    };
  }

  return { valid: true, message: "" };
};

export const validatePersonName = (name, label = "Name") => {
  const value = String(name || "").trim();

  if (value.length < 2) {
    return { valid: false, message: `${label} must be at least 2 characters.` };
  }

  if (!/^[a-zA-Z][a-zA-Z\s.'-]*$/.test(value)) {
    return { valid: false, message: `${label} can only contain letters, spaces, apostrophes, periods, or hyphens.` };
  }

  return { valid: true, message: "" };
};

export const validatePhone = (phone, { required = true } = {}) => {
  const digits = normalizePhone(phone);

  if (!digits) {
    return {
      valid: !required,
      message: required ? "Phone number is required." : "",
    };
  }

  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      message: "Enter a valid phone number with 10 to 15 digits.",
    };
  }

  return { valid: true, message: "" };
};

export const validateEmail = (email) =>
  isValidEmail(email)
    ? { valid: true, message: "" }
    : { valid: false, message: "Enter a valid email address." };
