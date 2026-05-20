import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Search, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format, differenceInDays, isPast, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils.ts";

type ExpiryStatus = "expired" | "critical" | "warning" | "ok";

function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const date = parseISO(expiryDate);
  if (!isValid(date)) return "ok";
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "critical";
  if (daysLeft <= 30) return "warning";
  return "ok";
}

function getExpiryLabel(expiryDate: string): string {
  const date = parseISO(expiryDate);
  if (!isValid(date)) return "—";
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  return `${daysLeft}d left`;
}

const STATUS_CONFIG = {
  expired: {
    label: "Expired",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
    rowClass: "bg-destructive/5",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700",
    rowClass: "bg-orange-50/50 dark:bg-orange-900/10",
    icon: AlertTriangle,
  },
  warning: {
    label: "Expiring Soon",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700",
    rowClass: "",
    icon: Clock,
  },
  ok: {
    label: "OK",
    badgeClass: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700",
    rowClass: "",
    icon: CheckCircle,
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All with Expiry" },
  { value: "expired", label: "Expired" },
  { value: "critical", label: "Critical (≤7d)" },
  { value: "warning", label: "Expiring Soon (≤30d)" },
  { value: "ok", label: "OK" },
] as const;

type FilterValue = typeof FILTER_OPTIONS[number]["value"];

export default function ExpiredItemsPage() {
  const stocks = useQuery(api.stocks.list, {});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  // Only stocks that have an expiry date
  const withExpiry = stocks?.filter((s) => !!s.expiryDate) ?? [];

  const filtered = withExpiry.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.itemCode.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.supplier ?? "").toLowerCase().includes(q) ||
      (s.brand ?? "").toLowerCase().includes(q);
    const status = getExpiryStatus(s.expiryDate!);
    const matchesFilter = filter === "all" || status === filter;
    return matchesSearch && matchesFilter;
  });

  // Sort: expired first, then by days remaining ascending
  const sorted = [...filtered].sort((a, b) => {
    const dA = differenceInDays(parseISO(a.expiryDate!), new Date());
    const dB = differenceInDays(parseISO(b.expiryDate!), new Date());
    return dA - dB;
  });

  // Summary counts
  const counts = withExpiry.reduce(
    (acc, s) => {
      const status = getExpiryStatus(s.expiryDate!);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ExpiryStatus, number>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expired Items</h1>
        <p className="text-muted-foreground text-sm">Track and manage stock expiry dates</p>
      </div>

      {/* Summary Cards */}
      {stocks !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["expired", "critical", "warning", "ok"] as ExpiryStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <Card
                key={status}
                className={cn(
                  "p-4 cursor-pointer transition-all border-2",
                  filter === status ? "border-primary" : "border-transparent hover:border-border",
                  cfg.rowClass
                )}
                onClick={() => setFilter(filter === status ? "all" : status)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium">{cfg.label}</span>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{counts[status] ?? 0}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, description, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                filter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Brand</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Close Bal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
              </tr>
            </thead>
            <tbody>
              {stocks === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    {withExpiry.length === 0
                      ? "No stock items have an expiry date set. Edit a stock item to add one."
                      : "No items match your search or filter."}
                  </td>
                </tr>
              ) : (
                sorted.map((stock) => {
                  const status = getExpiryStatus(stock.expiryDate!);
                  const cfg = STATUS_CONFIG[status];
                  const daysLeft = differenceInDays(parseISO(stock.expiryDate!), new Date());
                  return (
                    <tr key={stock._id} className={cn("border-b hover:bg-muted/30 transition-colors", cfg.rowClass)}>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.badgeClass)}>
                          <cfg.icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">{stock.itemCode}</td>
                      <td className="px-4 py-3">{stock.description}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{stock.categoryName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{stock.supplier ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{stock.brand ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <Badge variant={stock.closeBal <= 5 ? "destructive" : "secondary"}>
                          {stock.closeBal}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {format(parseISO(stock.expiryDate!), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs font-medium",
                          daysLeft < 0 ? "text-destructive" :
                          daysLeft <= 7 ? "text-orange-600 dark:text-orange-400" :
                          daysLeft <= 30 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-muted-foreground"
                        )}>
                          {getExpiryLabel(stock.expiryDate!)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
