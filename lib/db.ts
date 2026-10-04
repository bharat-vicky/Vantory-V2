import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

globalForPrisma.prisma = client;

// Unit tests cannot reach any real database even if a developer environment file exists.
export const db = client.$extends({query:{$allModels:{$allOperations({args,query}){
  if(process.env.VANTORY_UNIT_TESTS === "1")throw new Error("Real database access is disabled in unit tests. Use an explicit fixture.");
  return query(args);
}}}});
