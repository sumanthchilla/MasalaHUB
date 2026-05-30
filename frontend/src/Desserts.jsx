import MenuPage from "./components/MenuPage";
import { useMenuCatalog } from "./menuCatalog";

function Desserts() {
  const { items, isLoading } = useMenuCatalog("dessert");

  return <MenuPage title="Desserts" items={items} isLoading={isLoading} />;
}

export default Desserts;
