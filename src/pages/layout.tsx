import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Layers,
  Tag,
  Activity,
  Users,
  FlaskConical,
  LogOut,
  Menu,
  X,
  Truck,
  ShieldAlert,
  MapPin,
  Layers3,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stocks", label: "Stocks", icon: Package },
  { to: "/stock-history", label: "Stock History", icon: Activity },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/materials", label: "Materials", icon: Layers },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/expired-items", label: "Expired Items", icon: ShieldAlert },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/shelf-items", label: "Shelf Items", icon: Layers3 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
];

const adminNavItems = [{ to: "/users", label: "Users", icon: Users }];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    signout();
    navigate("/login", { replace: true });
  };

  const isAdmin = user?.role === "admin";
  const allItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <div className="font-bold text-sidebar-foreground text-sm tracking-wide">Lab Equip</div>
          <div className="text-xs text-sidebar-foreground/50">Inventory System</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        {user && (
          <div className="px-3 py-2 mb-2">
            <div className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex md:w-60 flex-col bg-sidebar shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full bg-sidebar flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-foreground cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">LabEquip</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
