'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getUserNotificationsAction,
  getUnreadNotificationCountAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceNumber: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [count, res] = await Promise.all([
        getUnreadNotificationCountAction(),
        getUserNotificationsAction(),
      ]);
      setUnreadCount(count);
      if (res.success && res.data) {
        setNotificationsList(res.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Supabase Realtime Subscription (BRD §35 & Confirmed Rule)
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`realtime:notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          toast.info(newNotif.title, {
            description: newNotif.body,
          });
          setUnreadCount((prev) => prev + 1);
          setNotificationsList((prev) => [newNotif, ...prev.slice(0, 29)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationReadAction(id);
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-lg hover:bg-muted/80 transition-colors"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-5 w-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-4 min-w-[1rem] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl border-border/70">
        <div className="flex items-center justify-between p-3.5 border-b border-border/50 bg-card/60">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-accent hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {notificationsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            notificationsList.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 transition-colors flex items-start gap-3 text-left ${
                  item.isRead ? 'bg-background/40 hover:bg-muted/30' : 'bg-accent/5 hover:bg-accent/10'
                }`}
              >
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    item.isRead ? 'bg-transparent' : 'bg-accent'
                  }`}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-medium truncate ${item.isRead ? 'text-foreground/80' : 'text-foreground font-semibold'}`}>
                      {item.title}
                    </p>
                    {item.referenceNumber && (
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {item.referenceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {item.body}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(item.id, e)}
                        className="text-[11px] text-accent hover:underline font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}