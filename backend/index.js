import "dotenv/config";

import cors from "cors";
import express from "express";
import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateOrderTotals, validateCoupon } from "../shared/pricing.js";
import { normalizeEmail, validateEmail, validatePassword } from "../shared/validation.js";
import { verifyPassword } from "./auth/password.js";
import { createAuthToken, verifyAuthToken } from "./auth/tokens.js";
import {
  createUser,
  getDatabaseStatus,
  getAdminOrders,
  getCustomerOrderHistory,
  getMenuItems,
  getOrderAnalytics,
  getOrderByOrderId,
  getRecentOrders,
  getUserByEmail,
  getUserById,
  initializeDatabase,
  markOrderEmailSent,
  saveMenuItem,
  saveOrder,
  saveOrderReview,
  updateOrderPaymentStatus,
  updateOrderStatus,
  updateUserPassword,
} from "./db/mysql.js";
import {
  sendForgotPasswordEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
} from "./email/mailer.js";
import { buildOrderFromPayload } from "./utils/orderBuilder.js";

const app = express();
const resetCodes = new Map();
const port = Number(process.env.PORT || 5000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");
const passwordResetAcceptedMessage =
  "If an account exists for that email, a reset code has been sent.";

const defaultAllowedOrigins = [
  "http://127.0.0.1:2002",
  "http://localhost:2002",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
  "http://127.0.0.1:5000",
  "http://localhost:5000",
];

const configuredAllowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  ...new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins]),
];

const getAdminAccessKey = () => String(process.env.ADMIN_ACCESS_KEY || "").trim();

const getBearerToken = (req) => {
  const authorization = String(req.get("authorization") || "");
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
};

const getRequestAuthPayload = (req) => {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch (error) {
    error.statusCode = 401;
    throw error;
  }
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getOrderHistoryLookup = async (req) => {
  const forceGuestLookup =
    String(req.query.lookup || "").trim().toLowerCase() === "guest";

  if (!forceGuestLookup) {
    const authPayload = getRequestAuthPayload(req);

    if (authPayload) {
      const user = await getUserById(authPayload.sub);

      if (!user) {
        throw createHttpError("Account not found.", 401);
      }

      return {
        mode: "account",
        email: user.email,
        phone: user.phone,
        limit: req.query.limit,
      };
    }
  }

  return {
    mode: "guest",
    email: req.query.email,
    phone: req.query.phone,
    limit: req.query.limit,
  };
};

const requireAuth = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Sign in to continue.",
    });
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Sign in to continue.",
    });
  }
};

const requireAdmin = (req, res, next) => {
  const providedKey = String(req.get("x-admin-key") || "").trim();
  const adminAccessKey = getAdminAccessKey();

  if (!adminAccessKey) {
    return res.status(503).json({
      message: "Admin access key is not configured.",
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      message: "Admin access key is required.",
    });
  }

  if (providedKey !== adminAccessKey) {
    return res.status(401).json({
      message: "Enter the correct admin access key.",
    });
  }

  next();
};

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ""));

const apiCors = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS."));
  },
});

app.use("/api", apiCors);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "masala-hub-api",
    auth: true,
    database: getDatabaseStatus(),
  });
});

app.get("/api/menu", async (req, res) => {
  try {
    const menu = await getMenuItems({
      category: req.query.category,
      includeUnavailable: req.query.includeUnavailable === "true",
    });

    return res.json({ menu });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to load menu.",
      database: getDatabaseStatus(),
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await createUser(req.body);
    const token = createAuthToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to create account.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const emailValidation = validateEmail(email);

    if (!email || !password) {
      return res.status(400).json({
        message: "Enter your email and password.",
      });
    }

    if (!emailValidation.valid) {
      return res.status(400).json({
        message: emailValidation.message,
      });
    }

    const storedUser = await getUserByEmail(email);

    if (!storedUser) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await verifyPassword(password, storedUser.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = await getUserById(storedUser.id);
    const token = createAuthToken(user);

    return res.json({ user, token });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to sign in.",
    });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.sub);

    if (!user) {
      return res.status(401).json({
        message: "Account not found.",
      });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to load account.",
    });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const emailValidation = validateEmail(email);

    if (!email) {
      return res.status(400).json({
        message: "Enter your email address.",
      });
    }

    if (!emailValidation.valid) {
      return res.status(400).json({
        message: emailValidation.message,
      });
    }

    const storedUser = await getUserByEmail(email);

    if (!storedUser) {
      return res.json({
        message: passwordResetAcceptedMessage,
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    resetCodes.set(email, { code: otp, expiresAt });

    await sendForgotPasswordEmail(email, storedUser.name, otp);

    return res.json({
      message: passwordResetAcceptedMessage,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to process request.",
    });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(newPassword);

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (!emailValidation.valid) {
      return res.status(400).json({
        message: emailValidation.message,
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Enter the 6-digit verification code.",
      });
    }

    if (!passwordValidation.valid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }

    const record = resetCodes.get(email);

    if (!record) {
      return res.status(400).json({
        message: "Invalid or expired verification code.",
      });
    }

    if (Date.now() > record.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({
        message: "Verification code has expired.",
      });
    }

    if (record.code !== code) {
      return res.status(400).json({
        message: "Invalid verification code.",
      });
    }

    await updateUserPassword(email, newPassword);
    resetCodes.delete(email);

    return res.json({
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to reset password.",
    });
  }
});

app.post("/api/coupons/validate", (req, res) => {
  const subtotal = Number(req.body.subtotal || 0);
  const result = validateCoupon(req.body.code, subtotal);

  if (!result.valid) {
    return res.status(400).json(result);
  }

  return res.json({
    ...result,
    totals: calculateOrderTotals([{ price: subtotal, quantity: 1 }], result.coupon.code),
  });
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = await buildOrderFromPayload(req.body);
    const databaseInfo = await saveOrder(order);
    let emailInfo = {
      sentForReal: false,
      accepted: [],
      messageId: null,
      error: null,
    };

    try {
      emailInfo = await sendOrderConfirmationEmail(order);

      if (emailInfo.sentForReal) {
        try {
          await markOrderEmailSent(order.orderId, emailInfo);
        } catch (emailRecordError) {
          console.error(
            "Unable to record order confirmation email.",
            emailRecordError.message
          );
        }
      }
    } catch (emailError) {
      console.error("Unable to send order confirmation email.", emailError.message);
      emailInfo = {
        sentForReal: false,
        accepted: [],
        messageId: null,
        error: "Receipt email could not be sent.",
      };
    }

    return res.status(201).json({
      order,
      database: databaseInfo,
      email: {
        sent: Boolean(emailInfo.sentForReal),
        accepted: emailInfo.accepted || [],
        messageId: emailInfo.messageId,
        error: emailInfo.error,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to place order.",
    });
  }
});

app.get("/api/orders/history", async (req, res) => {
  try {
    const lookup = await getOrderHistoryLookup(req);
    const orders = await getCustomerOrderHistory(lookup);

    return res.json({
      orders,
      lookup: {
        mode: lookup.mode,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      message: error.message || "Unable to load order history.",
    });
  }
});

app.post("/api/orders/:orderId/review", async (req, res) => {
  try {
    const review = await saveOrderReview({
      orderId: req.params.orderId,
      email: req.body.email,
      phone: req.body.phone,
      rating: req.body.rating,
      comment: req.body.comment,
    });

    return res.status(201).json({ review });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to save review.",
    });
  }
});

app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await getRecentOrders(req.query.limit);
    return res.json({ orders });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to load orders.",
      database: getDatabaseStatus(),
    });
  }
});

app.get("/api/admin/order-analytics", requireAdmin, async (_req, res) => {
  try {
    const analytics = await getOrderAnalytics();
    return res.json({ analytics });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to load admin analytics.",
      database: getDatabaseStatus(),
    });
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await getAdminOrders({
      scope: req.query.scope,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      search: req.query.search,
      limit: req.query.limit,
    });

    return res.json({
      orders,
      filters: {
        scope: req.query.scope || "today",
        status: req.query.status || "",
        paymentStatus: req.query.paymentStatus || "",
        search: req.query.search || "",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to load admin orders.",
      database: getDatabaseStatus(),
    });
  }
});

app.patch("/api/admin/orders/:orderId/status", requireAdmin, async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.orderId, req.body.status);
    const fullOrder = await getOrderByOrderId(req.params.orderId);

    if (fullOrder) {
      sendOrderStatusUpdateEmail(fullOrder).catch((emailError) => {
        console.error("Unable to send order status email.", emailError.message);
      });
    }

    return res.json({ order });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to update order status.",
      database: getDatabaseStatus(),
    });
  }
});

app.patch("/api/admin/orders/:orderId/payment-status", requireAdmin, async (req, res) => {
  try {
    const order = await updateOrderPaymentStatus(
      req.params.orderId,
      req.body.paymentStatus
    );
    return res.json({ order });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to update payment status.",
      database: getDatabaseStatus(),
    });
  }
});

app.get("/api/admin/menu", requireAdmin, async (_req, res) => {
  try {
    const menu = await getMenuItems({ includeUnavailable: true });
    return res.json({ menu });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to load admin menu.",
      database: getDatabaseStatus(),
    });
  }
});

app.post("/api/admin/menu", requireAdmin, async (req, res) => {
  try {
    const item = await saveMenuItem(req.body);
    return res.status(201).json({ item });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to save menu item.",
      database: getDatabaseStatus(),
    });
  }
});

app.put("/api/admin/menu/:cartKey", requireAdmin, async (req, res) => {
  try {
    const item = await saveMenuItem({
      ...req.body,
      cartKey: req.params.cartKey,
    });
    return res.json({ item });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Unable to update menu item.",
      database: getDatabaseStatus(),
    });
  }
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}

initializeDatabase()
  .then((status) => {
    if (status.connected) {
      console.log(
        `MySQL connected to ${status.database} at ${status.host}:${status.port}`
      );
    } else {
      console.log("MySQL storage is disabled.");
    }
  })
  .catch((error) => {
    console.error(
      "MySQL connection failed. Check DB_USER and DB_PASSWORD in .env.",
      error.message
    );
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Masala HUB API running on http://127.0.0.1:${port}`);
    });
  });
