import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Plus,
  Sparkles,
  Trophy,
  Utensils,
} from "lucide-react";

import { addToCart } from "../cartSlice";
import CategoryBadge from "./CategoryBadge";
import { getCartItemKey } from "../../../shared/menuItems";
import "../Veg.css";

const menuMeta = {
  veg: {
    eyebrow: "Vegetarian menu",
    description:
      "Fresh curries, tiffin favorites, breads, and rice bowls made for everyday comfort.",
    accent: "veg",
  },
  nonveg: {
    eyebrow: "Non-veg specials",
    description:
      "Biryani, grilled plates, seafood, and classic gravies for a fuller feast.",
    accent: "nonveg",
  },
  dessert: {
    eyebrow: "Sweet finish",
    description:
      "Classic sweets, chilled treats, and bakery favorites for the last happy bite.",
    accent: "dessert",
  },
};

function MenuPage({ title, items, isLoading = false }) {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const categoryType = items[0]?.category || "veg";
  const meta = menuMeta[categoryType] || menuMeta.veg;
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);
  const pageStart = items.length ? startIndex + 1 : 0;
  const pageEnd = Math.min(startIndex + itemsPerPage, items.length);
  const prices = items.map((item) => item.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const featuredItem = currentItems[0] || items[0];

  const handleAddToCart = (item) => {
    if (item.available === false) {
      toast.error(`${item.name} is currently unavailable.`);
      return;
    }

    const itemKey = getCartItemKey(item);
    const isAlreadyInCart = cartItems.some(
      (cartItem) => getCartItemKey(cartItem) === itemKey
    );

    dispatch(addToCart(item));

    if (isAlreadyInCart) {
      toast.info(`${item.name} quantity increased in cart!`);
      return;
    }

    toast.success(`${item.name} added to cart successfully!`);
  };
  const metrics = [
    {
      label: "Dishes",
      value: items.length,
      helper: "curated picks",
      icon: Utensils,
    },
    {
      label: "Starts at",
      value: `Rs ${minPrice}`,
      helper: "easy add-ons",
      icon: CircleDollarSign,
    },
    {
      label: "Top plate",
      value: `Rs ${maxPrice}`,
      helper: "signature special",
      icon: Trophy,
    },
  ];

  return (
    <main className={`menu-page menu-page-${meta.accent}`}>
      <header className="menu-header">
        <div className="menu-header-inner">
          <div className="menu-header-copy">
            <p className="menu-eyebrow">
              <Utensils aria-hidden="true" />
              {meta.eyebrow}
            </p>
            <h1>{title}</h1>
            <p>{meta.description}</p>

            <div className="menu-metrics" aria-label="Menu highlights">
              {metrics.map((metric) => {
                const MetricIcon = metric.icon;

                return (
                  <span className="menu-metric" key={metric.label}>
                    <span className="menu-metric-icon" aria-hidden="true">
                      <MetricIcon />
                    </span>
                    <span className="menu-metric-copy">
                      <strong>{metric.value}</strong>
                      <small>{metric.label}</small>
                    </span>
                    <em>{metric.helper}</em>
                  </span>
                );
              })}
            </div>
          </div>

          {featuredItem ? (
            <aside className="menu-feature" aria-label="Featured menu item">
              <div className="menu-feature-image">
                <img src={featuredItem.image} alt={featuredItem.name} />
              </div>
              <div className="menu-feature-copy">
                <span className="menu-feature-badge">
                  <Sparkles aria-hidden="true" />
                  First pick
                </span>
                <strong>{featuredItem.name}</strong>
                <p>{featuredItem.description}</p>
                <div className="menu-feature-meta">
                  <small>Rs {featuredItem.price}</small>
                  <CategoryBadge type={featuredItem.category} size="sm" />
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </header>

      <section className="menu-section" aria-label={`${title} items`}>
        <div className="menu-toolbar">
          <p>
            {isLoading
              ? "Refreshing menu..."
              : `Showing ${pageStart}-${pageEnd} of ${items.length} dishes`}
          </p>
        </div>

        <ol className="card-container">
          {currentItems.map((item) => (
            <li key={item.cartKey} className={`card card-${item.category}`}>
              <div className="card-image-wrap">
                <img src={item.image} alt={item.name} className="veg-img" />
                <span className="card-price">Rs {item.price}</span>
              </div>
              <div className="card-topline">
                <CategoryBadge type={item.category} size="sm" />
              </div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>

              <button type="button" onClick={() => handleAddToCart(item)}>
                <span className="card-button-icon" aria-hidden="true">
                  <Plus />
                </span>
                <span>{item.available === false ? "Unavailable" : "Add to cart"}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="pagination">
          <button
            type="button"
            className="nav-btn"
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage(safeCurrentPage - 1)}
            aria-label="Previous page"
            title="Previous page"
          >
            <ArrowLeft aria-hidden="true" />
            <span>Prev</span>
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              type="button"
              key={i}
              className={`page-box ${safeCurrentPage === i + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            type="button"
            className="nav-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() => setCurrentPage(safeCurrentPage + 1)}
            aria-label="Next page"
            title="Next page"
          >
            <span>Next</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}

export default MenuPage;
