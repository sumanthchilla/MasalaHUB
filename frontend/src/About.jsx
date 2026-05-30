import "./InfoPage.css";

function About() {
  return (
    <main className="info-page">
      <div className="info-shell">
        <header className="info-hero">
          <p className="info-eyebrow">About Masala HUB</p>
          <h1>Fresh food, delivered with care</h1>
          <p>
            Masala HUB is a modern online restaurant experience built for people who
            want great Indian meals without the wait. From comforting veg curries
            to signature biryanis and desserts, we bring the menu to your door.
          </p>
        </header>

        <section className="info-panel">
          <h2>Our story</h2>
          <p>
            Masala HUB started with a simple idea: make restaurant-quality food easy
            to order, easy to track, and easy to enjoy at home. We focus on
            consistent recipes, careful packing, and reliable delivery windows so
            every order feels worth repeating.
          </p>
          <p>
            Whether you are planning a family dinner, a late-night craving, or a
            quick office lunch, our menu is designed to cover the full meal, from
            starters and mains to sweets that finish on a high note.
          </p>
        </section>

        <section className="info-panel">
          <h2>What we offer</h2>
          <ul>
            <li>Curated vegetarian, non-vegetarian, and dessert menus</li>
            <li>Transparent pricing with coupons and order totals at checkout</li>
            <li>Order history lookup and email confirmations for every purchase</li>
            <li>Secure accounts so returning customers can check out faster</li>
          </ul>
        </section>

        <section className="info-panel">
          <h2>Our promise</h2>
          <p>
            We prepare food in small batches, use fresh ingredients where possible,
            and treat customer feedback as part of how we improve. If something
            does not meet your expectations, reach out through our Contact page
            and we will work with you to make it right.
          </p>
        </section>
      </div>
    </main>
  );
}

export default About;
