import { prisma } from './prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'MARK_PAID' | 'LOGIN';
export type AuditEntity = 'Product' | 'Sale' | 'Setting' | 'PurchaseOrder' | 'Customer' | 'Supplier' | 'ProductSerial' | 'User' | 'Auth' | 'Backup' | 'Warranty';

export async function logAudit(opts: {
  userId: string;
  userName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number;
  description: string;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        userName: opts.userName,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ? String(opts.entityId) : null,
        description: opts.description,
        metadata: opts.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.error('❌ logAudit failed:', e);
  }
}
