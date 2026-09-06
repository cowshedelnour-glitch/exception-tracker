'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Check, ShieldAlert, Clock, Ban, Loader2, Users } from 'lucide-react';
import { generateTeamInviteAction, revokeTeamInviteAction } from '@/actions/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface InviteItem {
  id: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
}

interface TeamInvitesCardProps {
  invites: InviteItem[];
}

export function TeamInvitesCard({ invites }: TeamInvitesCardProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateTeamInviteAction();
      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to generate invite link');
        return;
      }

      // Auto copy to clipboard
      await navigator.clipboard.writeText(res.data.inviteUrl);
      setCopiedToken(res.data.token);
      toast.success('تم إنشاء رابط الدعوة (24 ساعة) ونسخه للحافظة!', {
        description: res.data.inviteUrl,
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'خطأ أثناء إنشاء الرابط');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/register/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('تم نسخ رابط الدعوة إلى الحافظة');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await revokeTeamInviteAction(id);
      if (!res.success) {
        toast.error(res.error || 'فشل إبطال الرابط');
        return;
      }
      toast.info('تم إبطال رابط الدعوة بنجاح');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'خطأ أثناء إبطال الرابط');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg font-bold font-heading">روابط دعوة أعضاء الفريق (Team Invites)</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            إنشاء وإدارة روابط تسجيل صالحة لمدة 24 ساعة لضم موظفي الفريق الجدد
          </CardDescription>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="h-10 text-xs font-medium flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              إنشاء رابط دعوة (24 ساعة)
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-xs">رمز الرابط (Token)</TableHead>
                <TableHead className="font-semibold text-xs">تاريخ الإنشاء</TableHead>
                <TableHead className="font-semibold text-xs">ينتهي خلال</TableHead>
                <TableHead className="font-semibold text-xs text-center">عدد التسجيلات</TableHead>
                <TableHead className="font-semibold text-xs text-center">الحالة</TableHead>
                <TableHead className="font-semibold text-xs text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                    لم يتم إنشاء أي روابط دعوة بعد. اضغط على الزر أعلاه لإنشاء أول رابط لفريقك.
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((inv) => {
                  const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
                  const remainingHours = Math.max(
                    0,
                    Math.round((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
                  );

                  let statusBadge = (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      نشط
                    </Badge>
                  );
                  if (!inv.isActive) {
                    statusBadge = <Badge variant="secondary">ملغى</Badge>;
                  } else if (isExpired) {
                    statusBadge = <Badge variant="outline" className="text-muted-foreground">منتهي</Badge>;
                  }

                  const isCopying = copiedToken === inv.token;

                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs text-foreground font-medium">
                        {inv.token.substring(0, 8)}...{inv.token.substring(inv.token.length - 4)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString()} {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isExpired ? 'منتهي الصلاحية' : `${remainingHours} ساعة`}
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono font-semibold">
                        {inv.usageCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {statusBadge}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.isActive && !isExpired && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs flex items-center gap-1 hover:bg-muted"
                                onClick={() => handleCopy(inv.token)}
                                title="نسخ رابط التسجيل"
                              >
                                {isCopying ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-emerald-500">تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>نسخ</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleRevoke(inv.id)}
                                disabled={revokingId === inv.id}
                                title="إبطال الرابط"
                              >
                                {revokingId === inv.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>إلغاء</span>
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}