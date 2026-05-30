import MenuPage from "./components/MenuPage";
import { useMenuCatalog } from "./menuCatalog";

function Veg() {
  const { items, isLoading } = useMenuCatalog("veg");

  return <MenuPage title="Vegetarian Dishes" items={items} isLoading={isLoading} />;
}

export default Veg;
