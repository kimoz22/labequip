import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("deliveries").order("desc").collect();
  },
});

export const getNextDeliveryNo = query({
  args: {},
  handler: async (ctx): Promise<string> => {
    const last = await ctx.db.query("deliveries").order("desc").first();
    if (!last) return "DLV-0001";

    const match = last.deliveryNo.match(/^(.*?)(\d+)$/);
    if (!match) return "DLV-0001";

    const prefix = match[1];
    const num = parseInt(match[2], 10);
    const padLength = match[2].length;
    const next = String(num + 1).padStart(padLength, "0");
    return `${prefix}${next}`;
  },
});

export const create = mutation({
  args: {
    deliveryNo: v.string(),
    itemCode: v.string(),
    description: v.string(),
    qty: v.number(),
    unit: v.optional(v.string()),
    location: v.optional(v.string()),
    customer: v.string(),
    date: v.string(),
    preparedBy: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deliveries", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("deliveries"),
    deliveryNo: v.string(),
    itemCode: v.string(),
    description: v.string(),
    qty: v.number(),
    unit: v.optional(v.string()),
    location: v.optional(v.string()),
    customer: v.string(),
    date: v.string(),
    preparedBy: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Create delivery + update stock + shelf in one mutation ────────────────────
export const createWithStockUpdate = mutation({
  args: {
    deliveryNo: v.string(),
    customer: v.string(),
    date: v.string(),
    preparedBy: v.string(),
    remarks: v.optional(v.string()),
    items: v.array(
      v.object({
        itemCode: v.string(),
        description: v.string(),
        qty: v.number(),
        unit: v.optional(v.string()),
        location: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    for (const item of args.items) {
      // 1. Insert delivery record
      await ctx.db.insert("deliveries", {
        deliveryNo: args.deliveryNo,
        itemCode: item.itemCode,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        location: item.location,
        customer: args.customer,
        date: args.date,
        preparedBy: args.preparedBy,
        remarks: args.remarks,
      });

      // 2. Find the stock row by itemCode
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_itemCode", (q) => q.eq("itemCode", item.itemCode))
        .first();

      if (stock) {
        // 3. Update transferQty and recalculate closeBal: closeBal = existing closeBal - delivered qty
        const newTransferQty = stock.transferQty + item.qty;
        const newCloseBal = stock.closeBal - item.qty;

        await ctx.db.patch(stock._id, {
          transferQty: newTransferQty,
          closeBal: newCloseBal,
        });

        // 4. Record in transfers table
        await ctx.db.insert("transfers", {
          stockId: stock._id,
          itemCode: stock.itemCode,
          description: stock.description,
          transferType: "out",
          quantity: item.qty,
          fromLocation: item.location,
          toLocation: undefined,
          remarks: `Delivery ${args.deliveryNo} to ${args.customer}`,
          transferredBy: identity?.name ?? identity?.email ?? "Unknown",
        });
      }

      // 5. Deduct qty from shelfItems at the selected location
      const shelfItems = await ctx.db
        .query("shelfItems")
        .withIndex("by_prodCode", (q) => q.eq("prodCode", item.itemCode))
        .collect();

      const shelfRow = shelfItems.find((s) => s.location === item.location);
      if (shelfRow) {
        const newQty = Math.max(0, shelfRow.qty - item.qty);
        await ctx.db.patch(shelfRow._id, { qty: newQty });
      }
    }
  },
});

// Fetch all delivery rows for a given deliveryNo (for PDF export)
export const getByDeliveryNo = query({
  args: { deliveryNo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveries")
      .withIndex("by_deliveryNo", (q) => q.eq("deliveryNo", args.deliveryNo))
      .collect();
  },
});

// Search shelf items by description or prodCode, grouped by prodCode
export const searchShelfItems = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    if (!args.search.trim()) return [];

    const all = await ctx.db.query("shelfItems").order("desc").collect();
    const q = args.search.toLowerCase();

    const matched = all.filter(
      (i) =>
        i.description.toLowerCase().includes(q) ||
        i.prodCode.toLowerCase().includes(q)
    );

    const grouped = new Map<
      string,
      {
        prodCode: string;
        description: string;
        unit: string | undefined;
        locations: { location: string; qty: number }[];
      }
    >();

    for (const item of matched) {
      const existing = grouped.get(item.prodCode);
      const loc = { location: item.location ?? "Unknown", qty: item.qty };
      if (existing) {
        existing.locations.push(loc);
      } else {
        grouped.set(item.prodCode, {
          prodCode: item.prodCode,
          description: item.description,
          unit: item.unit,
          locations: [loc],
        });
      }
    }

    return Array.from(grouped.values()).slice(0, 20);
  },
});

// Get all shelf locations + qty for a specific prodCode
export const getShelfLocations = query({
  args: { prodCode: v.string() },
  handler: async (ctx, args) => {
    if (!args.prodCode.trim()) return [];
    const items = await ctx.db
      .query("shelfItems")
      .withIndex("by_prodCode", (q) => q.eq("prodCode", args.prodCode))
      .collect();
    return items.map((i) => ({
      shelfId: i._id,
      location: i.location ?? "Unknown",
      qty: i.qty,
    }));
  },
});
