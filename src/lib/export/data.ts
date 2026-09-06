import { db } from '@/db';
import { incidents, users, incidentCategories, compensationRecords } from '@/db/schema';
import { eq, and, gte, lte, ilike, or, desc, inArray, isNull } from 'drizzle-orm';
import type { User } from '@/db/schema';

export interface ExportFilters {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  agentId?: string;
  search?: string;
  reportType?: string; // 'all' | 'daily' | 'weekly' | 'lost_minutes' | 'compensation'
}

export interface ExportFlattenedRow {
  referenceNumber: string;
  agentName: string;
  agentHrId: string;
  incidentDate: string;
  category: string;
  lostMinutes: number;
  compensatedMinutes: number;
  remainingMinutes: number;
  compensationDate: string;
  status: string;
}

export interface ExportMetadata {
  appName: string;
  reportTitle: string;
  generatedBy: string;
  generatedAt: string;
  filtersSummary: string;
  totalIncidents: number;
  totalRows: number;
  totalLostMinutes: number;
  totalCompensatedMinutes: number;
  totalRemainingMinutes: number;
}

export interface ExportDataset {
  rows: ExportFlattenedRow[];
  metadata: ExportMetadata;
}

const STATUS_DISPLAY_MAP: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  partially_compensated: 'Partially Compensated',
  fully_compensated: 'Fully Compensated',
};

const REPORT_TITLES: Record<string, string> = {
  all: 'General Operational Exceptions & Compensations Log',
  daily: 'Daily Exception Report',
  weekly: 'Weekly Operational Summary Report',
  lost_minutes: 'Lost Minutes Exception Report',
  compensation: 'Compensation & Recovery Balance Report',
  agent: 'Individual Agent Exception Log',
};

export async function getExportDataset(
  filters: ExportFilters,
  profile: User
): Promise<ExportDataset> {
  const whereClauses = [isNull(incidents.deletedAt)];

  // 1. Role-Based Scoping Security Constraint
  if (profile.role === 'agent') {
    whereClauses.push(eq(incidents.agentId, profile.id));
  } else if (profile.role === 'manager') {
    if (!profile.teamId) {
      throw new Error('Manager profile has no team assigned');
    }
    const teamAgents = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.teamId, profile.teamId), eq(users.role, 'agent'), isNull(users.deletedAt)));
    const agentIds = teamAgents.map((a) => a.id);

    if (agentIds.length === 0) {
      return {
        rows: [],
        metadata: {
          appName: 'Exception Tracker',
          reportTitle: REPORT_TITLES[filters.reportType || 'all'] || 'Operational Exceptions Report',
          generatedBy: `${profile.fullName} (${profile.role} - ${profile.hrId})`,
          generatedAt: new Date().toISOString(),
          filtersSummary: 'No supervised agents in team',
          totalIncidents: 0,
          totalRows: 0,
          totalLostMinutes: 0,
          totalCompensatedMinutes: 0,
          totalRemainingMinutes: 0,
        },
      };
    }

    if (filters.agentId) {
      if (!agentIds.includes(filters.agentId)) {
        throw new Error('Access denied: Requested agent is not on your team');
      }
      whereClauses.push(eq(incidents.agentId, filters.agentId));
    } else {
      whereClauses.push(inArray(incidents.agentId, agentIds));
    }
  } else if (profile.role === 'admin') {
    if (filters.agentId) {
      whereClauses.push(eq(incidents.agentId, filters.agentId));
    }
  }

  // 2. Report Type presets
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (filters.reportType === 'daily') {
    const targetDate = filters.startDate || todayStr;
    whereClauses.push(eq(incidents.incidentDate, targetDate));
  } else if (filters.reportType === 'weekly') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    whereClauses.push(gte(incidents.incidentDate, filters.startDate || sevenDaysAgo));
    if (filters.endDate) {
      whereClauses.push(lte(incidents.incidentDate, filters.endDate));
    }
  } else {
    if (filters.startDate) {
      whereClauses.push(gte(incidents.incidentDate, filters.startDate));
    }
    if (filters.endDate) {
      whereClauses.push(lte(incidents.incidentDate, filters.endDate));
    }
  }

  // 3. Status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'pending') {
      whereClauses.push(inArray(incidents.status, ['submitted', 'under_review']));
    } else if (filters.status === 'compensated') {
      whereClauses.push(inArray(incidents.status, ['partially_compensated', 'fully_compensated']));
    } else {
      whereClauses.push(eq(incidents.status, filters.status as any));
    }
  }

  // 4. Category filter
  if (filters.category && filters.category !== 'all') {
    whereClauses.push(eq(incidents.categoryId, filters.category));
  }

  // 5. Search query
  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    whereClauses.push(
      or(
        ilike(incidents.referenceNumber, s),
        ilike(users.fullName, s),
        ilike(users.hrId, s),
        ilike(incidentCategories.name, s)
      )!
    );
  }

  // Query matching incidents
  const incidentList = await db
    .select({
      id: incidents.id,
      referenceNumber: incidents.referenceNumber,
      agentId: incidents.agentId,
      agentName: users.fullName,
      agentHrId: users.hrId,
      incidentDate: incidents.incidentDate,
      lostMinutes: incidents.lostMinutes,
      status: incidents.status,
      categoryName: incidentCategories.name,
      notes: incidents.notes,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .innerJoin(users, eq(incidents.agentId, users.id))
    .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
    .where(and(...whereClauses))
    .orderBy(desc(incidents.incidentDate), desc(incidents.createdAt));

  const incidentIds = incidentList.map((i) => i.id);

  // Fetch all related compensation records
  const compensationsByIncident: Record<string, (typeof compensationRecords.$inferSelect)[]> = {};
  if (incidentIds.length > 0) {
    const allCompensations = await db
      .select()
      .from(compensationRecords)
      .where(and(inArray(compensationRecords.incidentId, incidentIds), isNull(compensationRecords.deletedAt)))
      .orderBy(compensationRecords.compensationDate);

    for (const comp of allCompensations) {
      if (!compensationsByIncident[comp.incidentId]) {
        compensationsByIncident[comp.incidentId] = [];
      }
      compensationsByIncident[comp.incidentId].push(comp);
    }
  }

  // Flatten rows according to BRD §33 and rule:
  // one row per compensation transaction; incidents with no compensation -> 1 row with blank Compensation Date, 0 Compensated Minutes
  const flattenedRows: ExportFlattenedRow[] = [];
  let totalLostMinutes = 0;
  let totalCompensatedMinutes = 0;
  let totalRemainingMinutes = 0;

  for (const inc of incidentList) {
    totalLostMinutes += inc.lostMinutes;

    const comps = compensationsByIncident[inc.id] || [];
    const approvedComps = comps.filter((c) => c.status === 'approved');
    const incidentApprovedCompMinutes = approvedComps.reduce((sum, c) => sum + c.compensationMinutes, 0);
    const incidentRemaining = Math.max(0, inc.lostMinutes - incidentApprovedCompMinutes);

    totalCompensatedMinutes += incidentApprovedCompMinutes;
    totalRemainingMinutes += incidentRemaining;

    if (comps.length === 0) {
      flattenedRows.push({
        referenceNumber: inc.referenceNumber,
        agentName: inc.agentName,
        agentHrId: inc.agentHrId,
        incidentDate: inc.incidentDate,
        category: inc.categoryName,
        lostMinutes: inc.lostMinutes,
        compensatedMinutes: 0,
        remainingMinutes: incidentRemaining,
        compensationDate: '',
        status: STATUS_DISPLAY_MAP[inc.status] || inc.status,
      });
    } else {
      for (const comp of comps) {
        flattenedRows.push({
          referenceNumber: inc.referenceNumber,
          agentName: inc.agentName,
          agentHrId: inc.agentHrId,
          incidentDate: inc.incidentDate,
          category: inc.categoryName,
          lostMinutes: inc.lostMinutes,
          compensatedMinutes: comp.compensationMinutes,
          remainingMinutes: incidentRemaining,
          compensationDate: comp.compensationDate,
          status: STATUS_DISPLAY_MAP[inc.status] || inc.status,
        });
      }
    }
  }

  const filterParts: string[] = [];
  if (filters.reportType && filters.reportType !== 'all') {
    filterParts.push(`Report: ${filters.reportType}`);
  }
  if (filters.status && filters.status !== 'all') {
    filterParts.push(`Status: ${filters.status}`);
  }
  if (filters.category && filters.category !== 'all') {
    filterParts.push(`Category: ${filters.category}`);
  }
  if (filters.startDate || filters.endDate) {
    filterParts.push(`Dates: ${filters.startDate || 'Start'} to ${filters.endDate || 'Now'}`);
  }
  if (filters.search) {
    filterParts.push(`Search: "${filters.search}"`);
  }
  const filtersSummary = filterParts.length > 0 ? filterParts.join(' | ') : 'All records (No filters)';

  const reportTitle = REPORT_TITLES[filters.reportType || 'all'] || 'Operational Exceptions & Compensations Log';

  return {
    rows: flattenedRows,
    metadata: {
      appName: 'Exception Tracker',
      reportTitle,
      generatedBy: `${profile.fullName} (${profile.role.toUpperCase()} - ${profile.hrId})`,
      generatedAt: new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'medium' }) + ' UTC',
      filtersSummary,
      totalIncidents: incidentList.length,
      totalRows: flattenedRows.length,
      totalLostMinutes,
      totalCompensatedMinutes,
      totalRemainingMinutes,
    },
  };
}