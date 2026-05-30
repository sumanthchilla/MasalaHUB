import { createSlice } from "@reduxjs/toolkit";

import { getCartItemKey } from "../../shared/menuItems";

const initialState = {
  items: [],
  appliedCoupon: null,
};

const findCartItem = (items, payload) => {
  const targetKey = getCartItemKey(payload);
  return items.find((item) => getCartItemKey(item) === targetKey);
};

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    addToCart: (state, action) => {
      const cartKey = getCartItemKey(action.payload);
      const existingItem = findCartItem(state.items, action.payload);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, cartKey, quantity: 1 });
      }
    },

    addItemsToCart: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [];

      for (const item of items) {
        const cartKey = getCartItemKey(item);
        const quantity = Math.max(Number(item.quantity) || 1, 1);
        const existingItem = findCartItem(state.items, item);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          state.items.push({ ...item, cartKey, quantity });
        }
      }
    },

    removeCart: (state, action) => {
      const targetKey = getCartItemKey(action.payload);
      state.items = state.items.filter((item) => getCartItemKey(item) !== targetKey);
    },

    incrementQty: (state, action) => {
      const item = findCartItem(state.items, action.payload);
      if (item) item.quantity += 1;
    },

    decrementQty: (state, action) => {
      const item = findCartItem(state.items, action.payload);

      if (item && item.quantity > 1) {
        item.quantity -= 1;
      } else {
        const targetKey = getCartItemKey(action.payload);
        state.items = state.items.filter((cartItem) => getCartItemKey(cartItem) !== targetKey);
      }
    },

    applyCoupon: (state, action) => {
      state.appliedCoupon = action.payload;
    },

    removeCoupon: (state) => {
      state.appliedCoupon = null;
    },

    clearCart: (state) => {
      state.items = [];
      state.appliedCoupon = null;
    },
  },
});

export const {
  addToCart,
  addItemsToCart,
  removeCart,
  incrementQty,
  decrementQty,
  applyCoupon,
  removeCoupon,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
