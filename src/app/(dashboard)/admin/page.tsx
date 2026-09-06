import Link from 'next/link';
import { db } from '@/db';
import { teams, users, incidentCategories, incidents } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getCurrentUserProfile } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Server,
  UserCog,
  Users,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
  Briefcase,
  FolderTree,
} from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard — Exception Tracker',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const profile = await getCurrentUserProfile();

  // Fetch live system data
  const [allTeams, allUsers, allCategories, allIncidents] = await Promise.all([
    db.select().from(teams).where(sql`${teams.deletedAt} IS NULL`).orderBy(desc(teams.createdAt)),
    db.select().from(users).where(sql`${users.deletedAt} IS NULL`),
    db.select().from(incidentCategories).where(sql`${incidentCategories.deletedAt} IS NULL`).orderBy(incidentCategories.sortOrder),
    db.select().from(incidents).where(sql`${incidents.deletedAt} IS NULL`),
  ]);

  const managers = allUsers.filter((u) => u.role === 'manager');
  const agents = allUsers.filter((u) => u.role === 'agent');

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider">
              صلاحية مسؤول عام • Root Admin
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">الرقم الوظيفي: {profile?.hrId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            لوحة الإدارة العامة (System Administration)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إشراف عام على المنظومة، إدارة الفرق والمديرين، والوصول الفوري لكافة لوحات العمليات.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-10 gap-2 font-medium">
            <a href="/api/export/excel?type=all" download>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              تصدير إكسيل (Excel)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 gap-2 font-medium">
            <a href="/api/export/pdf?type=all" download>
              <FileText className="h-4 w-4 text-destructive" />
              تصدير تقرير (PDF)
            </a>
          </Button>
        </div>
      </div>

      {/* QUICK OPERATIONS ACCESS (Interactive Hero Cards) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          لوحات العمليات التفاعلية • Quick Operations Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Manager Operations Card */}
          <Card className="border-accent/40 bg-accent/5 hover:border-accent/70 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  <Briefcase className="h-5 w-5" />
                </div>
                <Badge className="bg-accent text-accent-foreground font-medium">صلاحيات المدير الكاملة</Badge>
              </div>
              <CardTitle className="text-lg font-heading mt-3">لوحة تحكم المدير (Manager Dashboard)</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                مراجعة واعتماد طلبات الاستثناءات المعلقة، الموافقة على تعويضات الدقائق، الاطلاع على الرسوم البيانية، وإنشاء روابط دعوة الفريق.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full h-11 font-medium bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-sm">
                <Link href="/manager">
                  فتح لوحة تحكم المدير (Open Manager View)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Agent Workspace Card */}
          <Card className="border-border/80 bg-card hover:border-primary/50 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="font-medium">واجهة تقديم الموظف</Badge>
              </div>
              <CardTitle className="text-lg font-heading mt-3">لوحة تقديم الموظف (Agent Dashboard)</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                تسجيل حوادث واستثناءات العمل (تأخير، عطل تقني، انقطاع إنترنت)، تقديم طلبات تعويض الدقائق، ومتابعة الرصيد اللحظي.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full h-11 font-medium gap-2 text-sm">
                <Link href="/agent">
                  فتح لوحة تقديم الموظف (Open Agent View)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SYSTEM KPI METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">الفرق النشطة (Teams)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold font-heading">{allTeams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">فرق تشغيل مسجلة</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">المديرون المشرفون (Managers)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-accent">{managers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">مشرفو الفرق</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">الموظفون (Agents)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold font-heading">{agents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">موظفو العمليات</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">إجمالي الاستثناءات (Incidents)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-destructive">{allIncidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">استثناء مسجل بالمنظومة</p>
          </CardContent>
        </Card>
      </div>

      {/* TEAMS DIRECTORY & STANDARD CATEGORIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams Directory (2 cols) */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">دليل فرق العمل والمديرين المشرفين</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  نظرة على كافة الفرق النشطة ومسؤولي الإشراف
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {allTeams.length} فرق
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {allTeams.slice(0, 6).map((team) => {
                const teamMgr = managers.find((m) => m.teamId === team.id);
                const teamAgentsCount = agents.filter((a) => a.teamId === team.id).length;
                return (
                  <div key={team.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm text-foreground">{team.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        المدير المشرف: <span className="font-medium text-foreground/90">{teamMgr?.fullName || 'غير محدد'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs font-mono">
                        {teamAgentsCount} موظف
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Standard Categories (1 col) */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">فئات الاستثناءات المعتمدة</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  الفئات الرسمية المعتمدة لاحتساب الدقائق
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {allCategories.length} فئات
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {allCategories.map((cat, idx) => (
                <div key={cat.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground text-[11px] w-4">{idx + 1}.</span>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    نشط (Active)
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}