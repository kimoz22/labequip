import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const stocks = await ctx.db.query("stocks").collect();
    const categories = await ctx.db.query("categories").collect();
    const catMap = new Map(categories.map((c) => [c._id, c.name]));
    return stocks.map((s) => ({
      ...s,
      categoryName: s.categoryId ? (catMap.get(s.categoryId) ?? null) : null,
    }));
  },
});

export const get = query({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    itemCode: v.string(),
    description: v.string(),
    materialId: v.optional(v.id("materials")),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
    openBal: v.number(),
    receiptQty: v.number(),
    transferQty: v.number(),
    dmgQty: v.optional(v.number()),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const closeBal = args.openBal + args.receiptQty - args.transferQty - (args.dmgQty ?? 0);
    return await ctx.db.insert("stocks", { ...args, closeBal });
  },
});

export const update = mutation({
  args: {
    id: v.id("stocks"),
    itemCode: v.optional(v.string()),
    description: v.optional(v.string()),
    materialId: v.optional(v.id("materials")),
    categoryId: v.optional(v.id("categories")),
    unit: v.optional(v.string()),
    openBal: v.optional(v.number()),
    receiptQty: v.optional(v.number()),
    transferQty: v.optional(v.number()),
    dmgQty: v.optional(v.number()),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ message: "Stock not found", code: "NOT_FOUND" });
    const openBal = fields.openBal ?? existing.openBal;
    const receiptQty = fields.receiptQty ?? existing.receiptQty;
    const transferQty = fields.transferQty ?? existing.transferQty;
    const dmgQty = fields.dmgQty ?? existing.dmgQty ?? 0;
    const closeBal = openBal + receiptQty - transferQty - dmgQty;
    await ctx.db.patch(id, { ...fields, closeBal });
  },
});

export const remove = mutation({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    await ctx.db.delete(args.id);
  },
});

export const transfer = mutation({
  args: {
    stockId: v.id("stocks"),
    transferType: v.union(v.literal("out"), v.literal("new_stock"), v.literal("receipt")),
    quantity: v.number(),
    fromLocation: v.optional(v.string()),
    toLocation: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const stock = await ctx.db.get(args.stockId);
    if (!stock) throw new ConvexError({ message: "Stock not found", code: "NOT_FOUND" });

    let newReceiptQty = stock.receiptQty;
    let newTransferQty = stock.transferQty;

    if (args.transferType === "out") {
      newTransferQty += args.quantity;
    } else if (args.transferType === "receipt" || args.transferType === "new_stock") {
      newReceiptQty += args.quantity;
    }

    const newCloseBal = stock.openBal + newReceiptQty - newTransferQty;

    await ctx.db.patch(args.stockId, {
      receiptQty: newReceiptQty,
      transferQty: newTransferQty,
      closeBal: newCloseBal,
    });

    await ctx.db.insert("transfers", {
      stockId: args.stockId,
      itemCode: stock.itemCode,
      description: stock.description,
      transferType: args.transferType,
      quantity: args.quantity,
      fromLocation: args.fromLocation,
      toLocation: args.toLocation,
      remarks: args.remarks,
      transferredBy: identity.name,
    });

    return newCloseBal;
  },
});

export const listTransfers = query({
  args: { stockId: v.optional(v.id("stocks")) },
  handler: async (ctx, args) => {
    if (args.stockId) {
      return await ctx.db
        .query("transfers")
        .withIndex("by_stockId", (q) => q.eq("stockId", args.stockId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("transfers").order("desc").collect();
  },
});

export const listTransfersWithDetails = query({
  args: {},
  handler: async (ctx) => {
    const transfers = await ctx.db.query("transfers").order("desc").collect();
    const stockIds = [...new Set(transfers.map((t) => t.stockId))];
    const stocks = await Promise.all(stockIds.map((id) => ctx.db.get(id)));
    const stockMap = new Map(stocks.filter(Boolean).map((s) => [s!._id, s!]));
    const categories = await ctx.db.query("categories").collect();
    const catMap = new Map(categories.map((c) => [c._id, c.name]));

    return transfers.map((t) => {
      const stock = stockMap.get(t.stockId);
      return {
        ...t,
        unit: stock?.unit ?? null,
        location: stock?.location ?? null,
        categoryName: stock?.categoryId ? (catMap.get(stock.categoryId) ?? null) : null,
      };
    });
  },
});

export const addToOpenBal = mutation({
  args: {
    stockId: v.id("stocks"),
    qty: v.number(),
    toLocation: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const stock = await ctx.db.get(args.stockId);
    if (!stock) throw new ConvexError({ message: "Stock not found", code: "NOT_FOUND" });

    const newOpenBal = stock.openBal + args.qty;
    const newReceiptQty = stock.receiptQty + args.qty;
    const newCloseBal = stock.closeBal + args.qty;

    await ctx.db.patch(args.stockId, {
      openBal: newOpenBal,
      receiptQty: newReceiptQty,
      closeBal: newCloseBal,
    });

    // Update shelf item qty for the selected location
    if (args.toLocation) {
      const existingShelfItem = await ctx.db
        .query("shelfItems")
        .withIndex("by_prodCode", (q) => q.eq("prodCode", stock.itemCode))
        .collect()
        .then((items) => items.find((i) => i.location === args.toLocation));

      if (existingShelfItem) {
        await ctx.db.patch(existingShelfItem._id, {
          qty: existingShelfItem.qty + args.qty,
        });
      } else {
        // Create a new shelf item for this location
        const now = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Dar_es_Salaam",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        await ctx.db.insert("shelfItems", {
          prodCode: stock.itemCode,
          description: stock.description,
          unit: stock.unit,
          categoryId: stock.categoryId,
          location: args.toLocation,
          qty: args.qty,
          recorded: identity.name ?? undefined,
          dateRecorded: now,
        });
      }
    }

    // Also record in transfers table for stock history page
    //  await ctx.db.insert("transfers", {
    //  stockId: args.stockId,
    // itemCode: stock.itemCode,
    // description: stock.description,
    // transferType: "new_stock",
    // quantity: args.qty,
    // toLocation: args.toLocation,
    // remarks: args.remarks,
    // transferredBy: identity.name,
    //});

    return newCloseBal;
  },
});

export const addStockHistory = mutation({
  args: {
    itemCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    qty: v.number(),
    location: v.optional(v.string()),
    remarks: v.optional(v.string()),
    dateRecorded: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const recordedBy = user?.name ?? identity.name ?? identity.email ?? "Unknown";

    return await ctx.db.insert("stockHistory", {
      ...args,
      recordedBy,
    });
  },
});

export const listStockHistory = query({
  args: { itemCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.itemCode) {
      return await ctx.db
        .query("stockHistory")
        .withIndex("by_itemCode", (q) => q.eq("itemCode", args.itemCode!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("stockHistory").order("desc").collect();
  },
});

export const addDamageStock = mutation({
  args: {
    itemCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    qty: v.number(),
    from: v.optional(v.string()),
    dateCreated: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    const recordedBy = user?.name ?? identity.name ?? identity.email ?? "Unknown";

    // Find and update the stock's dmgQty
    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_itemCode", (q) => q.eq("itemCode", args.itemCode))
      .first();

    if (stock) {
      const newDmgQty = (stock.dmgQty ?? 0) + args.qty;
      const newCloseBal = stock.openBal + stock.receiptQty - stock.transferQty - newDmgQty;
      await ctx.db.patch(stock._id, { dmgQty: newDmgQty, closeBal: newCloseBal });
    }

    return await ctx.db.insert("damageStock", { ...args, recordedBy });
  },
});

export const listDamageStock = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("damageStock").order("desc").collect();
  },
});
