import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const p = new PrismaClient();
const hash = await bcrypt.hash("nexo123", 10);
const r = await p.user.update({
  where: { email: "aysllanaas@gmail.com" },
  data: { passwordHash: hash, username: "proddyt" },
});
console.log("OK:", r.username, r.email);
await p.$disconnect();
