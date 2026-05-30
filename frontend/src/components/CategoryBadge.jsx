import { categoryMeta } from "../../../shared/menuItems";

import "./CategoryBadge.css";

function CategoryBadge({ type, size = "md" }) {
  const normalizedType = type === "desserts" ? "dessert" : type;
  const meta = categoryMeta[normalizedType] || {
    label: "Item",
    fullLabel: "Menu item",
  };

  return (
    <span
      className={`category-badge category-badge-${normalizedType} category-badge-${size}`}
      title={meta.fullLabel}
    >
      <span className={`category-symbol category-symbol-${normalizedType}`} aria-hidden="true">
        <span />
      </span>
      {meta.label}
    </span>
  );
}

export default CategoryBadge;
