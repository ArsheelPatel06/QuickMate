const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auditLogger = (req, res, next) => {
  res.on('finish', async () => {
    // Only log mutations that were successful
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      
      let entity = 'UNKNOWN';
      if (req.originalUrl.includes('/products')) entity = 'Product';
      else if (req.originalUrl.includes('/sales-orders')) entity = 'SalesOrder';
      else if (req.originalUrl.includes('/purchase-orders')) entity = 'PurchaseOrder';
      else if (req.originalUrl.includes('/manufacturing-orders')) entity = 'ManufacturingOrder';
      else if (req.originalUrl.includes('/boms')) entity = 'BOM';
      else if (req.originalUrl.includes('/auth')) entity = 'Auth';

      let action = 'OTHER';
      if (req.method === 'POST') action = 'CREATE';
      if (req.method === 'PUT') action = 'UPDATE';
      if (req.method === 'DELETE') action = 'DELETE';

      if (req.originalUrl.includes('/login')) action = 'LOGIN';
      if (
        req.originalUrl.includes('/confirm') || 
        req.originalUrl.includes('/receive') || 
        req.originalUrl.includes('/deliver') || 
        req.originalUrl.includes('/complete')
      ) {
        action = 'UPDATE';
      }

      // Try to extract a UUID from the URL to use as the entityId
      const idMatch = req.originalUrl.match(/\/([a-f0-9\-]{36})/i);
      const entityId = idMatch ? idMatch[1] : null;

      // Clean sensitive info from body before logging
      const details = { ...req.body };
      if (details.password) delete details.password;

      // Determine userId (set by the protect middleware earlier in the request lifecycle)
      const userId = req.user ? req.user.id : null;
      if (!userId) return; // Skip if no user context available

      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action,
            entity,
            entityId,
            details,
            ipAddress: req.ip || req.connection.remoteAddress
          }
        });
      } catch (err) {
        console.error('Failed to write audit log:', err.message);
      }
    }
  });

  next();
};

module.exports = auditLogger;
