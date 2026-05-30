import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import "./InfoPage.css";

function Legal() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const target = document.querySelector(hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <main className="info-page">
      <div className="info-shell">
        <header className="info-hero">
          <p className="info-eyebrow">Legal</p>
          <h1>Policies & terms</h1>
          <p>
            Please read how Masala HUB handles your information, orders, and use of
            this website. These policies apply to all customers who browse, register,
            or place orders through our platform.
          </p>
        </header>

        <section className="info-panel" id="privacy">
          <h2>Privacy Policy</h2>
          <p>
            <strong>Last updated:</strong> May 2026. Masala HUB respects your privacy
            and is committed to protecting the personal information you share with us.
          </p>

          <h3>Information we collect</h3>
          <p>When you use Masala HUB, we may collect:</p>
          <ul>
            <li>Account details such as your name, email address, and phone number</li>
            <li>Order information including items, delivery address, and payment references</li>
            <li>Technical data like browser type, device information, and usage logs</li>
          </ul>

          <h3>How we use your information</h3>
          <ul>
            <li>To process and deliver your food orders</li>
            <li>To send order confirmations and service-related updates</li>
            <li>To improve menu recommendations, support, and website performance</li>
            <li>To prevent fraud, abuse, and unauthorized access to accounts</li>
          </ul>

          <h3>Data sharing</h3>
          <p>
            We do not sell your personal data. We may share limited information with
            trusted service providers who help us operate email delivery, hosting,
            or payment processing. These partners are required to handle data securely
            and only for the services they provide to Masala HUB.
          </p>

          <h3>Data retention & security</h3>
          <p>
            Order records are stored to support receipts, history lookups, and customer
            support. We use reasonable technical and organizational measures to protect
            your data, but no online system can be guaranteed 100% secure.
          </p>

          <h3>Your choices</h3>
          <p>
            You may request correction of account details, ask questions about stored
            data, or contact us to discuss deletion requests where applicable by law.
            For privacy-related inquiries, email us at sumanthchilla@gmail.com.
          </p>
        </section>

        <section className="info-panel" id="terms">
          <h2>Terms of Service</h2>
          <p>
            <strong>Last updated:</strong> May 2026. By accessing Masala HUB or placing
            an order, you agree to the following terms.
          </p>

          <h3>Using our service</h3>
          <p>
            You must provide accurate contact and delivery information at checkout.
            Masala HUB reserves the right to refuse or cancel orders that appear fraudulent,
            incomplete, or outside our delivery coverage.
          </p>

          <h3>Orders, pricing & payments</h3>
          <ul>
            <li>Menu prices, taxes, and delivery fees are shown before you confirm payment</li>
            <li>Promotional coupons are subject to availability and stated conditions</li>
            <li>Estimated delivery times are guidelines and may vary during peak hours</li>
          </ul>

          <h3>Cancellations & refunds</h3>
          <p>
            Once food preparation has started, cancellations may not be possible.
            If an item is missing, incorrect, or significantly delayed, contact us within
            a reasonable time and we will review the order for a partial refund, credit,
            or replacement where appropriate.
          </p>

          <h3>Accounts & acceptable use</h3>
          <p>
            Keep your login credentials private. You agree not to misuse the website,
            attempt unauthorized access, or interfere with other customers&apos; experience.
            We may suspend accounts that violate these terms.
          </p>

          <h3>Limitation of liability</h3>
          <p>
            Masala HUB is provided on an &quot;as is&quot; basis. To the fullest extent
            permitted by law, we are not liable for indirect damages arising from delays,
            third-party payment issues, or events outside our reasonable control.
          </p>

          <h3>Changes to these terms</h3>
          <p>
            We may update this page from time to time. Continued use of Masala HUB after
            changes are posted means you accept the revised policies. For questions
            about these terms, visit our Contact page or email sumanthchilla@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
}

export default Legal;
