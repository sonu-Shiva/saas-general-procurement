import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from './auditLogger';

/**
 * Middleware to automatically log activities
 */
export function createAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    // Extract user info from request
    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Skip certain routes and methods
    const skipRoutes = ['/api/auth/user', '/api/dashboard/stats'];
    const skipMethods = ['GET'];
    
    if (skipRoutes.includes(req.path) || skipMethods.includes(req.method)) {
      return next();
    }

    // Override res.send to capture response
    res.send = function(body: any) {
      const responseTime = Date.now() - startTime;
      
      // Log the activity after response
      setImmediate(async () => {
        try {
          if (userId && res.statusCode < 400) {
            await logActivity(req, res, userId, responseTime, ipAddress, userAgent);
          }
        } catch (error) {
          console.error('Error logging audit activity:', error);
        }
      });
      
      return originalSend.call(this, body);
    };

    next();
  };
}

async function logActivity(
  req: Request, 
  res: Response, 
  userId: string, 
  responseTime: number,
  ipAddress?: string,
  userAgent?: string
) {
  const method = req.method;
  const path = req.path;
  const entityId = req.params.id || extractIdFromPath(path);
  
  let action = 'unknown';
  let entityType = 'unknown';
  let description = '';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Determine action and entity type based on the route
  if (path.includes('/api/vendors')) {
    entityType = 'vendor';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new vendor';
      severity = 'medium';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated vendor information';
      severity = 'medium';
    } else if (method === 'DELETE') {
      action = 'delete';
      description = 'Deleted vendor';
      severity = 'high';
    }
  } else if (path.includes('/api/boms')) {
    entityType = 'bom';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new BOM';
      severity = 'medium';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated BOM';
      severity = 'medium';
    } else if (method === 'DELETE') {
      action = 'delete';
      description = 'Deleted BOM';
      severity = 'high';
    }
  } else if (path.includes('/api/rfx')) {
    entityType = 'rfx';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new RFx event';
      severity = 'high';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated RFx event';
      severity = 'high';
    }
  } else if (path.includes('/api/auctions')) {
    entityType = 'auction';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new auction';
      severity = 'high';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated auction';
      severity = 'medium';
    }
  } else if (path.includes('/api/purchase-orders')) {
    entityType = 'purchase_order';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new purchase order';
      severity = 'high';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated purchase order';
      severity = 'high';
    }
  } else if (path.includes('/api/approval-requests')) {
    entityType = 'approval';
    if (path.includes('/approve')) {
      action = 'approve';
      description = 'Approved request';
      severity = 'high';
    } else if (path.includes('/reject')) {
      action = 'reject';
      description = 'Rejected request';
      severity = 'high';
    }
  } else if (path.includes('/api/users')) {
    entityType = 'user_management';
    if (method === 'POST') {
      action = 'create';
      description = 'Created new user';
      severity = 'high';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'update';
      description = 'Updated user information';
      severity = 'high';
    } else if (method === 'DELETE') {
      action = 'delete';
      description = 'Deleted user';
      severity = 'critical';
    }
  }

  // Skip logging if we couldn't determine a meaningful action
  if (action === 'unknown' || entityType === 'unknown') {
    return;
  }

  // Create the audit log entry
  await AuditLogger.logCrud(
    userId,
    entityType,
    entityId || `${entityType}_${Date.now()}`,
    action as any,
    description,
    null, // previousData - would require more complex implementation
    null, // newData - would require more complex implementation
    {
      method,
      path,
      statusCode: res.statusCode,
      responseTime,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    }
  );
}

function extractIdFromPath(path: string): string | undefined {
  // Extract ID from paths like /api/vendors/123 or /api/boms/456
  const match = path.match(/\/api\/[^\/]+\/([^\/\?]+)/);
  return match ? match[1] : undefined;
}