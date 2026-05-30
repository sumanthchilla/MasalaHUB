import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "./api";
import {
  dessertItems,
  menuItems,
  nonvegItems,
  vegItems,
} from "../../shared/menuItems";

const fallbackByCategory = {
  veg: vegItems,
  nonveg: nonvegItems,
  dessert: dessertItems,
};

const getFallbackItems = (category) =>
  category ? fallbackByCategory[category] || [] : menuItems;

export function useMenuCatalog(category = "") {
  const fallbackItems = useMemo(() => getFallbackItems(category), [category]);
  const [remoteCatalog, setRemoteCatalog] = useState({
    category: "",
    items: null,
  });

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();

    if (category) params.set("category", category);

    apiRequest(`/api/menu${params.toString() ? `?${params.toString()}` : ""}`)
      .then((data) => {
        if (isMounted && Array.isArray(data.menu)) {
          setRemoteCatalog({
            category,
            items: data.menu,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setRemoteCatalog({
            category,
            items: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [category]);

  const items =
    remoteCatalog.category === category && Array.isArray(remoteCatalog.items)
      ? remoteCatalog.items
      : fallbackItems;

  return { items, isLoading: false };
}

export const getFallbackMenuItem = (cartKey) =>
  menuItems.find((item) => item.cartKey === cartKey || item.id === cartKey);
