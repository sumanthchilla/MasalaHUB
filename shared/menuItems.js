const createItem = (category, item) => ({
  ...item,
  id: `${category}-${item.menuId}`,
  category,
  cartKey: `${category}-${item.menuId}`,
});

export const categoryMeta = {
  veg: {
    label: "Veg",
    fullLabel: "Vegetarian",
  },
  nonveg: {
    label: "Non-Veg",
    fullLabel: "Non-Vegetarian",
  },
  dessert: {
    label: "Dessert",
    fullLabel: "Desserts",
  },
};

export const vegItems = [
  { menuId: 1, name: "Veg Biryani", price: 120, description: "Aromatic rice with vegetables", image: "/Vegitems/Veg Biryani.jpg" },
  { menuId: 2, name: "Paneer Butter Masala", price: 150, description: "Creamy paneer curry", image: "/Vegitems/Paneer Butter Masala.jpg" },
  { menuId: 3, name: "Dal Tadka", price: 90, description: "Yellow dal with spices", image: "/Vegitems/Dal Tadka.jpg" },
  { menuId: 4, name: "Mixed Vegetable Curry", price: 100, description: "Seasonal vegetables cooked in gravy", image: "/Vegitems/Mixed Vegetable Curry.jpg" },
  { menuId: 5, name: "Palak Paneer", price: 140, description: "Spinach gravy with paneer cubes", image: "/Vegitems/Palak Paneer.jpg" },
  { menuId: 6, name: "Aloo Gobi", price: 80, description: "Potato and cauliflower curry", image: "/Vegitems/Aloo Gobi.jpg" },
  { menuId: 7, name: "Chole Masala", price: 110, description: "Spicy chickpea curry", image: "/Vegitems/Chole Masala.jpg" },
  { menuId: 8, name: "Rajma", price: 100, description: "Kidney beans curry", image: "/Vegitems/Rajma.jpg" },
  { menuId: 9, name: "Sambar Rice", price: 90, description: "Rice mixed with sambar", image: "/Vegitems/Sambar Rice.jpg" },
  { menuId: 10, name: "Curd Rice", price: 70, description: "Rice with curd and seasoning", image: "/Vegitems/Curd Rice.jpg" },
  { menuId: 11, name: "Masala Dosa", price: 80, description: "Crispy dosa with potato filling", image: "/Vegitems/Masala Dosa.jpg" },
  { menuId: 12, name: "Idli Sambar", price: 60, description: "Soft idlis with sambar", image: "/Vegitems/Idli Sambar.jpg" },
  { menuId: 13, name: "Upma", price: 50, description: "South Indian breakfast dish", image: "/Vegitems/Upma.jpg" },
  { menuId: 14, name: "Poha", price: 40, description: "Light and healthy breakfast", image: "/Vegitems/Poha.jpg" },
  { menuId: 15, name: "Roti", price: 20, description: "Soft wheat roti", image: "/Vegitems/Roti.jpg" },
  { menuId: 16, name: "Naan", price: 30, description: "Tandoor baked bread", image: "/Vegitems/Naan.jpg" },
  { menuId: 17, name: "Paneer Tikka", price: 160, description: "Grilled paneer cubes", image: "/Vegitems/Paneer Tikka.jpg" },
  { menuId: 18, name: "Veg Pulao", price: 110, description: "Mild spiced vegetable rice", image: "/Vegitems/Veg Pulao.jpg" },
  { menuId: 19, name: "Kadhi Pakora", price: 90, description: "Yogurt curry with pakoras", image: "/Vegitems/Kadhi Pakora.jpg" },
  { menuId: 20, name: "Jeera Rice", price: 80, description: "Rice tempered with cumin seeds", image: "/Vegitems/Jeera Rice.jpg" },
].map((item) => createItem("veg", item));

export const nonvegItems = [
  { menuId: 1, name: "Chicken Biryani", price: 180, description: "Spicy chicken with rice", image: "/Nonvegitems/Chicken Biryani.jpg" },
  { menuId: 2, name: "Mutton Biryani", price: 220, description: "Rich mutton flavored rice", image: "/Nonvegitems/Mutton Biryani.jpg" },
  { menuId: 3, name: "Chicken Curry", price: 160, description: "Traditional chicken gravy", image: "/Nonvegitems/Chicken Curry.jpg" },
  { menuId: 4, name: "Butter Chicken", price: 190, description: "Creamy tomato chicken curry", image: "/Nonvegitems/Butter Chicken.jpg" },
  { menuId: 5, name: "Chicken Tikka", price: 200, description: "Grilled spicy chicken pieces", image: "/Nonvegitems/Chicken Tikka.jpg" },
  { menuId: 6, name: "Fish Curry", price: 170, description: "Spicy fish gravy", image: "/Nonvegitems/Fish Curry.jpg" },
  { menuId: 7, name: "Prawn Masala", price: 210, description: "Prawns cooked in masala", image: "/Nonvegitems/Prawn Masala.jpg" },
  { menuId: 8, name: "Egg Curry", price: 120, description: "Boiled eggs in gravy", image: "/Nonvegitems/Egg Curry.jpg" },
  { menuId: 9, name: "Chicken Fried Rice", price: 150, description: "Rice with chicken and spices", image: "/Nonvegitems/Chicken Fried Rice.jpg" },
  { menuId: 10, name: "Chicken Noodles", price: 140, description: "Noodles with chicken", image: "/Nonvegitems/Chicken Noodles.jpg" },
  { menuId: 11, name: "Grilled Chicken", price: 220, description: "Charcoal grilled chicken", image: "/Nonvegitems/Grilled Chicken.jpg" },
  { menuId: 12, name: "Chicken Wings", price: 160, description: "Crispy fried wings", image: "/Nonvegitems/Chicken Wings.jpg" },
  { menuId: 13, name: "Mutton Curry", price: 210, description: "Spicy mutton curry", image: "/Nonvegitems/Mutton Curry.jpg" },
  { menuId: 14, name: "Fish Fry", price: 150, description: "Fried fish with spices", image: "/Nonvegitems/Fish Fry.jpg" },
  { menuId: 15, name: "Egg Biryani", price: 130, description: "Rice cooked with eggs", image: "/Nonvegitems/Egg Biryani.jpg" },
].map((item) => createItem("nonveg", item));

export const dessertItems = [
  { menuId: 1, name: "Gulab Jamun", price: 80, description: "Soft sweet balls in sugar syrup", image: "/Desserts/Gulab Jamun.jpg" },
  { menuId: 2, name: "Rasgulla", price: 70, description: "Spongy cheese balls in syrup", image: "/Desserts/Rasgulla.jpg" },
  { menuId: 3, name: "Kaju Katli", price: 150, description: "Cashew sweet delicacy", image: "/Desserts/Kaju Katli.jpg" },
  { menuId: 4, name: "Chocolate Cake", price: 120, description: "Rich chocolate layered cake", image: "/Desserts/Chocolate Cake.jpg" },
  { menuId: 5, name: "Ice Cream", price: 60, description: "Chilled creamy dessert", image: "/Desserts/Ice Cream.jpg" },
  { menuId: 6, name: "Brownie", price: 90, description: "Chocolate brownie with nuts", image: "/Desserts/Brownie.jpg" },
  { menuId: 7, name: "Ladoo", price: 50, description: "Traditional Indian sweet balls", image: "/Desserts/Ladoo.jpg" },
  { menuId: 8, name: "Jalebi", price: 70, description: "Crispy spiral sweet", image: "/Desserts/Jalebi.jpg" },
  { menuId: 9, name: "Pudding", price: 80, description: "Soft creamy dessert", image: "/Desserts/Pudding.jpg" },
  { menuId: 10, name: "Cupcake", price: 60, description: "Small sweet cake", image: "/Desserts/Cupcake.jpg" },
  { menuId: 11, name: "Rasmalai", price: 90, description: "Soft paneer discs in milk", image: "/Desserts/Rasmalai.jpg" },
  { menuId: 12, name: "Mysore Pak", price: 100, description: "Ghee rich sweet", image: "/Desserts/Mysore Pak.jpg" },
  { menuId: 13, name: "Halwa", price: 80, description: "Sweet semolina dessert", image: "/Desserts/Halwa.jpg" },
  { menuId: 14, name: "Barfi", price: 90, description: "Milk-based sweet", image: "/Desserts/Barfi.jpg" },
  { menuId: 15, name: "Donut", price: 70, description: "Fried sweet ring", image: "/Desserts/Donut.jpg" },
  { menuId: 16, name: "Cheesecake", price: 140, description: "Creamy cheese dessert", image: "/Desserts/Cheesecake.jpg" },
  { menuId: 17, name: "Falooda", price: 110, description: "Sweet drink dessert", image: "/Desserts/Falooda.jpg" },
  { menuId: 18, name: "Kulfi", price: 80, description: "Traditional Indian ice cream", image: "/Desserts/Kulfi.jpg" },
  { menuId: 19, name: "Fruit Salad", price: 70, description: "Mixed fresh fruits", image: "/Desserts/Fruit Salad.jpg" },
  { menuId: 20, name: "Payasam", price: 90, description: "Sweet milk pudding", image: "/Desserts/Payasam.jpg" },
].map((item) => createItem("dessert", item));

export const menuItems = [...vegItems, ...nonvegItems, ...dessertItems];

export const getCartItemKey = (item) =>
  item?.cartKey || item?.id || `${item?.category || "item"}-${item?.menuId || item?.name}`;

export const findMenuItemByCartKey = (cartKey) =>
  menuItems.find((item) => item.cartKey === cartKey || item.id === cartKey);
