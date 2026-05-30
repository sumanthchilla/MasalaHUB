import mysql from "mysql2/promise";

import {
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
} from "../../shared/validation.js";
import {
  categoryMeta,
  findMenuItemByCartKey,
  menuItems,
} from "../../shared/menuItems.js";
import {
  defaultOrderStatus,
  isValidOrderStatus,
  normalizeOrderStatus,
} from "../../shared/orderStatus.js";
import {
  defaultPaymentStatus,
  isValidPaymentStatus,
  normalizePaymentStatus,
} from "../../shared/paymentStatus.js";
import { normalizeDeliveryZone } from "../../shared/deliveryZones.js";
import { hashPassword } from "../auth/password.js";

const identifierPattern = /^[a-zA-Z0-9_]+$/;

const getDatabaseName = () => {
  const databaseName = process.env.DB_NAME || "masala_hub_app";

  if (!identifierPattern.test(databaseName)) {
    throw new Error("DB_NAME can only contain letters, numbers, and underscores.");
  }

  return databaseName;
};

const getBaseConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

const isDatabaseEnabled = () => process.env.DB_ENABLED !== "false";

let pool;
let initPromise;
let lastDatabaseError = null;

const orderPaymentColumns = [
  { name: "payment_method", definition: "VARCHAR(40) NULL" },
  { name: "payment_display_name", definition: "VARCHAR(160) NULL" },
  { name: "payment_reference", definition: "VARCHAR(80) NULL" },
  { name: "payment_order_reference", definition: "VARCHAR(80) NULL" },
  { name: "payment_status", definition: `VARCHAR(40) NOT NULL DEFAULT '${defaultPaymentStatus}'` },
];

const orderStatusColumns = [
  {
    name: "order_status",
    definition: `VARCHAR(40) NOT NULL DEFAULT '${defaultOrderStatus}'`,
    after: "payment_status",
  },
  {
    name: "status_updated_at",
    definition: "DATETIME NULL",
    after: "order_status",
  },
];

const orderFulfillmentColumns = [
  { name: "delivery_zone", definition: "VARCHAR(40) NOT NULL DEFAULT 'nearby'", after: "customer_address" },
  { name: "schedule_type", definition: "VARCHAR(40) NOT NULL DEFAULT 'asap'", after: "customer_address" },
  { name: "scheduled_delivery_time", definition: "DATETIME NULL", after: "schedule_type" },
  { name: "delivery_notes", definition: "TEXT NULL", after: "scheduled_delivery_time" },
  { name: "spice_preference", definition: "VARCHAR(40) NOT NULL DEFAULT 'regular'", after: "delivery_notes" },
  { name: "handoff_preference", definition: "VARCHAR(80) NOT NULL DEFAULT 'meet_at_door'", after: "spice_preference" },
];

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const assertDatabaseReady = async () => {
  await initializeDatabase();

  if (!pool) {
    throw new Error("Database storage is disabled.");
  }
};

const toNumber = (value) => Number(value || 0);

const normalizeDate = (value) =>
  value instanceof Date ? value.toISOString() : value;

const isValidCategory = (category) =>
  Object.prototype.hasOwnProperty.call(categoryMeta, category);

const normalizeMenuRow = (row) =>
  row
    ? {
        id: row.cartKey || row.cart_key,
        cartKey: row.cartKey || row.cart_key,
        menuId: Number(row.menuId ?? row.menu_id),
        category: row.category,
        name: row.name,
        description: row.description || "",
        price: toNumber(row.price),
        image: row.image || "",
        available: Boolean(row.available),
        updatedAt: normalizeDate(row.updatedAt || row.updated_at),
      }
    : null;

const seedMenuItems = async () => {
  for (const item of menuItems) {
    await pool.execute(
      `
        INSERT INTO menu_items (
          cart_key,
          menu_id,
          category,
          name,
          description,
          price,
          image,
          available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE cart_key = cart_key
      `,
      [
        item.cartKey,
        item.menuId,
        item.category,
        item.name,
        item.description,
        item.price,
        item.image,
      ]
    );
  }
};

const ensureOrderColumns = async () => {
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME AS columnName
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
  `);
  const existingColumns = new Set(
    columns.map((column) => column.columnName || column.COLUMN_NAME)
  );

  for (const column of orderPaymentColumns) {
    if (!existingColumns.has(column.name)) {
      await pool.execute(
        `ALTER TABLE orders ADD COLUMN ${column.name} ${column.definition} AFTER total`
      );
    }
  }

  for (const column of orderStatusColumns) {
    if (!existingColumns.has(column.name)) {
      await pool.execute(
        `ALTER TABLE orders ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}`
      );
    }
  }

  for (const column of orderFulfillmentColumns) {
    if (!existingColumns.has(column.name)) {
      await pool.execute(
        `ALTER TABLE orders ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}`
      );
    }
  }
};

const createTables = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(40) NOT NULL,
      created_at DATETIME NOT NULL,
      estimated_delivery_time VARCHAR(30) NOT NULL,
      customer_name VARCHAR(120) NOT NULL,
      customer_email VARCHAR(180) NOT NULL,
      customer_phone VARCHAR(40) NOT NULL,
      customer_address TEXT NOT NULL,
      delivery_zone VARCHAR(40) NOT NULL DEFAULT 'nearby',
      schedule_type VARCHAR(40) NOT NULL DEFAULT 'asap',
      scheduled_delivery_time DATETIME NULL,
      delivery_notes TEXT NULL,
      spice_preference VARCHAR(40) NOT NULL DEFAULT 'regular',
      handoff_preference VARCHAR(80) NOT NULL DEFAULT 'meet_at_door',
      coupon_code VARCHAR(40) NULL,
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(40) NULL,
      payment_display_name VARCHAR(160) NULL,
      payment_reference VARCHAR(80) NULL,
      payment_order_reference VARCHAR(80) NULL,
      payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
      order_status VARCHAR(40) NOT NULL DEFAULT 'received',
      status_updated_at DATETIME NULL,
      email_message_id VARCHAR(255) NULL,
      email_accepted JSON NULL,
      email_sent_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY orders_order_id_unique (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      cart_key VARCHAR(80) NOT NULL,
      item_name VARCHAR(160) NOT NULL,
      category VARCHAR(40) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      line_total DECIMAL(10, 2) NOT NULL,
      image_path VARCHAR(255) NULL,
      PRIMARY KEY (id),
      KEY order_items_order_id_index (order_id),
      CONSTRAINT order_items_order_id_fk
        FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL,
      phone VARCHAR(40) NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cart_key VARCHAR(80) NOT NULL,
      menu_id INT NOT NULL,
      category VARCHAR(40) NOT NULL,
      name VARCHAR(160) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      image VARCHAR(255) NULL,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY menu_items_cart_key_unique (cart_key),
      KEY menu_items_category_index (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT NULL,
      customer_email VARCHAR(180) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY order_reviews_order_id_unique (order_id),
      CONSTRAINT order_reviews_order_id_fk
        FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureOrderColumns();
  await seedMenuItems();
};

const normalizeUser = (row) =>
  row
    ? {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        phone: row.phone || "",
        createdAt: normalizeDate(row.createdAt || row.created_at),
      }
    : null;

export async function createUser({ name, email, phone, password }) {
  await assertDatabaseReady();

  const trimmedName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const trimmedPhone = String(phone || "").trim();
  const plainPassword = String(password || "");
  const nameValidation = validatePersonName(trimmedName, "Full name");
  const emailValidation = validateEmail(normalizedEmail);
  const phoneValidation = validatePhone(trimmedPhone, { required: true });
  const passwordValidation = validatePassword(plainPassword);

  if (!nameValidation.valid) throw new Error(nameValidation.message);

  if (!emailValidation.valid) throw new Error(emailValidation.message);

  if (!phoneValidation.valid) throw new Error(phoneValidation.message);

  if (!passwordValidation.valid) throw new Error(passwordValidation.message);

  const passwordHash = await hashPassword(plainPassword);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO users (name, email, phone, password_hash)
        VALUES (?, ?, ?, ?)
      `,
      [trimmedName, normalizedEmail, normalizePhone(trimmedPhone), passwordHash]
    );

    return getUserById(Number(result.insertId));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("An account with this email already exists.");
    }

    throw error;
  }
}

export async function updateUserPassword(email, password) {
  await assertDatabaseReady();

  const normalizedEmail = normalizeEmail(email);
  const plainPassword = String(password || "");
  const emailValidation = validateEmail(normalizedEmail);
  const passwordValidation = validatePassword(plainPassword);

  if (!emailValidation.valid) throw new Error(emailValidation.message);

  if (!passwordValidation.valid) throw new Error(passwordValidation.message);

  const passwordHash = await hashPassword(plainPassword);

  const [result] = await pool.execute(
    `
      UPDATE users
      SET password_hash = ?
      WHERE email = ?
    `,
    [passwordHash, normalizedEmail]
  );

  if (result.affectedRows === 0) {
    throw new Error("User not found.");
  }

  return true;
}

export async function getUserByEmail(email) {
  await assertDatabaseReady();

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        created_at AS createdAt
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return rows[0] || null;
}

export async function getUserById(id) {
  await assertDatabaseReady();

  const userId = Number(id);

  if (!userId) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        created_at AS createdAt
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return normalizeUser(rows[0]);
}

export async function initializeDatabase() {
  if (!isDatabaseEnabled()) {
    lastDatabaseError = null;
    return { connected: false, enabled: false };
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const databaseName = getDatabaseName();
    const baseConfig = getBaseConfig();
    const setupConnection = await mysql.createConnection(baseConfig);

    try {
      await setupConnection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await setupConnection.end();
    }

    pool = mysql.createPool({
      ...baseConfig,
      database: databaseName,
      decimalNumbers: true,
    });

    await createTables();
    lastDatabaseError = null;

    return {
      connected: true,
      enabled: true,
      database: databaseName,
      host: baseConfig.host,
      port: baseConfig.port,
      user: baseConfig.user,
    };
  })().catch((error) => {
    pool = null;
    initPromise = null;
    lastDatabaseError = error;
    throw error;
  });

  return initPromise;
}

export function getDatabaseStatus() {
  return {
    enabled: isDatabaseEnabled(),
    connected: Boolean(pool),
    database: process.env.DB_NAME || "masala_hub_app",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    error: lastDatabaseError
      ? lastDatabaseError.sqlMessage || lastDatabaseError.message
      : null,
  };
}

export async function saveOrder(order) {
  await assertDatabaseReady();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        INSERT INTO orders (
          order_id,
          created_at,
          estimated_delivery_time,
          customer_name,
          customer_email,
          customer_phone,
          customer_address,
          delivery_zone,
          schedule_type,
          scheduled_delivery_time,
          delivery_notes,
          spice_preference,
          handoff_preference,
          coupon_code,
          subtotal,
          discount,
          delivery_fee,
          tax,
          total,
          payment_method,
          payment_display_name,
          payment_reference,
          payment_order_reference,
          payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        order.orderId,
        new Date(order.createdAt),
        order.estimatedDeliveryTime,
        order.customer.name,
        order.customer.email,
        order.customer.phone,
        order.customer.address,
        normalizeDeliveryZone(order.fulfillment?.deliveryZone),
        order.fulfillment?.scheduleType || "asap",
        order.fulfillment?.scheduledFor ? new Date(order.fulfillment.scheduledFor) : null,
        order.fulfillment?.deliveryNotes || null,
        order.fulfillment?.spicePreference || "regular",
        order.fulfillment?.handoffPreference || "meet_at_door",
        order.totals.coupon?.code || null,
        order.totals.subtotal,
        order.totals.discount,
        order.totals.deliveryFee,
        order.totals.tax,
        order.totals.total,
        order.payment?.method || null,
        order.payment?.displayName || order.payment?.label || null,
        order.payment?.reference || null,
        order.payment?.orderReference || null,
        normalizePaymentStatus(order.payment?.status),
      ]
    );

    const [[storedOrder]] = await connection.execute(
      "SELECT id FROM orders WHERE order_id = ?",
      [order.orderId]
    );

    for (const item of order.items) {
      await connection.execute(
        `
          INSERT INTO order_items (
            order_id,
            cart_key,
            item_name,
            category,
            quantity,
            unit_price,
            line_total,
            image_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          storedOrder.id,
          item.cartKey,
          item.name,
          item.category,
          item.quantity,
          item.price,
          item.price * item.quantity,
          item.image || null,
        ]
      );
    }

    await connection.commit();
    return { saved: true, databaseId: storedOrder.id };
  } catch (error) {
    await connection.rollback();
    lastDatabaseError = error;
    throw error;
  } finally {
    connection.release();
  }
}

export async function markOrderEmailSent(orderId, emailInfo) {
  await assertDatabaseReady();

  await pool.execute(
    `
      UPDATE orders
      SET email_message_id = ?,
          email_accepted = ?,
          email_sent_at = NOW()
      WHERE order_id = ?
    `,
    [
      emailInfo.messageId || null,
      JSON.stringify(emailInfo.accepted || []),
      orderId,
    ]
  );
}

export async function getRecentOrders(limit = 25) {
  await assertDatabaseReady();

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const [orders] = await pool.query(
    `
      SELECT
        id,
        order_id AS orderId,
        created_at AS createdAt,
        customer_name AS customerName,
        customer_email AS customerEmail,
        customer_phone AS customerPhone,
        total,
        payment_method AS paymentMethod,
        payment_display_name AS paymentDisplayName,
        payment_reference AS paymentReference,
        payment_status AS paymentStatus,
        order_status AS status,
        status_updated_at AS statusUpdatedAt,
        email_sent_at AS emailSentAt
      FROM orders
      ORDER BY id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return orders;
}

const getOrderRowsWithItems = async (orders) => {
  if (!orders.length) {
    return [];
  }

  const placeholders = orders.map(() => "?").join(", ");
  const [items] = await pool.query(
    `
      SELECT
        order_id AS databaseId,
        cart_key AS cartKey,
        item_name AS name,
        category,
        quantity,
        unit_price AS price,
        line_total AS lineTotal,
        image_path AS image
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC
    `,
    orders.map((order) => order.databaseId)
  );

  const itemsByOrderId = new Map();
  const [reviews] = await pool.query(
    `
      SELECT
        order_id AS databaseId,
        rating,
        comment,
        created_at AS createdAt
      FROM order_reviews
      WHERE order_id IN (${placeholders})
    `,
    orders.map((order) => order.databaseId)
  );
  const reviewsByOrderId = new Map(
    reviews.map((review) => [
      review.databaseId,
      {
        rating: Number(review.rating),
        comment: review.comment || "",
        createdAt: normalizeDate(review.createdAt),
      },
    ])
  );

  for (const item of items) {
    const orderItems = itemsByOrderId.get(item.databaseId) || [];
    orderItems.push({
      name: item.name,
      cartKey: item.cartKey,
      category: item.category,
      quantity: toNumber(item.quantity),
      price: toNumber(item.price),
      lineTotal: toNumber(item.lineTotal),
      image: item.image,
    });
    itemsByOrderId.set(item.databaseId, orderItems);
  }

  return orders.map((order) => ({
    orderId: order.orderId,
    createdAt: normalizeDate(order.createdAt),
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      address: order.customerAddress,
    },
    fulfillment: {
      scheduleType: order.scheduleType || "asap",
      scheduledFor: normalizeDate(order.scheduledFor),
      deliveryZone: normalizeDeliveryZone(order.deliveryZone),
      deliveryNotes: order.deliveryNotes || "",
      spicePreference: order.spicePreference || "regular",
      handoffPreference: order.handoffPreference || "meet_at_door",
    },
    totals: {
      subtotal: toNumber(order.subtotal),
      discount: toNumber(order.discount),
      deliveryFee: toNumber(order.deliveryFee),
      tax: toNumber(order.tax),
      total: toNumber(order.total),
    },
    payment: {
      method: order.paymentMethod,
      displayName: order.paymentDisplayName,
      reference: order.paymentReference,
      orderReference: order.paymentOrderReference,
      status: order.paymentStatus,
    },
    status: order.status || defaultOrderStatus,
    statusUpdatedAt: normalizeDate(order.statusUpdatedAt),
    emailSentAt: normalizeDate(order.emailSentAt),
    review: reviewsByOrderId.get(order.databaseId) || null,
    items: itemsByOrderId.get(order.databaseId) || [],
  }));
};

export async function getAdminOrders({
  scope = "today",
  status,
  paymentStatus,
  search,
  limit = 100,
} = {}) {
  await assertDatabaseReady();

  const normalizedScope = String(scope || "").trim().toLowerCase();
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const normalizedPaymentStatus = String(paymentStatus || "").trim().toLowerCase();
  const normalizedSearch = String(search || "").trim();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
  const where = [];
  const params = [];

  if (normalizedScope === "today") {
    where.push("created_at >= CURDATE() AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)");
  }

  if (isValidOrderStatus(normalizedStatus)) {
    where.push("order_status = ?");
    params.push(normalizeOrderStatus(normalizedStatus));
  }

  if (isValidPaymentStatus(normalizedPaymentStatus)) {
    where.push("payment_status = ?");
    params.push(normalizePaymentStatus(normalizedPaymentStatus));
  }

  if (normalizedSearch) {
    where.push(`(
      order_id LIKE ?
      OR customer_name LIKE ?
      OR customer_email LIKE ?
      OR customer_phone LIKE ?
      OR customer_address LIKE ?
      OR payment_reference LIKE ?
    )`);
    const searchPattern = `%${normalizedSearch}%`;
    params.push(
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern
    );
  }

  const [orders] = await pool.query(
    `
      SELECT
        id AS databaseId,
        order_id AS orderId,
        created_at AS createdAt,
        estimated_delivery_time AS estimatedDeliveryTime,
        customer_name AS customerName,
        customer_email AS customerEmail,
        customer_phone AS customerPhone,
        customer_address AS customerAddress,
        delivery_zone AS deliveryZone,
        schedule_type AS scheduleType,
        scheduled_delivery_time AS scheduledFor,
        delivery_notes AS deliveryNotes,
        spice_preference AS spicePreference,
        handoff_preference AS handoffPreference,
        subtotal,
        discount,
        delivery_fee AS deliveryFee,
        tax,
        total,
        payment_method AS paymentMethod,
        payment_display_name AS paymentDisplayName,
        payment_reference AS paymentReference,
        payment_order_reference AS paymentOrderReference,
        payment_status AS paymentStatus,
        order_status AS status,
        status_updated_at AS statusUpdatedAt,
        email_sent_at AS emailSentAt
      FROM orders
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY id DESC
      LIMIT ?
    `,
    [...params, safeLimit]
  );

  return getOrderRowsWithItems(orders);
}

export async function updateOrderStatus(orderId, status) {
  await assertDatabaseReady();

  const normalizedOrderId = String(orderId || "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID is required.");
  }

  if (!isValidOrderStatus(status)) {
    throw new Error("Choose a valid order status.");
  }

  const normalizedStatus = normalizeOrderStatus(status);
  const [result] = await pool.execute(
    `
      UPDATE orders
      SET order_status = ?,
          status_updated_at = NOW()
      WHERE order_id = ?
    `,
    [normalizedStatus, normalizedOrderId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Order not found.");
  }

  return {
    orderId: normalizedOrderId,
    status: normalizedStatus,
  };
}

export async function updateOrderPaymentStatus(orderId, paymentStatus) {
  await assertDatabaseReady();

  const normalizedOrderId = String(orderId || "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID is required.");
  }

  if (!isValidPaymentStatus(paymentStatus)) {
    throw new Error("Choose a valid payment status.");
  }

  const normalizedStatus = normalizePaymentStatus(paymentStatus);
  const [result] = await pool.execute(
    `
      UPDATE orders
      SET payment_status = ?
      WHERE order_id = ?
    `,
    [normalizedStatus, normalizedOrderId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Order not found.");
  }

  return {
    orderId: normalizedOrderId,
    paymentStatus: normalizedStatus,
  };
}

export async function getOrderByOrderId(orderId) {
  await assertDatabaseReady();

  const normalizedOrderId = String(orderId || "").trim();

  if (!normalizedOrderId) return null;

  const [orders] = await pool.query(
    `
      SELECT
        id AS databaseId,
        order_id AS orderId,
        created_at AS createdAt,
        estimated_delivery_time AS estimatedDeliveryTime,
        customer_name AS customerName,
        customer_email AS customerEmail,
        customer_phone AS customerPhone,
        customer_address AS customerAddress,
        delivery_zone AS deliveryZone,
        schedule_type AS scheduleType,
        scheduled_delivery_time AS scheduledFor,
        delivery_notes AS deliveryNotes,
        spice_preference AS spicePreference,
        handoff_preference AS handoffPreference,
        subtotal,
        discount,
        delivery_fee AS deliveryFee,
        tax,
        total,
        payment_method AS paymentMethod,
        payment_display_name AS paymentDisplayName,
        payment_reference AS paymentReference,
        payment_order_reference AS paymentOrderReference,
        payment_status AS paymentStatus,
        order_status AS status,
        status_updated_at AS statusUpdatedAt,
        email_sent_at AS emailSentAt
      FROM orders
      WHERE order_id = ?
      LIMIT 1
    `,
    [normalizedOrderId]
  );

  const [order] = await getOrderRowsWithItems(orders);
  return order || null;
}

export async function getMenuItems({ includeUnavailable = false, category = "" } = {}) {
  try {
    await assertDatabaseReady();
  } catch {
    return menuItems.filter((item) => {
      if (!category) return true;
      return item.category === category;
    });
  }

  const normalizedCategory = String(category || "").trim().toLowerCase();
  const where = [];
  const params = [];

  if (!includeUnavailable) {
    where.push("available = TRUE");
  }

  if (normalizedCategory && isValidCategory(normalizedCategory)) {
    where.push("category = ?");
    params.push(normalizedCategory);
  }

  const [rows] = await pool.query(
    `
      SELECT
        cart_key AS cartKey,
        menu_id AS menuId,
        category,
        name,
        description,
        price,
        image,
        available,
        updated_at AS updatedAt
      FROM menu_items
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY category, menu_id
    `,
    params
  );

  return rows.map(normalizeMenuRow);
}

export async function getMenuItemByCartKey(cartKey) {
  try {
    await assertDatabaseReady();
  } catch {
    return findMenuItemByCartKey(cartKey);
  }

  const [rows] = await pool.query(
    `
      SELECT
        cart_key AS cartKey,
        menu_id AS menuId,
        category,
        name,
        description,
        price,
        image,
        available,
        updated_at AS updatedAt
      FROM menu_items
      WHERE cart_key = ?
      LIMIT 1
    `,
    [String(cartKey || "").trim()]
  );

  return normalizeMenuRow(rows[0]);
}

export async function saveMenuItem(payload) {
  await assertDatabaseReady();

  const cartKey = String(payload.cartKey || "").trim();
  const category = String(payload.category || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const price = Number(payload.price);
  const image = String(payload.image || "").trim();
  const available = payload.available !== false;

  if (!isValidCategory(category)) {
    throw new Error("Choose a valid menu category.");
  }

  if (name.length < 2) {
    throw new Error("Menu item name must be at least 2 characters.");
  }

  if (!Number.isFinite(price) || price < 1 || price > 5000) {
    throw new Error("Enter a valid item price.");
  }

  let menuId = Number(payload.menuId);
  let nextCartKey = cartKey;

  if (!nextCartKey) {
    const [[row]] = await pool.query(
      "SELECT COALESCE(MAX(menu_id), 0) + 1 AS nextMenuId FROM menu_items WHERE category = ?",
      [category]
    );
    menuId = Number(row.nextMenuId);
    nextCartKey = `${category}-${menuId}`;
  } else {
    const existingItem = await getMenuItemByCartKey(nextCartKey);
    menuId = Number(existingItem?.menuId || menuId);
  }

  if (!menuId) {
    throw new Error("Menu item ID is required.");
  }

  await pool.execute(
    `
      INSERT INTO menu_items (
        cart_key,
        menu_id,
        category,
        name,
        description,
        price,
        image,
        available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        price = VALUES(price),
        image = VALUES(image),
        available = VALUES(available)
    `,
    [nextCartKey, menuId, category, name, description, price, image, available]
  );

  return getMenuItemByCartKey(nextCartKey);
}

export async function saveOrderReview({ orderId, email, phone, rating, comment }) {
  await assertDatabaseReady();

  const normalizedOrderId = String(orderId || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const numericRating = Number(rating);
  const cleanComment = String(comment || "").trim().replace(/\s+/g, " ").slice(0, 500);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new Error("Choose a rating from 1 to 5.");
  }

  const [orders] = await pool.query(
    `
      SELECT id, customer_email, customer_phone, order_status
      FROM orders
      WHERE order_id = ?
      LIMIT 1
    `,
    [normalizedOrderId]
  );
  const order = orders[0];

  if (!order) {
    throw new Error("Order not found.");
  }

  if (
    normalizeEmail(order.customer_email) !== normalizedEmail ||
    normalizePhone(order.customer_phone) !== normalizedPhone
  ) {
    throw new Error("Use the same email and phone from the order.");
  }

  if (normalizeOrderStatus(order.order_status) !== "delivered") {
    throw new Error("Reviews can be added after delivery.");
  }

  await pool.execute(
    `
      INSERT INTO order_reviews (
        order_id,
        rating,
        comment,
        customer_email
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        customer_email = VALUES(customer_email)
    `,
    [order.id, numericRating, cleanComment, normalizedEmail]
  );

  return {
    rating: numericRating,
    comment: cleanComment,
    createdAt: new Date().toISOString(),
  };
}

export async function getOrderAnalytics() {
  await assertDatabaseReady();

  const now = new Date();
  const currentYear = now.getFullYear();
  const daysInCurrentMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const startYear = currentYear - 4;

  const [[summary]] = await pool.query(`
    SELECT
      COUNT(*) AS totalOrders,
      COALESCE(SUM(total), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS todayOrders,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS todayRevenue,
      COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END), 0) AS monthOrders,
      COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE()) THEN total ELSE 0 END), 0) AS monthRevenue,
      COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) THEN 1 ELSE 0 END), 0) AS yearOrders,
      COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) THEN total ELSE 0 END), 0) AS yearRevenue
    FROM orders
  `);

  const [dailyRows] = await pool.query(`
    SELECT
      DAY(created_at) AS bucket,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND created_at < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
    GROUP BY DAY(created_at)
    ORDER BY bucket
  `);

  const [monthlyRows] = await pool.query(`
    SELECT
      MONTH(created_at) AS bucket,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE YEAR(created_at) = YEAR(CURDATE())
    GROUP BY MONTH(created_at)
    ORDER BY bucket
  `);

  const [yearlyRows] = await pool.query(
    `
      SELECT
        YEAR(created_at) AS bucket,
        COUNT(*) AS orders,
        COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE YEAR(created_at) >= ?
      GROUP BY YEAR(created_at)
      ORDER BY bucket
    `,
    [startYear]
  );

  const [topItems] = await pool.query(`
    SELECT
      item_name AS name,
      category,
      SUM(quantity) AS quantity,
      COALESCE(SUM(line_total), 0) AS revenue
    FROM order_items
    GROUP BY cart_key, item_name, category
    ORDER BY quantity DESC, revenue DESC
    LIMIT 5
  `);

  const [paymentMethods] = await pool.query(`
    SELECT
      COALESCE(payment_display_name, payment_method, 'Unknown') AS label,
      COUNT(*) AS orders
    FROM orders
    GROUP BY label
    ORDER BY orders DESC
  `);

  const recentOrders = await getRecentOrders(8);

  const daily = Array.from({ length: daysInCurrentMonth }, (_, index) => ({
    label: String(index + 1),
    orders: 0,
    revenue: 0,
  }));

  for (const row of dailyRows) {
    const index = Number(row.bucket) - 1;
    if (daily[index]) {
      daily[index] = {
        ...daily[index],
        orders: toNumber(row.orders),
        revenue: toNumber(row.revenue),
      };
    }
  }

  const monthly = monthLabels.map((label) => ({
    label,
    orders: 0,
    revenue: 0,
  }));

  for (const row of monthlyRows) {
    const index = Number(row.bucket) - 1;
    if (monthly[index]) {
      monthly[index] = {
        ...monthly[index],
        orders: toNumber(row.orders),
        revenue: toNumber(row.revenue),
      };
    }
  }

  const yearly = Array.from({ length: 5 }, (_, index) => ({
    label: String(startYear + index),
    orders: 0,
    revenue: 0,
  }));

  for (const row of yearlyRows) {
    const index = Number(row.bucket) - startYear;
    if (yearly[index]) {
      yearly[index] = {
        ...yearly[index],
        orders: toNumber(row.orders),
        revenue: toNumber(row.revenue),
      };
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      today: {
        orders: toNumber(summary.todayOrders),
        revenue: toNumber(summary.todayRevenue),
      },
      month: {
        orders: toNumber(summary.monthOrders),
        revenue: toNumber(summary.monthRevenue),
      },
      year: {
        orders: toNumber(summary.yearOrders),
        revenue: toNumber(summary.yearRevenue),
      },
      allTime: {
        orders: toNumber(summary.totalOrders),
        revenue: toNumber(summary.totalRevenue),
      },
    },
    charts: {
      daily,
      monthly,
      yearly,
    },
    topItems: topItems.map((item) => ({
      name: item.name,
      category: item.category,
      quantity: toNumber(item.quantity),
      revenue: toNumber(item.revenue),
    })),
    paymentMethods: paymentMethods.map((method) => ({
      label: method.label,
      orders: toNumber(method.orders),
    })),
    recentOrders: recentOrders.map((order) => ({
      ...order,
      createdAt: normalizeDate(order.createdAt),
    })),
  };
}

export async function getCustomerOrderHistory({ email, phone, limit = 20 }) {
  await assertDatabaseReady();

  const customerEmail = normalizeEmail(email);
  const customerPhone = normalizePhone(phone);
  const emailValidation = validateEmail(customerEmail);
  const phoneValidation = validatePhone(customerPhone, { required: true });

  if (!emailValidation.valid) throw new Error("Enter the email used for your order.");

  if (!phoneValidation.valid) throw new Error("Enter the phone number used for your order.");

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [orders] = await pool.query(
    `
      SELECT
        id AS databaseId,
        order_id AS orderId,
        created_at AS createdAt,
        estimated_delivery_time AS estimatedDeliveryTime,
        customer_name AS customerName,
        customer_email AS customerEmail,
        customer_phone AS customerPhone,
        customer_address AS customerAddress,
        delivery_zone AS deliveryZone,
        schedule_type AS scheduleType,
        scheduled_delivery_time AS scheduledFor,
        delivery_notes AS deliveryNotes,
        spice_preference AS spicePreference,
        handoff_preference AS handoffPreference,
        subtotal,
        discount,
        delivery_fee AS deliveryFee,
        tax,
        total,
        payment_method AS paymentMethod,
        payment_display_name AS paymentDisplayName,
        payment_reference AS paymentReference,
        payment_order_reference AS paymentOrderReference,
        payment_status AS paymentStatus,
        order_status AS status,
        status_updated_at AS statusUpdatedAt,
        email_sent_at AS emailSentAt
      FROM orders
      WHERE LOWER(customer_email) = ?
        AND customer_phone = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [customerEmail, customerPhone, safeLimit]
  );

  return getOrderRowsWithItems(orders);
}
