import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { apiRequest } from "../api";
import { setCredentials, logout } from "../authSlice";
import {
  getPasswordIssues,
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
} from "../../../shared/validation";
import "../Auth.css";

const loginInitial = { email: "", password: "" };
const registerInitial = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
};
const forgotInitial = { email: "" };
const resetInitial = { code: "", newPassword: "" };

const getValidationMessage = (...validations) =>
  validations.find((validation) => !validation.valid)?.message || "";

function AuthField({ icon: Icon, label, type = "text", showPasswordToggle = false, ...inputProps }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = showPasswordToggle && type === "password";
  const inputType = isPasswordField && isPasswordVisible ? "text" : type;
  const PasswordIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <label className="auth-field">
      <span className="auth-field__label">{label}</span>
      <div className={`auth-field__control${isPasswordField ? " auth-field__control--with-toggle" : ""}`}>
        {Icon && (
          <span className="auth-field__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
        <input type={inputType} {...inputProps} />
        {isPasswordField ? (
          <button
            type="button"
            className="auth-field__password-toggle"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            onMouseDown={(event) => event.preventDefault()}
          >
            <PasswordIcon size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </label>
  );
}

export default function AuthPanel({ onSuccess }) {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  
  const [mode, setMode] = useState("login"); // login, register, forgot, reset
  const [loginForm, setLoginForm] = useState(loginInitial);
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [forgotForm, setForgotForm] = useState(forgotInitial);
  const [resetForm, setResetForm] = useState(resetInitial);
  const [resetEmail, setResetEmail] = useState(""); // cached email during reset flow
  
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [resetError, setResetError] = useState("");
  
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState("");
  const passwordIssues = getPasswordIssues(registerForm.password);

  const validateLoginForm = () =>
    getValidationMessage(
      validateEmail(loginForm.email),
      loginForm.password
        ? { valid: true, message: "" }
        : { valid: false, message: "Enter your password." }
    );

  const validateRegisterForm = () =>
    getValidationMessage(
      validatePersonName(registerForm.firstName, "First name"),
      validatePersonName(registerForm.lastName, "Last name"),
      validateEmail(registerForm.email),
      validatePhone(registerForm.phone, { required: true }),
      validatePassword(registerForm.password)
    );

  const validateForgotForm = () => getValidationMessage(validateEmail(forgotForm.email));

  const validateResetForm = () =>
    getValidationMessage(
      /^\d{6}$/.test(resetForm.code.trim())
        ? { valid: true, message: "" }
        : { valid: false, message: "Enter the 6-digit verification code." },
      validatePassword(resetForm.newPassword)
    );

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  };

  const handleForgotChange = (event) => {
    const { name, value } = event.target;
    setForgotForm((current) => ({ ...current, [name]: value }));
  };

  const handleResetChange = (event) => {
    const { name, value } = event.target;
    setResetForm((current) => ({ ...current, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError("");
    const validationMessage = validateLoginForm();

    if (validationMessage) {
      setLoginError(validationMessage);
      return;
    }

    setIsLoginLoading(true);

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(loginForm.email),
          password: loginForm.password,
        }),
      });

      dispatch(setCredentials({ user: data.user, token: data.token }));
      onSuccess?.();
    } catch (apiError) {
      setLoginError(apiError.message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setRegisterError("");

    const firstName = registerForm.firstName.trim();
    const lastName = registerForm.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const validationMessage = validateRegisterForm();

    if (validationMessage) {
      setRegisterError(validationMessage);
      return;
    }

    setIsRegisterLoading(true);

    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: normalizeEmail(registerForm.email),
          phone: normalizePhone(registerForm.phone),
          password: registerForm.password,
        }),
      });

      dispatch(setCredentials({ user: data.user, token: data.token }));
      onSuccess?.();
    } catch (apiError) {
      setRegisterError(apiError.message);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setIsForgotLoading(true);
    setForgotError("");
    setForgotSuccessMessage("");

    const validationMessage = validateForgotForm();
    const email = normalizeEmail(forgotForm.email);

    if (validationMessage) {
      setForgotError(validationMessage);
      setIsForgotLoading(false);
      return;
    }

    try {
      const data = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setResetEmail(email);
      setForgotSuccessMessage(data.message);

      setTimeout(() => {
        setMode("reset");
        setForgotSuccessMessage("");
      }, 1500);

    } catch (apiError) {
      setForgotError(apiError.message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setResetError("");
    const validationMessage = validateResetForm();

    if (validationMessage) {
      setResetError(validationMessage);
      return;
    }

    setIsResetLoading(true);

    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: resetForm.code.trim(),
          newPassword: resetForm.newPassword,
        }),
      });

      setForgotSuccessMessage("Password reset successfully! Please sign in.");
      
      setTimeout(() => {
        setMode("login");
        setForgotSuccessMessage("");
        setResetForm(resetInitial);
        setLoginForm((curr) => ({ ...curr, email: resetEmail }));
      }, 2000);

    } catch (apiError) {
      setResetError(apiError.message);
    } finally {
      setIsResetLoading(false);
    }
  };

  // If already logged in, show a premium details & signout view
  if (authUser) {
    return (
      <div className="auth-panel auth-panel--profile">
        <header className="auth-panel__head">
          <div className="auth-profile-avatar" aria-hidden="true">
            {authUser.name ? authUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <h2>{authUser.name}</h2>
          <p className="auth-profile-email">{authUser.email}</p>
        </header>

        <div className="auth-profile-details">
          <div className="auth-profile-row">
            <span className="auth-profile-label">Phone</span>
            <span className="auth-profile-value">{authUser.phone || "Not provided"}</span>
          </div>
          <div className="auth-profile-row">
            <span className="auth-profile-label">Member Since</span>
            <span className="auth-profile-value">
              {authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              }) : "Recently"}
            </span>
          </div>
        </div>

        <div className="auth-form__actions" style={{ marginTop: "24px" }}>
          <button
            type="button"
            className="auth-submit auth-submit--logout"
            onClick={() => {
              dispatch(logout());
              onSuccess?.();
            }}
          >
            Sign Out of Masala HUB
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      {/* Navigation header for forgot/reset modes to go back */}
      {(mode === "forgot" || mode === "reset") && (
        <button
          type="button"
          className="auth-back-btn"
          onClick={() => {
            setMode(mode === "reset" ? "forgot" : "login");
            setForgotError("");
            setResetError("");
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      )}

      <header className="auth-panel__head">
        <img className="auth-panel__logo" src="/masala-hub-logo.svg" alt="" aria-hidden="true" />
        <h2>
          {mode === "login" && "Welcome back"}
          {mode === "register" && "Join Masala HUB"}
          {mode === "forgot" && "Reset Password"}
          {mode === "reset" && "Enter Reset Code"}
        </h2>
        <p>
          {mode === "login" && "Sign in to order faster and track your meals."}
          {mode === "register" && "Create an account for quick checkout and order history."}
          {mode === "forgot" && "We'll send a 6-digit OTP code to your email."}
          {mode === "reset" && `Enter the verification code sent to ${resetEmail}`}
        </p>
      </header>

      {/* Tabs are only visible for Login & Register modes */}
      {(mode === "login" || mode === "register") && (
        <div className="auth-tabs" role="tablist" aria-label="Account type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setRegisterError("");
            }}
          >
            I have an account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setLoginError("");
            }}
          >
            New here
          </button>
        </div>
      )}

      {mode === "login" && (
        <form className="auth-form" onSubmit={handleLoginSubmit}>
          <AuthField
            icon={Mail}
            label="Email"
            id="auth-login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username email"
            placeholder="you@example.com"
            value={loginForm.email}
            onChange={handleLoginChange}
            required
          />
          <div className="auth-password-wrapper">
            <AuthField
              icon={Lock}
              label="Password"
              name="password"
              type="password"
              showPasswordToggle
              autoComplete="current-password"
              placeholder="At least 8 characters"
              value={loginForm.password}
              onChange={handleLoginChange}
              minLength={8}
              required
            />
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                setMode("forgot");
                setLoginError("");
              }}
            >
              Forgot password?
            </button>
          </div>

          {loginError ? <p className="auth-error">{loginError}</p> : null}

          <div className="auth-form__actions">
            <button type="submit" className="auth-submit" disabled={isLoginLoading}>
              {isLoginLoading ? "Signing in..." : "Sign in to Masala HUB"}
            </button>
          </div>
        </form>
      )}

      {mode === "register" && (
        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="auth-name-row">
            <AuthField
              icon={User}
              label="First name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={registerForm.firstName}
              onChange={handleRegisterChange}
              required
            />
            <AuthField
              label="Last name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              value={registerForm.lastName}
              onChange={handleRegisterChange}
              required
            />
          </div>

          <AuthField
            icon={Mail}
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={registerForm.email}
            onChange={handleRegisterChange}
            required
          />
          <AuthField
            icon={Phone}
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Mobile number"
            value={registerForm.phone}
            onChange={handleRegisterChange}
            required
          />
          <AuthField
            icon={Lock}
            label="Password"
            name="password"
            type="password"
            showPasswordToggle
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={registerForm.password}
            onChange={handleRegisterChange}
            minLength={8}
            required
          />
          <p className={`auth-password-hint${passwordIssues.length ? "" : " is-valid"}`}>
            {passwordIssues.length
              ? `Needs ${passwordIssues.join(", ")}.`
              : "Strong password ready."}
          </p>

          {registerError ? <p className="auth-error">{registerError}</p> : null}

          <div className="auth-form__actions">
            <button type="submit" className="auth-submit" disabled={isRegisterLoading}>
              {isRegisterLoading ? "Creating account..." : "Create my account"}
            </button>
          </div>
        </form>
      )}

      {mode === "forgot" && (
        <form className="auth-form" onSubmit={handleForgotSubmit}>
          <AuthField
            icon={Mail}
            label="Email Address"
            name="email"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={forgotForm.email}
            onChange={handleForgotChange}
            required
          />

          {forgotError ? <p className="auth-error">{forgotError}</p> : null}
          {forgotSuccessMessage ? (
            <p className="auth-success">
              <CheckCircle size={16} />
              <span>{forgotSuccessMessage}</span>
            </p>
          ) : null}

          <div className="auth-form__actions">
            <button type="submit" className="auth-submit" disabled={isForgotLoading}>
              {isForgotLoading ? "Sending code..." : "Send Reset Code"}
            </button>
          </div>
        </form>
      )}

      {mode === "reset" && (
        <form className="auth-form" onSubmit={handleResetSubmit}>
          <AuthField
            icon={Key}
            label="Verification Code (6-Digit OTP)"
            name="code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            maxLength={6}
            value={resetForm.code}
            onChange={handleResetChange}
            required
          />

          <AuthField
            icon={Lock}
            label="New Password"
            name="newPassword"
            type="password"
            showPasswordToggle
            placeholder="At least 8 characters"
            value={resetForm.newPassword}
            onChange={handleResetChange}
            minLength={8}
            required
          />

          {resetError ? <p className="auth-error">{resetError}</p> : null}
          {forgotSuccessMessage ? (
            <p className="auth-success">
              <CheckCircle size={16} />
              <span>{forgotSuccessMessage}</span>
            </p>
          ) : null}

          <div className="auth-form__actions">
            <button type="submit" className="auth-submit" disabled={isResetLoading}>
              {isResetLoading ? "Resetting password..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
