import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CakeSlice,
  Clock3,
  Drumstick,
  House,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";

import Footer from "./components/Footer";
import { apiRequest } from "./api";
import { logout, setAuthStatus, setUser } from "./authSlice";
import { categoryMeta } from "../../shared/menuItems";
import { useMenuCatalog } from "./menuCatalog";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const routeLoaders = {
  home: () => import("./Home"),
  veg: () => import("./Veg"),
  nonveg: () => import("./Nonveg"),
  desserts: () => import("./Desserts"),
  history: () => import("./History"),
  admin: () => import("./Admin"),
  cart: () => import("./Cart"),
  about: () => import("./About"),
  contact: () => import("./Contact"),
  legal: () => import("./Legal"),
  authModal: () => import("./components/AuthModal"),
};

const Home = lazy(routeLoaders.home);
const Veg = lazy(routeLoaders.veg);
const Nonveg = lazy(routeLoaders.nonveg);
const Desserts = lazy(routeLoaders.desserts);
const History = lazy(routeLoaders.history);
const Admin = lazy(routeLoaders.admin);
const Cart = lazy(routeLoaders.cart);
const About = lazy(routeLoaders.about);
const Contact = lazy(routeLoaders.contact);
const Legal = lazy(routeLoaders.legal);
const AuthModal = lazy(routeLoaders.authModal);

const preloadRoute = (routeKey) => {
  routeLoaders[routeKey]?.();
};

const menuRouteByCategory = {
  veg: "/veg",
  nonveg: "/nonveg",
  dessert: "/desserts",
};

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      <span aria-hidden="true" />
    </div>
  );
}

function PreloadNavLink({ routeKey, ...props }) {
  return (
    <NavLink
      {...props}
      onFocus={() => preloadRoute(routeKey)}
      onMouseEnter={() => preloadRoute(routeKey)}
    />
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);

  return null;
}

function AppShell() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useSelector((state) => state.cart.items);
  const authToken = useSelector((state) => state.auth.token);
  const authUser = useSelector((state) => state.auth.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navMenuRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const { items: catalogItems } = useMenuCatalog();

  const cartQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + (item.quantity || 1), 0),
    [cartItems]
  );

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return catalogItems
      .filter((item) => {
        const categoryLabel = categoryMeta[item.category]?.fullLabel || item.category;
        return `${item.name} ${item.description} ${categoryLabel}`
          .toLowerCase()
          .includes(normalizedSearchQuery);
      })
      .sort((firstItem, secondItem) => {
        const firstStarts = firstItem.name.toLowerCase().startsWith(normalizedSearchQuery);
        const secondStarts = secondItem.name.toLowerCase().startsWith(normalizedSearchQuery);

        if (firstStarts === secondStarts) {
          return firstItem.name.localeCompare(secondItem.name);
        }

        return firstStarts ? -1 : 1;
      })
      .slice(0, 6);
  }, [catalogItems, normalizedSearchQuery]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (!authToken || authUser) return;

    let isMounted = true;

    const hydrateAuth = async () => {
      dispatch(setAuthStatus("loading"));
      try {
        const data = await apiRequest("/api/auth/me");
        if (isMounted) dispatch(setUser(data.user));
      } catch {
        if (isMounted) dispatch(logout());
      }
    };

    hydrateAuth();
    return () => {
      isMounted = false;
    };
  }, [authToken, authUser, dispatch]);

  useEffect(() => {
    if (!navMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setNavMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNavMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navMenuOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const focusId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    const handlePointerDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        closeSearch();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch, searchOpen]);

  const handleLogout = () => {
    dispatch(logout());
    setNavMenuOpen(false);
  };

  const openAuthModal = () => {
    preloadRoute("authModal");
    setNavMenuOpen(false);
    setAuthOpen(true);
  };

  const openSearch = () => {
    setNavMenuOpen(false);
    setSearchOpen(true);
  };

  const handleSearchBlur = (event) => {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement && searchRef.current?.contains(nextFocusedElement)) {
      return;
    }

    window.setTimeout(() => {
      if (!searchRef.current?.contains(document.activeElement)) {
        closeSearch();
      }
    }, 80);
  };

  const goToSearchResult = (item) => {
    const route = menuRouteByCategory[item.category] || "/home";
    closeSearch();
    navigate(route);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (searchResults[0]) {
      goToSearchResult(searchResults[0]);
    }
  };

  return (
    <div className="app-shell">
      <ScrollToTop />
      <nav className="navbar" aria-label="Primary navigation">
          <PreloadNavLink to="/home" routeKey="home" className="logo">
            <img className="logo-mark" src="/masala-hub-logo.svg" alt="" aria-hidden="true" />
            <span className="logo-text">
              Masala <strong>HUB</strong>
            </span>
          </PreloadNavLink>

          <div className="nav-links">
            <div className="nav-primary">
              <PreloadNavLink to="/home" routeKey="home">
                <House aria-hidden="true" />
                <span>Home</span>
              </PreloadNavLink>
              <PreloadNavLink to="/veg" routeKey="veg">
                <Leaf aria-hidden="true" />
                <span>Veg</span>
              </PreloadNavLink>
              <PreloadNavLink to="/nonveg" routeKey="nonveg">
                <Drumstick aria-hidden="true" />
                <span>Non-Veg</span>
              </PreloadNavLink>
              <PreloadNavLink to="/desserts" routeKey="desserts">
                <CakeSlice aria-hidden="true" />
                <span>Desserts</span>
              </PreloadNavLink>
              <PreloadNavLink to="/history" routeKey="history">
                <Clock3 aria-hidden="true" />
                <span>History</span>
              </PreloadNavLink>
            </div>

            <div className="nav-actions">
              <div
                className={`nav-search${searchOpen ? " is-open" : ""}`}
                ref={searchRef}
                onBlurCapture={handleSearchBlur}
              >
                <button
                  type="button"
                  className="nav-search-toggle"
                  onClick={() => (searchOpen ? closeSearch() : openSearch())}
                  aria-label={searchOpen ? "Close search" : "Open search"}
                  aria-expanded={searchOpen}
                  aria-controls="nav-search-panel"
                >
                  {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
                </button>

                {searchOpen ? (
                  <div id="nav-search-panel" className="nav-search-panel">
                    <form className="nav-search-form" onSubmit={handleSearchSubmit}>
                      <Search aria-hidden="true" />
                      <input
                        ref={searchInputRef}
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search dishes"
                        aria-label="Search dishes"
                      />
                    </form>

                    {normalizedSearchQuery ? (
                      <div className="nav-search-results" role="listbox" aria-label="Search results">
                        {searchResults.length ? (
                          searchResults.map((item) => (
                            <button
                              type="button"
                              className="nav-search-result"
                              key={item.cartKey}
                              onClick={() => goToSearchResult(item)}
                              role="option"
                            >
                              <img src={item.image} alt="" />
                              <span className="nav-search-result-copy">
                                <strong>{item.name}</strong>
                                <small>{item.description}</small>
                              </span>
                              <span className="nav-search-result-meta">
                                <b>Rs {item.price}</b>
                                <small>{categoryMeta[item.category]?.label || item.category}</small>
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="nav-search-empty">No matching dishes</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <PreloadNavLink to="/cart" routeKey="cart" className="cart-link">
                <ShoppingCart aria-hidden="true" />
                <span>Cart</span>
                {cartQuantity > 0 && (
                  <span className="cart-badge">{cartQuantity}</span>
                )}
              </PreloadNavLink>

              <div className="nav-menu" ref={navMenuRef}>
                <button
                  type="button"
                  className={`nav-menu-toggle${navMenuOpen ? " is-open" : ""}${
                    isAdminRoute ? " is-route-active" : ""
                  }`}
                  onClick={() => setNavMenuOpen((isOpen) => !isOpen)}
                  aria-label="Open account and admin menu"
                  aria-expanded={navMenuOpen}
                  aria-controls="nav-menu-panel"
                  onFocus={() => {
                    preloadRoute("authModal");
                    preloadRoute("admin");
                  }}
                  onMouseEnter={() => {
                    preloadRoute("authModal");
                    preloadRoute("admin");
                  }}
                >
                  <Menu aria-hidden="true" />
                  <span>Menu</span>
                </button>

                {navMenuOpen ? (
                  <div id="nav-menu-panel" className="nav-menu-panel" role="menu">
                    <div className="nav-menu-profile">
                      <span className="nav-menu-avatar" aria-hidden="true">
                        {authUser?.name ? authUser.name.charAt(0).toUpperCase() : "M"}
                      </span>
                      <span>
                        <strong>{authUser ? authUser.name : "Masala HUB"}</strong>
                        <small>{authUser ? authUser.email : "Login for faster checkout"}</small>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="nav-menu-item"
                      role="menuitem"
                      onClick={openAuthModal}
                    >
                      <UserRound aria-hidden="true" />
                      <span className="nav-menu-copy">
                        <strong>{authUser ? "Profile" : "Login / Create Account"}</strong>
                        <small>{authUser ? "View account details" : "Save orders and checkout faster"}</small>
                      </span>
                    </button>

                    <PreloadNavLink
                      to="/admin"
                      routeKey="admin"
                      className={({ isActive }) =>
                        `nav-menu-item${isActive ? " active" : ""}`
                      }
                      role="menuitem"
                      onClick={() => setNavMenuOpen(false)}
                    >
                      <LayoutDashboard aria-hidden="true" />
                      <span className="nav-menu-copy">
                        <strong>Admin</strong>
                        <small>Dashboard and order analytics</small>
                      </span>
                    </PreloadNavLink>

                    {authUser ? (
                      <button
                        type="button"
                        className="nav-menu-item nav-menu-danger"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        <LogOut aria-hidden="true" />
                        <span className="nav-menu-copy">
                          <strong>Sign Out</strong>
                          <small>Leave this account safely</small>
                        </span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
      </nav>

      <main className="app-main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/veg" element={<Veg />} />
            <Route path="/nonveg" element={<Nonveg />} />
            <Route path="/desserts" element={<Desserts />} />
            <Route path="/history" element={<History />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      <Footer onOpenAuth={authUser ? null : openAuthModal} />

      {authOpen ? (
        <Suspense fallback={null}>
          <AuthModal onClose={() => setAuthOpen(false)} />
        </Suspense>
      ) : null}

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
