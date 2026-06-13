const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Adjust stock quantity and automatically create a ledger entry.
 */
const adjustStock = async (productId, changeQty, reason, referenceType, referenceId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Retrieve current product state
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    const newOnHandQty = product.onHandQty + changeQty;
    
    // Prevent negative inventory
    if (newOnHandQty < 0) {
      throw new Error(`Insufficient stock for product ${productId}. Current: ${product.onHandQty}, Requested Deduction: ${Math.abs(changeQty)}`);
    }
    
    // Determine the transaction type based on quantity change
    let transactionType = 'ADJUSTMENT';
    if (changeQty > 0) transactionType = 'IN';
    if (changeQty < 0) transactionType = 'OUT';

    // 2. Update product's onHandQty
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { onHandQty: newOnHandQty }
    });

    // 3. Create Stock Ledger entry capturing all details
    const ledgerEntry = await tx.stockLedger.create({
      data: {
        productId,
        transactionType,
        quantity: changeQty,
        reason,
        referenceType,
        referenceId,
      }
    });

    return {
      product: updatedProduct,
      ledgerEntry
    };
  });
};

/**
 * Reserve a specific quantity of stock, making it unavailable for use.
 */
const reserveStock = async (productId, qty) => {
  if (qty <= 0) throw new Error('Quantity must be greater than zero');
  
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product not found`);

    const freeToUse = product.onHandQty - product.reservedQty;
    if (freeToUse < qty) {
      throw new Error(`Insufficient free stock to reserve. Requested: ${qty}, Free: ${freeToUse}`);
    }

    return await tx.product.update({
      where: { id: productId },
      data: { reservedQty: product.reservedQty + qty }
    });
  });
};

/**
 * Release previously reserved stock back to the free pool.
 */
const releaseReservation = async (productId, qty) => {
  if (qty <= 0) throw new Error('Quantity must be greater than zero');

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product not found`);

    if (product.reservedQty < qty) {
      throw new Error(`Cannot release more than reserved stock. Reserved: ${product.reservedQty}, Requested release: ${qty}`);
    }

    return await tx.product.update({
      where: { id: productId },
      data: { reservedQty: product.reservedQty - qty }
    });
  });
};

/**
 * Calculate the completely free to use quantity for a product.
 */
const getFreeToUseQty = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error(`Product not found`);
  
  return product.onHandQty - product.reservedQty;
};

module.exports = {
  adjustStock,
  reserveStock,
  releaseReservation,
  getFreeToUseQty
};
