import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['agent', 'manager', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const incidentStatusEnum = pgEnum('incident_status', [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'partially_compensated',
  'fully_compensated',
]);
export const compensationStatusEnum = pgEnum('compensation_status', [
  'pending_review',
  'approved',
  'rejected',
]);
export const auditActionEnum = pgEnum('audit_action', [
  'incident_submitted',
  'incident_approved',
  'incident_rejected',
  'incident_status_changed',
  'compensation_submitted',
  'compensation_approved',
  'compensation_rejected',
  'user_registered',
  'user_status_changed',
  'category_created',
  'category_updated',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'incident_submitted',
  'incident_approved',
  'incident_rejected',
  'compensation_submitted',
  'compensation_approved',
  'compensation_rejected',
]);
