const { PrismaClient } = require('@prisma/client');
const stockService = require('../services/stockService');

// Deep mock of Prisma Client methods
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    $transaction: jest.fn(async (cb) => {
      // Simulate transaction execution by immediately invoking callback
      return cb(mPrismaClient);
    }),
    product: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    stockLedger: {
      create: jest.fn()
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('Stock Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('should successfully increase stock and create a ledger entry', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 10, reservedQty: 0 });
      prisma.product.update.mockResolvedValue({ id: 'p1', onHandQty: 15, reservedQty: 0 });
      prisma.stockLedger.create.mockResolvedValue({ id: 'l1', quantity: 5 });

      const result = await stockService.adjustStock('p1', 5, 'purchase_receipt', 'PurchaseOrder', 'po-1');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { onHandQty: 15 }
      });
      expect(prisma.stockLedger.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          transactionType: 'IN',
          quantity: 5,
          reason: 'purchase_receipt',
          referenceType: 'PurchaseOrder',
          referenceId: 'po-1'
        }
      });
      expect(result.product.onHandQty).toBe(15);
    });

    it('should decrease stock and create OUT ledger entry on negative change', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p2', onHandQty: 20, reservedQty: 0 });
      prisma.product.update.mockResolvedValue({ id: 'p2', onHandQty: 10, reservedQty: 0 });
      prisma.stockLedger.create.mockResolvedValue({ id: 'l2', quantity: -10 });

      await stockService.adjustStock('p2', -10, 'sales_delivery', 'SalesOrder', 'so-1');

      expect(prisma.stockLedger.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'OUT', quantity: -10 })
      }));
    });

    it('should throw an error if adjustment results in negative inventory', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p3', onHandQty: 5, reservedQty: 0 });

      await expect(stockService.adjustStock('p3', -10, 'sales_delivery', 'SalesOrder', 'so-2'))
        .rejects
        .toThrow('Insufficient stock for product p3. Current: 5, Requested Deduction: 10');
    });

    it('should throw an error if product is not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(stockService.adjustStock('p1', 5, 'purchase_receipt', 'PO', 'po-1'))
        .rejects
        .toThrow('Product with id p1 not found');
    });
  });

  describe('reserveStock', () => {
    it('should successfully reserve stock if enough free stock is available', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 5 });
      prisma.product.update.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 15 });

      await stockService.reserveStock('p1', 10);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { reservedQty: 15 }
      });
    });

    it('should throw an error if trying to reserve more than free stock', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 15 });

      await expect(stockService.reserveStock('p1', 10))
        .rejects
        .toThrow('Insufficient free stock to reserve. Requested: 10, Free: 5');
    });
  });

  describe('releaseReservation', () => {
    it('should successfully release reserved stock', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 10 });
      prisma.product.update.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 5 });

      await stockService.releaseReservation('p1', 5);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { reservedQty: 5 }
      });
    });

    it('should throw an error if trying to release more than what is reserved', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 20, reservedQty: 5 });

      await expect(stockService.releaseReservation('p1', 10))
        .rejects
        .toThrow('Cannot release more than reserved stock. Reserved: 5, Requested release: 10');
    });
  });

  describe('getFreeToUseQty', () => {
    it('should calculate free to use quantity correctly', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', onHandQty: 50, reservedQty: 15 });

      const qty = await stockService.getFreeToUseQty('p1');
      expect(qty).toBe(35);
    });
  });
});
