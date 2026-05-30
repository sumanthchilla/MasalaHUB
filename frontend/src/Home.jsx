import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Flame,
  Leaf,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

import "./Home.css";

const heroSlides = [
  {
    fallback: "/backg/hero-food.jpg",
    webp: "/backg/hero-food.webp",
    avif: "/backg/hero-food.avif",
  },
  {
    fallback: "/backg/hero-veg-feast.png",
    webp: "/backg/hero-veg-feast.webp",
    avif: "/backg/hero-veg-feast.avif",
  },
  {
    fallback: "/backg/hero-biryani-dessert.png",
    webp: "/backg/hero-biryani-dessert.webp",
    avif: "/backg/hero-biryani-dessert.avif",
  },
];

function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set([0]));

  const markSlideLoaded = useCallback((slideIndex) => {
    setLoadedSlides((currentSlides) => {
      if (currentSlides.has(slideIndex)) {
        return currentSlides;
      }

      const nextSlides = new Set(currentSlides);
      nextSlides.add(slideIndex);
      return nextSlides;
    });
  }, []);

  const categories = [
    {
      title: "Vegetarian",
      copy: "Comforting curries, fresh breads, rice bowls, and tiffin favorites.",
      image: "/Vegitems/Paneer Butter Masala.jpg",
      to: "/veg",
      icon: Leaf,
    },
    {
      title: "Non-Veg",
      copy: "Slow-cooked biryanis, tandoor-style plates, seafood, and rich gravies.",
      image: "/Nonvegitems/Chicken Biryani.jpg",
      to: "/nonveg",
      icon: Flame,
    },
    {
      title: "Desserts",
      copy: "Classic Indian sweets and creamy chilled treats for the final bite.",
      image: "/Desserts/Gulab Jamun.jpg",
      to: "/desserts",
      icon: Sparkles,
    },
  ];

  const dishes = [
    {
      name: "Paneer Butter Masala",
      copy: "Creamy tomato gravy with soft paneer cubes and fresh herbs.",
      price: "Rs 150",
      tag: "Veg",
      image: "/Vegitems/Paneer Butter Masala.jpg",
      rating: "4.9",
      to: "/veg",
    },
    {
      name: "Chicken Biryani",
      copy: "Layered rice, warm spices, and tender chicken finished dum-style.",
      price: "Rs 180",
      tag: "Non-Veg",
      image: "/Nonvegitems/Chicken Biryani.jpg",
      rating: "4.8",
      to: "/nonveg",
    },
    {
      name: "Masala Dosa",
      copy: "Crisp dosa with potato masala, sambar, and chutney notes.",
      price: "Rs 80",
      tag: "Tiffin",
      image: "/Vegitems/Masala Dosa.jpg",
      rating: "4.7",
      to: "/veg",
    },
    {
      name: "Gulab Jamun",
      copy: "Soft milk dumplings soaked in warm cardamom syrup.",
      price: "Rs 80",
      tag: "Sweet",
      image: "/Desserts/Gulab Jamun.jpg",
      rating: "4.8",
      to: "/desserts",
    },
  ];

  const promises = [
    {
      title: "Fresh batches",
      copy: "Popular dishes are prepared in small runs to keep texture and flavor bright.",
      icon: Flame,
    },
    {
      title: "Balanced menu",
      copy: "Vegetarian, non-vegetarian, and dessert sections are easy to scan.",
      icon: ShieldCheck,
    },
    {
      title: "Fast checkout",
      copy: "Add favorites, adjust quantities, and review your total from one cart.",
      icon: Clock3,
    },
  ];

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((currentSlide) => {
        const nextSlide = (currentSlide + 1) % heroSlides.length;
        markSlideLoaded(nextSlide);
        return nextSlide;
      });
    }, 5200);

    return () => window.clearInterval(timer);
  }, [markSlideLoaded]);

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => markSlideLoaded(1), {
        timeout: 2600,
      });

      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => markSlideLoaded(1), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [markSlideLoaded]);

  return (
    <main className="home-page">
      <section className="hero" aria-label="Masala HUB landing page">
        <div className="hero-carousel" aria-hidden="true">
          {heroSlides.map((slide, index) => {
            const shouldLoadSlide = loadedSlides.has(index);
            const slideClassName = `hero-slide${index === activeSlide ? " is-active" : ""}`;

            return shouldLoadSlide ? (
              <picture className={slideClassName} key={slide.fallback}>
                <source srcSet={slide.avif} type="image/avif" />
                <source srcSet={slide.webp} type="image/webp" />
                <img
                  src={slide.fallback}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                />
              </picture>
            ) : (
              <span className={slideClassName} key={slide.fallback} />
            );
          })}
        </div>

        <div className="hero-content">
          <p className="eyebrow">Freshly prepared every day</p>
          <h1>Masala HUB</h1>
          <p className="hero-copy">
            Order rich Indian comfort food, bright vegetarian plates, slow-cooked
            biryanis, and desserts that make dinner feel finished.
          </p>

          <div className="hero-actions" aria-label="Browse menu">
            <Link className="button-primary" to="/veg">
              <span>Explore Veg Menu</span>
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="button-secondary" to="/nonveg">
              <span>View Non-Veg Picks</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="hero-stats" aria-label="Restaurant highlights">
            <div className="hero-stat">
              <strong>55+</strong>
              <span>menu favorites</span>
            </div>
            <div className="hero-stat">
              <strong>30 min</strong>
              <span>quick prep window</span>
            </div>
            <div className="hero-stat">
              <strong>3</strong>
              <span>curated categories</span>
            </div>
          </div>
        </div>

      </section>

      <section className="section-shell" aria-labelledby="category-heading">
        <div className="section-heading">
          <h2 id="category-heading">Choose your craving</h2>
          <p>
            Jump straight into the menu section that fits your table, from daily
            staples to weekend feast plates.
          </p>
        </div>

        <div className="category-grid">
          {categories.map((category) => {
            const CategoryIcon = category.icon;

            return (
              <article className="category-card" key={category.title}>
                <img src={category.image} alt="" />
                <div className="category-card-content">
                  <span className="category-icon" aria-hidden="true">
                    <CategoryIcon />
                  </span>
                  <h3>{category.title}</h3>
                  <p>{category.copy}</p>
                  <Link className="category-link" to={category.to}>
                    <span>Browse {category.title}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="promise-band">
        <div className="section-shell promise-grid">
          <div className="promise-intro">
            <h2>Built for easy ordering</h2>
            <p>
              A clean menu, clear pricing, and simple cart flow make it easy to
              build a meal without slowing down.
            </p>
          </div>
          {promises.map((promise) => {
            const PromiseIcon = promise.icon;

            return (
              <article className="promise-item" key={promise.title}>
                <span className="promise-icon" aria-hidden="true">
                  <PromiseIcon />
                </span>
                <h3>{promise.title}</h3>
                <p>{promise.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-shell" aria-labelledby="popular-heading">
        <div className="section-heading">
          <h2 id="popular-heading">Popular today</h2>
          <p>
            A few house favorites with enough variety to start a full meal in
            one pass.
          </p>
        </div>

        <div className="popular-grid">
          {dishes.map((dish) => (
            <article className="dish-card" key={dish.name}>
              <div className="dish-image-wrap">
                <img src={dish.image} alt={dish.name} />
                <span className="dish-rating">
                  <Star aria-hidden="true" />
                  {dish.rating}
                </span>
              </div>
              <div className="dish-card-content">
                <h3>{dish.name}</h3>
                <p>{dish.copy}</p>
                <div className="dish-meta">
                  <span className="dish-price">{dish.price}</span>
                  <span className="dish-tag">{dish.tag}</span>
                </div>
                <Link className="dish-link" to={dish.to}>
                  <span>View menu</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div className="section-shell cta-panel">
          <div>
            <h2>Ready for dinner?</h2>
            <p>
              Browse the full menu, add your favorites, and keep the evening
              moving.
            </p>
          </div>
          <Link className="button-primary" to="/desserts">
            <ShoppingBag aria-hidden="true" />
            <span>Finish With Dessert</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
