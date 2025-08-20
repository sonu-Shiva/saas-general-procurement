import { storage } from './storage';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'view' | 'export' | 'import';
type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
  userId: string;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  description: string;
  previousData?: any;
  newData?: any;
  metadata?: any;
  severity?: AuditSeverity;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  /**
   * Log a CRUD operation
   */
  static async logCrud(
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    description: string,
    previousData?: any,
    newData?: any,
    metadata?: any,
    severity: AuditSeverity = 'low'
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType,
        entityId,
        action,
        description,
        previousData,
        newData,
        metadata,
        severity,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break business operations
    }
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    userId: string,
    action: 'login' | 'logout',
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType: 'authentication',
        action,
        description: `User ${action}`,
        metadata: {
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        severity: 'medium',
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create auth audit log:', error);
    }
  }

  /**
   * Log security events
   */
  static async logSecurity(
    userId: string,
    action: string,
    description: string,
    severity: AuditSeverity = 'high',
    metadata?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType: 'security',
        action: action as AuditAction,
        description,
        metadata,
        severity,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create security audit log:', error);
    }
  }

  /**
   * Log admin actions
   */
  static async logAdmin(
    userId: string,
    action: AuditAction,
    description: string,
    entityType: string,
    entityId?: string,
    previousData?: any,
    newData?: any,
    metadata?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType,
        entityId,
        action,
        description,
        previousData,
        newData,
        metadata,
        severity: 'high',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create admin audit log:', error);
    }
  }

  /**
   * Log approval actions
   */
  static async logApproval(
    userId: string,
    action: 'approve' | 'reject',
    entityType: string,
    entityId: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType,
        entityId,
        action,
        description,
        metadata,
        severity: 'high',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create approval audit log:', error);
    }
  }

  /**
   * Log data export/import events
   */
  static async logDataTransfer(
    userId: string,
    action: 'export' | 'import',
    entityType: string,
    description: string,
    recordCount?: number,
    metadata?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        entityType,
        action,
        description,
        metadata: {
          recordCount,
          ...metadata,
        },
        severity: 'medium',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create data transfer audit log:', error);
    }
  }
}