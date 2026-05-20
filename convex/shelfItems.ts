import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("shelfItems").order("desc").collect();

    if (args.search) {
      const q = args.search.toLowerCase();
      return items.filter(
        (i) =>
          i.prodCode.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.location ?? "").toLowerCase().includes(q) ||
          (i.supplier ?? "").toLowerCase().includes(q) ||
          (i.brand ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  },
});

export const get = query({
  args: { id: v.id("shelfItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    prodCode: v.string(),
    description: v.string(),
    unit: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    location: v.optional(v.string()),
    qty: v.number(),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    recorded: v.optional(v.string()),
    dateRecorded: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shelfItems", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("shelfItems"),
    prodCode: v.optional(v.string()),
    description: v.optional(v.string()),
    unit: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    location: v.optional(v.string()),
    qty: v.optional(v.number()),
    supplier: v.optional(v.string()),
    brand: v.optional(v.string()),
    recorded: v.optional(v.string()),
    dateRecorded: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const listByProdCode = query({
  args: { prodCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shelfItems")
      .withIndex("by_prodCode", (q) => q.eq("prodCode", args.prodCode))
      .collect();
  },
});

export const deductQty = mutation({
  args: {
    id: v.id("shelfItems"),
    deductAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new ConvexError({ message: "Shelf item not found", code: "NOT_FOUND" });
    const newQty = item.qty - args.deductAmount;
    await ctx.db.patch(args.id, { qty: newQty });
    return newQty;
  },
});

export const remove = mutation({
  args: { id: v.id("shelfItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
