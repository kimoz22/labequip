import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("locations").collect();
  },
});

export const create = mutation({
  args: {
    locationName: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("locations", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("locations"),
    locationName: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
