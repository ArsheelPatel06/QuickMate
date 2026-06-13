const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const vendors = await prisma.vendor.count();
  const boms = await prisma.bOM.count();
  const salesOrders = await prisma.salesOrder.count();
  const purchaseOrders = await prisma.purchaseOrder.count();
  const manufacturingOrders = await prisma.manufacturingOrder.count();
  const auditLogs = await prisma.auditLog.count();

  console.log(JSON.stringify({
    users,
    products,
    vendors,
    boms,
    salesOrders,
    purchaseOrders,
    manufacturingOrders,
    auditLogs
  }, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
