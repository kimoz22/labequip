import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AppLayout from "./pages/layout.tsx";
import Index from "./pages/Index.tsx";
import StocksPage from "./pages/stocks/page.tsx";
import TransfersPage from "./pages/transfers/page.tsx";
import MaterialsPage from "./pages/materials/page.tsx";
import CategoriesPage from "./pages/categories/page.tsx";
import SuppliersPage from "./pages/suppliers/page.tsx";
import ExpiredItemsPage from "./pages/expired-items/page.tsx";
import LocationsPage from "./pages/locations/page.tsx";
import UsersPage from "./pages/users/page.tsx";
import ShelfItemsPage from "./pages/shelf-items/page.tsx";
import LoginPage from "./pages/login/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/expired-items" element={<ExpiredItemsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/shelf-items" element={<ShelfItemsPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
