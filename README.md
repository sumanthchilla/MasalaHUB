# Masala HUB React App

React/Vite food ordering app with an Express backend, Resend/Gmail order confirmation emails, and MySQL order storage.

## Project Structure

```text
frontend/  React + Vite client app
backend/   Express API server
shared/    Menu, pricing, and validation helpers used by both sides
dist/      Production frontend build served by the backend
```

## Run Locally

```bash
npm install
npm run dev:full
```

Frontend: `http://127.0.0.1:2002`
Backend: `http://127.0.0.1:5000`

Useful scripts:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:full
npm run build
npm start
```

The frontend calls `/api/*`. In development, Vite proxies those requests to the backend on port `5000`; in production, the backend serves the built frontend from `dist/`.

## MySQL Setup

MySQL Workbench is the GUI. This app connects to the MySQL Server that Workbench uses.

Set these values in `.env`:

```env
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=masala_hub_app
DB_SSL=false
```

When the backend starts, it creates the configured database with `orders` and `order_items` tables if they do not already exist.

To check the connection, open:

```text
http://127.0.0.1:5000/api/health
```

To see stored orders through the API, send the admin key with the request:

```bash
curl -H "x-admin-key: your-admin-key" http://127.0.0.1:5000/api/orders
```

## Admin Analytics and Customer History

Admins can open `/admin` and enter `ADMIN_ACCESS_KEY` to view daily, monthly,
and yearly order charts. Customers can open `/history` and search with the
email and phone number used at checkout.

## Email Setup for Vercel

Vercel serverless functions work best with email providers that send through an
HTTP API instead of SMTP. This app uses Resend first when `RESEND_API_KEY` is
configured, then falls back to Gmail/SMTP through Nodemailer for local or backup
use.

Set these in Vercel Project Settings -> Environment Variables:

```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=Masala HUB <orders@your-verified-domain.com>
EMAIL_FROM=Masala HUB <orders@your-verified-domain.com>
```

Create the API key in Resend and verify your sending domain before using a
custom `orders@...` sender. For quick account testing, Resend also supports its
test sender, but production customer emails should use your verified domain.

Local Gmail fallback still works with:

```env
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

## Bank Payment Setup

The checkout supports cash on delivery plus manual bank/UPI payments. Cash on
delivery works without extra setup. For bank/UPI, add your account details to
`.env`, restart `npm run dev:full`, and customers will see them at checkout.

```env
PAYMENT_ACCOUNT_NAME=Your Restaurant Name
PAYMENT_BANK_NAME=Your Bank Name
PAYMENT_ACCOUNT_NUMBER=000000000000
PAYMENT_IFSC=ABCD0000000
PAYMENT_UPI_ID=9347491797@ibl

VITE_PAYMENT_ACCOUNT_NAME=Your Restaurant Name
VITE_PAYMENT_BANK_NAME=Your Bank Name
VITE_PAYMENT_ACCOUNT_NUMBER=000000000000
VITE_PAYMENT_IFSC=ABCD0000000
VITE_PAYMENT_UPI_ID=9347491797@ibl
VITE_PAYMENT_UPI_QR_IMAGE=/payment/upi-9347491797-ibl.svg
```

Never add bank login passwords, OTPs, card PINs, or internet banking credentials.
Orders are saved with the customer's UTR/transaction reference for manual
verification.

Credit card and netbanking screens are demo/showcase only. They look like a
checkout flow, but they do not process payments or save card details.
