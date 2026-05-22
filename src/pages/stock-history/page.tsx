import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import {
  Search,
  PackagePlus,
  Activity,
  Filter,
  X,
  User,
  MapPin,
  Tag,
} from "lucide-react";

export default function StockHistoryPage() {
  const history = useQuery(api.stocks.listStockHistory, {});

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    if (!history) return [];
    return history.filter((h) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        h.itemCode.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        (h.recordedBy ?? "").toLowerCase().includes(q) ||
        (h.category ?? "").toLowerCase().includes(q) ||
        (h.location ?? "").toLowerCase().includes(q) ||
        (h.remarks ?? "").toLowerCase().includes(q);

      let matchDate = true;
      if (dateFrom || dateTo) {
        const d = parseISO(h.dateRecorded);
        if (dateFrom && dateTo) {
          matchDate = isWithinInterval(d, {
            start: startOfDay(parseISO(dateFrom)),
            end: endOfDay(parseISO(dateTo)),
          });
        } else if (dateFrom) {
          matchDate = d >= startOfDay(parseISO(dateFrom));
        } else if (dateTo) {
          matchDate = d <= endOfDay(parseISO(dateTo));
        }
      }

      return matchSearch && matchDate;
    });
  }, [history, search, dateFrom, dateTo]);

  // Group by date label from dateRecorded
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const h of filtered) {
      const label = format(parseISO(h.dateRecorded), "EEEE, MMMM d, yyyy");
      if (!groups[label]) groups[label] = [];
      groups[label].push(h);
    }
    return Object.entries(groups);
  }, [filtered]);

  const hasFilters = search || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock History</h1>
        <p className="text-muted-foreground text-sm">Records of all new stock entries</p>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {history === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Records</span>
              </div>
              <div className="text-2xl font-bold">{history.length}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <PackagePlus className="w-4 h-4 text-chart-2" />
                <span className="text-xs text-muted-foreground">Total Qty Added</span>
              </div>
              <div className="text-2xl font-bold text-chart-2">
                {history.reduce((s, h) => s + h.qty, 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Filtered Records</span>
              </div>
              <div className="text-2xl font-bold text-primary">{filtered.length}</div>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search item, description, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 text-xs"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="cursor-pointer text-muted-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      {history !== undefined && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          {history.length} records
        </p>
      )}

      {/* Timeline */}
      {history === undefined ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g}>
              <Skeleton className="h-4 w-40 mb-3" />
              <div className="space-y-2 ml-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {hasFilters ? "No records match your filters." : "No stock history records yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dateLabel}
                </div>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {items.map((h) => (
                  <Card key={h._id} className="p-0 overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="flex items-stretch">
                      {/* Left accent strip */}
                      <div className="w-1 shrink-0 bg-chart-2" />

                      <div className="flex-1 flex items-center gap-3 px-4 py-3">
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-chart-2/10">
                          <PackagePlus className="w-4 h-4 text-chart-2" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{h.description}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {h.itemCode}
                            </span>
                            {h.category && (
                              <Badge variant="outline" className="text-xs py-0 h-4 gap-1">
                                <Tag className="w-2.5 h-2.5" />
                                {h.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-muted-foreground">
                            {h.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {h.location}
                              </span>
                            )}
                            {h.recordedBy && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {h.recordedBy}
                              </span>
                            )}
                            {h.remarks && (
                              <span className="italic">"{h.remarks}"</span>
                            )}
                          </div>
                        </div>

                        {/* Quantity + time */}
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-chart-2">+{h.qty}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(h.dateRecorded), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
