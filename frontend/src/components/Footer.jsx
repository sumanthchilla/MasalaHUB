import { FileText, Info, Mail, Phone, MapPin, Scale } from "lucide-react";
import { NavLink } from "react-router-dom";

import "./Footer.css";

const pageCards = [
  { label: "About", to: "/about", icon: Info, hint: "Our story" },
  { label: "Contact", to: "/contact", icon: Mail, hint: "Reach us" },
  { label: "Privacy", to: "/legal#privacy", icon: FileText, hint: "Your data" },
  { label: "Terms", to: "/legal#terms", icon: Scale, hint: "Usage rules" },
];

function Footer({ onOpenAuth }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <NavLink to="/home" className="site-footer__logo">
              <img className="site-footer__logo-mark" src="/masala-hub-logo.svg" alt="" aria-hidden="true" />
              <span>Masala HUB</span>
            </NavLink>
            <p className="site-footer__tagline">
              Fresh Indian meals delivered to your door - veg, non-veg, and desserts in one place.
            </p>
            {onOpenAuth ? (
              <button type="button" className="site-footer__account-btn" onClick={onOpenAuth}>
                Sign in or create account
              </button>
            ) : null}
          </div>

          <div className="site-footer__contact">
            <h3>Get in touch</h3>
            <a href="mailto:sumanthchilla@gmail.com" className="site-footer__contact-row">
              <Mail size={16} aria-hidden="true" />
              <span>sumanthchilla@gmail.com</span>
            </a>
            <a href="tel:+919347491797" className="site-footer__contact-row">
              <Phone size={16} aria-hidden="true" />
              <span>+91 93474 91797</span>
            </a>
            <p className="site-footer__contact-row site-footer__contact-row--static">
              <MapPin size={16} aria-hidden="true" />
              <span>
                Masala HUB Kitchen
                <small>Online delivery - Fresh food daily</small>
              </span>
            </p>
          </div>
        </div>

        <nav className="site-footer__cards" aria-label="Pages">
          {pageCards.map((card) => {
            const CardIcon = card.icon;
            return (
              <NavLink key={card.to} to={card.to} className="site-footer__card">
                <span className="site-footer__card-icon" aria-hidden="true">
                  <CardIcon size={16} />
                </span>
                <span className="site-footer__card-text">
                  <strong>{card.label}</strong>
                  <small>{card.hint}</small>
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="site-footer__bottom">
          <p>Copyright {year} Masala HUB. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
