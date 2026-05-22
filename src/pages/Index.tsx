import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Package, ArrowLeftRight, Layers, Tag, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import StockHistorySummary from "@/components/stock-history/StockHistorySummary.tsx";

export default function Index() {
  const stocks = useQuery(api.stocks.list, {});
  const transfers = useQuery(api.stocks.listTransfers, {});
  const materials = useQuery(api.materials.list, {});
  const categories = useQuery(api.categories.list, {});

  const isLoading = stocks === undefined || transfers === undefined;

  const lowStockCount = stocks?.filter((s) => s.closeBal <= 5).length ?? 0;

  const stats = [
    {
      label: "Total Stock Items",
      value: stocks?.length ?? 0,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      to: "/stocks",
    },
    {
      label: "Total Transfers",
      value: transfers?.length ?? 0,
      icon: ArrowLeftRight,
      color: "text-accent",
      bg: "bg-accent/10",
      to: "/transfers",
    },
    {
      label: "Materials",
      value: materials?.length ?? 0,
      icon: Layers,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      to: "/materials",
    },
    {
      label: "Categories",
      value: categories?.length ?? 0,
      icon: Tag,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      to: "/categories",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Laboratory stock overview</p>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{lowStockCount}</strong> stock item{lowStockCount > 1 ? "s" : ""} with low balance (≤5 units)
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <div className={`w-8 h-8 rounded-md ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold">{value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : transfers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No transfers recorded yet.</p>
          ) : (
            <div className="divide-y">
              {transfers.slice(0, 5).map((t) => (
                <div key={t._id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{t.itemCode}</span>
                    <span className="text-muted-foreground ml-2">{t.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        t.transferType === "out"
                          ? "text-destructive font-medium"
                          : "text-chart-3 font-medium"
                      }
                    >
                      {t.transferType === "out" ? "-" : "+"}{t.quantity}
                    </span>
                    <span className="text-muted-foreground text-xs capitalize">
                      {t.transferType.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Stock History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock History</CardTitle>
        </CardHeader>
        <CardContent>
          <StockHistorySummary />
        </CardContent>
      </Card>
    </div>
  );
}
