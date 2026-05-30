import MenuPage from "./components/MenuPage";
import { useMenuCatalog } from "./menuCatalog";

function Nonveg() {
  const { items, isLoading } = useMenuCatalog("nonveg");

  return <MenuPage title="Non-Vegetarian" items={items} isLoading={isLoading} />;
}

export default Nonveg;
