'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CategoryData {
  category: string;
  lostMinutes: number;
  compensatedMinutes: number;
}

interface AgentData {
  agentName: string;
  hrId: string;
  lostMinutes: number;
  compensatedMinutes: number;
  remainingMinutes: number;
}

interface ManagerAnalyticsChartsProps {
  byCategory: CategoryData[];
  byAgent: AgentData[];
}

export function ManagerAnalyticsCharts({ byCategory, byAgent }: ManagerAnalyticsChartsProps) {
  const hasCategoryData = byCategory.some((c) => c.lostMinutes > 0 || c.compensatedMinutes > 0);
  const hasAgentData = byAgent.some((a) => a.lostMinutes > 0 || a.compensatedMinutes > 0);

  const customTooltipFormatter = (value: any) => [`${value} دقيقة`, ''];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold font-heading">
              التحليلات البيانية لعمليات الفريق (Analytics)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              رسم بياني تفصيلي لدقائق الاستثناءات وأرصدة التعويض
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="category" className="w-full">
          <TabsList className="grid w-full sm:w-[380px] grid-cols-2 mb-4">
            <TabsTrigger value="category" className="text-xs font-medium">توزيع فئات الاستثناءات</TabsTrigger>
            <TabsTrigger value="agent" className="text-xs font-medium">أداء الموظفين والأرصدة</TabsTrigger>
          </TabsList>

          {/* Tab 1: Category Breakdown */}
          <TabsContent value="category" className="space-y-4">
            {!hasCategoryData ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl">
                لا توجد بيانات مسجلة لفئات الاستثناءات بعد.
              </div>
            ) : (
              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byCategory}
                    margin={{ top: 10, right: 20, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="category"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      unit="د"
                    />
                    <Tooltip
                      formatter={customTooltipFormatter}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="lostMinutes"
                      name="دقائق مفقودة معتمدة"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="compensatedMinutes"
                      name="دقائق معوضة"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Agent Breakdown */}
          <TabsContent value="agent" className="space-y-4">
            {!hasAgentData ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl">
                لا توجد استثناءات مسجلة لموظفي الفريق بعد.
              </div>
            ) : (
              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byAgent}
                    margin={{ top: 10, right: 20, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="agentName"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      unit="د"
                    />
                    <Tooltip
                      formatter={customTooltipFormatter}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="lostMinutes"
                      name="الوقت المفقود"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="compensatedMinutes"
                      name="المعوض"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="remainingMinutes"
                      name="الرصيد المتبقي"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}