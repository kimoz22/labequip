import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export default function StockHistorySummary({ limit = 5 }: { limit?: number }) {
  const history = useQuery(api.stocks.listStockHistory, {});

  if (history === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-muted-foreground text-sm">No stock history yet.</p>;
  }

  const sorted = [...history].sort((a, b) =>
    new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime()
  );

  const items = sorted.slice(0, limit);

  return (
    <div className="space-y-1">
      <div className="divide-y">
        {items.map((h) => (
          <div key={h._id} className="py-3 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{h.itemCode}</span>
              <span className="text-muted-foreground ml-2">{h.description}</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-chart-2">+{h.qty}</div>
              <div className="text-xs text-muted-foreground">{format(parseISO(h.dateRecorded), "HH:mm")}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 text-xs text-muted-foreground">
        Showing latest {items.length} entries — <Link to="/stock-history" className="text-primary underline">View full history</Link>
      </div>
    </div>
  );
}
