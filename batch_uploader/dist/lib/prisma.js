"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClient = getPrismaClient;
const prisma_1 = require("../../generated/prisma");
let prismaClient;
function getPrismaClient() {
    if (!prismaClient) {
        prismaClient = new prisma_1.PrismaClient();
    }
    return prismaClient;
}
