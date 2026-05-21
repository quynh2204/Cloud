const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  const users = await prisma.user.findMany({ select: { id: true, tenantId: true, email: true, role: true, canManageProducts: true } });
  console.log(JSON.stringify({ tenants, users }, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
