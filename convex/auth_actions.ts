"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { hash, compare } from "bcryptjs";

export const hashPassword = action({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    return await hash(args.password, 10);
  },
});

export const verifyPassword = action({
  args: { password: v.string(), hashed: v.string() },
  handler: async (ctx, args) => {
    return await compare(args.password, args.hashed);
  },
});