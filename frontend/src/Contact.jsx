import { useState } from "react";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

import "./InfoPage.css";

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="info-page">
      <div className="info-shell">
        <header className="info-hero">
          <p className="info-eyebrow">Contact us</p>
          <h1>We are here to help</h1>
          <p>
            Questions about your order, menu items, delivery timing, or account?
            Send us a message and our team will get back to you as soon as possible.
          </p>
        </header>

        <section className="info-panel">
          <h2>Get in touch</h2>
          <div className="info-contact-grid">
            <div className="info-contact-card">
              <Mail aria-hidden="true" />
              <div>
                <strong>Email</strong>
                <a href="mailto:sumanthchilla@gmail.com">sumanthchilla@gmail.com</a>
                <p>For order issues, refunds, and general support.</p>
              </div>
            </div>
            <div className="info-contact-card">
              <Phone aria-hidden="true" />
              <div>
                <strong>Phone</strong>
                <a href="tel:+919347491797">+91 93474 91797</a>
                <p>Call during business hours for urgent delivery updates.</p>
              </div>
            </div>
            <div className="info-contact-card">
              <MapPin aria-hidden="true" />
              <div>
                <strong>Kitchen</strong>
                <span>Masala HUB Kitchen - City-wide delivery</span>
                <p>We operate online and deliver across supported local areas.</p>
              </div>
            </div>
            <div className="info-contact-card">
              <Clock3 aria-hidden="true" />
              <div>
                <strong>Hours</strong>
                <span>11:00 AM – 11:00 PM, daily</span>
                <p>Orders outside hours may be scheduled for the next service window.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="info-panel">
          <h2>Send a message</h2>
          {submitted ? (
            <p className="info-note">
              Thank you, {form.name || "there"}! Your message has been recorded. We
              will reply to {form.email || "your email"} shortly.
            </p>
          ) : (
            <form className="info-form" onSubmit={handleSubmit}>
              <label>
                Your name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help..."
                  required
                />
              </label>
              <button type="submit">Send message</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default Contact;
