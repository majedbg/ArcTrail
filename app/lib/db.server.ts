/**
 * Prisma client singleton for server-side use.
 *
 * In development, we store the client on `globalThis` to survive HMR reloads
 * without exhausting database connections. In production, a fresh client is
 * created once at module load.
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient();
  client.$connect();
  return client;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
