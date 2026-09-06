import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/actions/auth';
import { getExportDataset } from '@/lib/export/data';
import { generateExcelWorkbook } from '@/lib/export/excel';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      search: searchParams.get('search') || undefined,
      reportType: searchParams.get('type') || 'all',
    };

    const dataset = await getExportDataset(filters, profile);
    const excelBuffer = await generateExcelWorkbook(dataset);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Exception_Tracker_${filters.reportType}_${timestamp}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Error generating Excel export:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}