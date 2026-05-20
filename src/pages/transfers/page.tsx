import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Search } from "lucide-react";

export default function TransfersPage() {
  const transfers = useQuery(api.stocks.listTransfers, {});
  const [search, setSearch] = useState("");

  const filtered = transfers?.filter((t) => {
    const q = search.toLowerCase();
    return t.itemCode.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfer History</h1>
        <p className="text-muted-foreground text-sm">All inventory movements</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by item code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Quantity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">From</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {transfers === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {search ? "No transfers match your search." : "No transfers recorded yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(t._creationTime), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">{t.itemCode}</td>
                    <td className="px-4 py-3">{t.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.transferType === "out" ? "destructive" : "secondary"}>
                        {t.transferType.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.transferType === "out" ? "text-destructive" : "text-chart-3"}`}>
                      {Math.abs(t.quantity)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.fromLocation ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.toLocation ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{t.transferredBy ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{t.remarks ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
