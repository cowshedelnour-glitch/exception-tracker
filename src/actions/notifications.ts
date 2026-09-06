'use server';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserProfile } from '@/actions/auth';
import type { notificationTypeEnum } from '@/db/schema/enums';

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceNumber?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await db.insert(notifications).values({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      referenceNumber: input.referenceNumber || null,
      entityId: input.entityId || null,
      isRead: false,
    });
  } catch (err) {
    console.error('Failed to create notification record:', err);
  }
}

export async function getUserNotificationsAction() {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized', data: [] };

  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, profile.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    return { success: true, data: list };
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return { success: false, error: 'Failed to load notifications', data: [] };
  }
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const profile = await getCurrentUserProfile();
  if (!profile) return 0;

  try {
    const res = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, profile.id), eq(notifications.isRead, false)));

    return res[0]?.count || 0;
  } catch (err) {
    console.error('Error counting unread notifications:', err);
    return 0;
  }
}

export async function markNotificationReadAction(notificationId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, profile.id)));

    return { success: true };
  } catch (err) {
    console.error('Error marking notification read:', err);
    return { success: false, error: 'Failed to update notification' };
  }
}

export async function markAllNotificationsReadAction() {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.recipientId, profile.id), eq(notifications.isRead, false)));

    return { success: true };
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    return { success: false, error: 'Failed to update notifications' };
  }
}