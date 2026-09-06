import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ExportDataset } from './data';

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  reportSubtitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginTop: 2,
  },
  metaRight: {
    textAlign: 'right',
    fontSize: 7.5,
    color: '#64748b',
    lineHeight: 1.3,
  },
  metaFilters: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 4,
  },
  // KPI Summary Bar
  kpiContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 6,
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 6,
    color: '#94a3b8',
    marginTop: 1,
  },
  // Table Styling
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    minHeight: 18,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thText: {
    color: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  tdText: {
    fontSize: 7,
    color: '#1e293b',
  },
  // Column percentage widths (Total = 100%)
  colRef: { width: '15%' },
  colAgent: { width: '14%' },
  colHrId: { width: '8%', textAlign: 'center' },
  colDate: { width: '9%', textAlign: 'center' },
  colCat: { width: '14%' },
  colLost: { width: '7%', textAlign: 'right' },
  colComp: { width: '7%', textAlign: 'right' },
  colRem: { width: '7%', textAlign: 'right' },
  colCompDate: { width: '9%', textAlign: 'center' },
  colStatus: { width: '10%', textAlign: 'center' },

  bold: { fontFamily: 'Helvetica-Bold' },
  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 7,
    color: '#94a3b8',
  },
});

interface PdfDocumentProps {
  dataset: ExportDataset;
}

export function ExportPdfDocument({ dataset }: PdfDocumentProps) {
  const { rows, metadata } = dataset;

  return (
    <Document title={`${metadata.appName} - ${metadata.reportTitle}`} author="Exception Tracker">
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.appTitle}>{metadata.appName.toUpperCase()}</Text>
              <Text style={styles.reportSubtitle}>{metadata.reportTitle}</Text>
            </View>
            <View style={styles.metaRight}>
              <Text>Generated: {metadata.generatedAt}</Text>
              <Text>Auditor / Operator: {metadata.generatedBy}</Text>
            </View>
          </View>
          <Text style={styles.metaFilters}>Applied Scope & Filters: {metadata.filtersSummary}</Text>
        </View>

        {/* KPI Executive Summary */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Unique Incidents</Text>
            <Text style={styles.kpiValue}>{metadata.totalIncidents}</Text>
            <Text style={styles.kpiSub}>{metadata.totalRows} flattened rows</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Approved Lost Time</Text>
            <Text style={styles.kpiValue}>{metadata.totalLostMinutes} min</Text>
            <Text style={styles.kpiSub}>
              {Math.floor(metadata.totalLostMinutes / 60)}h {metadata.totalLostMinutes % 60}m
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Approved Compensated</Text>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>{metadata.totalCompensatedMinutes} min</Text>
            <Text style={styles.kpiSub}>Recovered work minutes</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Net Remaining Balance</Text>
            <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{metadata.totalRemainingMinutes} min</Text>
            <Text style={styles.kpiSub}>Zero-Error formula balance</Text>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.table}>
          {/* 10 Fixed Columns Header (BRD §33) */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colRef]}>Ref Number</Text>
            <Text style={[styles.thText, styles.colAgent]}>Agent</Text>
            <Text style={[styles.thText, styles.colHrId]}>HR ID</Text>
            <Text style={[styles.thText, styles.colDate]}>Inc. Date</Text>
            <Text style={[styles.thText, styles.colCat]}>Category</Text>
            <Text style={[styles.thText, styles.colLost]}>Lost (m)</Text>
            <Text style={[styles.thText, styles.colComp]}>Comp (m)</Text>
            <Text style={[styles.thText, styles.colRem]}>Rem (m)</Text>
            <Text style={[styles.thText, styles.colCompDate]}>Comp. Date</Text>
            <Text style={[styles.thText, styles.colStatus]}>Status</Text>
          </View>

          {/* Rows */}
          {rows.map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
              <Text style={[styles.tdText, styles.colRef, styles.bold]}>{row.referenceNumber}</Text>
              <Text style={[styles.tdText, styles.colAgent]}>{row.agentName}</Text>
              <Text style={[styles.tdText, styles.colHrId]}>{row.agentHrId}</Text>
              <Text style={[styles.tdText, styles.colDate]}>{row.incidentDate}</Text>
              <Text style={[styles.tdText, styles.colCat]}>{row.category}</Text>
              <Text style={[styles.tdText, styles.colLost]}>{row.lostMinutes}</Text>
              <Text style={[styles.tdText, styles.colComp, { color: row.compensatedMinutes > 0 ? '#059669' : '#64748b' }]}>
                {row.compensatedMinutes}
              </Text>
              <Text style={[styles.tdText, styles.colRem, styles.bold, { color: '#2563eb' }]}>{row.remainingMinutes}</Text>
              <Text style={[styles.tdText, styles.colCompDate]}>{row.compensationDate || '—'}</Text>
              <Text style={[styles.tdText, styles.colStatus]}>{row.status}</Text>
            </View>
          ))}

          {/* Footer Totals */}
          {rows.length > 0 && (
            <View style={styles.tableFooter}>
              <Text style={[styles.tdText, styles.bold, { width: '60%', textAlign: 'right', paddingRight: 8 }]}>
                TOTAL MINUTES:
              </Text>
              <Text style={[styles.tdText, styles.colLost, styles.bold]}>{metadata.totalLostMinutes}</Text>
              <Text style={[styles.tdText, styles.colComp, styles.bold, { color: '#059669' }]}>
                {metadata.totalCompensatedMinutes}
              </Text>
              <Text style={[styles.tdText, styles.colRem, styles.bold, { color: '#2563eb' }]}>
                {metadata.totalRemainingMinutes}
              </Text>
              <Text style={[styles.tdText, { width: '19%' }]} />
            </View>
          )}
        </View>

        {/* Page Footer */}
        <View style={styles.pageFooter} fixed>
          <Text>Exception Tracker • Enterprise Zero-Error Compensation & Auditing System</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdfDocument(dataset: ExportDataset): Promise<Buffer> {
  const doc = <ExportPdfDocument dataset={dataset} />;
  const buffer = await renderToBuffer(doc);
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
}