import { PrismaClient } from "../../generated/prisma";
let prismaClient:PrismaClient

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}