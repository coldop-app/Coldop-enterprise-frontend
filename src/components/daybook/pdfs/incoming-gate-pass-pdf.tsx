import type { ReactNode } from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

function whenStyle<T extends object>(condition: boolean, style: T): T[] {
  return condition ? [style] : [];
}

// ============================================================================
// TYPES
// ============================================================================

export interface WeightSlipData {
  slipNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
}

export interface IncomingGatePassPdfData {
  gatePassNo: number;
  manualGatePassNumber?: number | null;
  date: string;
  variety: string;
  location: string;
  truckNumber: string;
  bagsReceived: number;
  status: string;
  remarks: string;
  weightSlip?: WeightSlipData | null;
  farmerName: string;
  farmerMobile: string;
  farmerAddress: string;
  accountNumber: string;
  createdBy: string;
  juteBagWeight: number;
  isCancelled: boolean;
}

export interface IncomingGatePassPdfProps {
  coldStorageName: string;
  generatedAt: string;
  data: IncomingGatePassPdfData;
}

// ============================================================================
// TOKENS
// ============================================================================

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  primaryLight: '#ECFDF5',
  primaryBorder: '#BBF7D0',
  rule: '#E2E8F0',
  muted: '#64748B',
  body: '#334155',
  dark: '#1E293B',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  amber: '#B45309',
  amberBg: '#FFFBEB',
  red: '#DC2626',
  cancelled: '#94A3B8',
} as const;

const STATUS_LABELS = {
  NOT_GRADED: 'Not Graded',
  GRADED: 'Graded',
  PARTIALLY_GRADED: 'Partially Graded',
} as const;

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.body,
    backgroundColor: C.white,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: 'contain',
  },
  orgLabel: {
    fontSize: 6.5,
    color: C.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  storageName: {
    fontSize: 11,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 6.5,
    color: C.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  generatedAt: {
    fontSize: 6.5,
    color: C.muted,
  },

  // ── Identity band ───────────────────────────────────────────────────────
  identityBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 14,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryLight,
  },
  identityBandCancelled: {
    borderColor: C.rule,
    backgroundColor: C.surface,
  },
  identityLeft: {
    flex: 1,
    backgroundColor: C.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  identityLeftCancelled: {
    backgroundColor: C.surface,
  },
  identityTitle: {
    fontSize: 12,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.1,
  },
  identityDate: {
    fontSize: 7,
    color: C.muted,
    marginTop: 4,
  },
  identityRight: {
    width: 130,
    backgroundColor: C.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: C.primaryBorder,
  },
  identityRightCancelled: {
    backgroundColor: C.surface,
    borderLeftColor: C.rule,
  },
  igpLabel: {
    fontSize: 6.5,
    color: C.primary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  igpLabelCancelled: {
    color: C.muted,
  },
  igpNumber: {
    fontSize: 20,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.5,
  },

  // ── Badges ──────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: C.rule,
    backgroundColor: C.surface,
  },
  badgeText: {
    fontSize: 6.5,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.2,
  },
  badgePrimary: {
    backgroundColor: C.primaryLight,
    borderColor: C.primaryBorder,
  },
  badgePrimaryText: {
    color: C.primary,
  },
  badgeAmber: {
    backgroundColor: C.amberBg,
    borderColor: '#FDE68A',
  },
  badgeAmberText: {
    color: C.amber,
  },
  badgeMuted: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  badgeMutedText: {
    color: C.muted,
  },

  // ── Two-column body ─────────────────────────────────────────────────────
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  colLeft: {
    flex: 1.05,
  },
  colRight: {
    flex: 0.95,
  },

  // ── Section card ────────────────────────────────────────────────────────
  card: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardHeader: {
    backgroundColor: C.surface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  cardHeaderText: {
    fontSize: 6.5,
    color: C.primary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  cardBody: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  // ── Field rows ──────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fieldRowLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    width: 68,
    fontSize: 6.5,
    color: C.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingTop: 1,
  },
  fieldValue: {
    flex: 1,
    fontSize: 8.5,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.35,
  },
  fieldValueMuted: {
    fontFamily: 'Helvetica',
    color: C.body,
    fontSize: 8,
  },
  fieldDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    marginVertical: 6,
  },

  // ── Weight panel ────────────────────────────────────────────────────────
  weightCard: {
    borderWidth: 0.5,
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  weightCardCancelled: {
    borderColor: C.rule,
    backgroundColor: C.surface,
  },
  weightHeader: {
    backgroundColor: C.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  weightHeaderCancelled: {
    backgroundColor: C.cancelled,
  },
  weightHeaderText: {
    fontSize: 7,
    color: C.white,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  weightBody: {
    padding: 10,
  },
  weightMetrics: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  weightMetric: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderWidth: 0.5,
    borderColor: C.primaryBorder,
  },
  weightMetricCancelled: {
    borderColor: C.rule,
  },
  weightMetricLabel: {
    fontSize: 6,
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  weightMetricValue: {
    fontSize: 9,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },
  weightCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  weightCalcLabel: {
    fontSize: 7.5,
    color: C.muted,
  },
  weightCalcValue: {
    fontSize: 8,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },
  weightCalcDeduction: {
    color: C.red,
  },
  weightCalcDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.primaryBorder,
    marginVertical: 5,
  },
  weightCalcDividerCancelled: {
    borderBottomColor: C.rule,
  },
  weightFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 7,
    borderTopWidth: 1.5,
    borderTopColor: C.primary,
  },
  weightFinalCancelled: {
    borderTopColor: C.rule,
  },
  weightFinalLabel: {
    fontSize: 9,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  weightFinalValue: {
    fontSize: 11,
    color: C.primary,
    fontFamily: 'Helvetica-Bold',
  },
  weightFinalValueCancelled: {
    color: C.muted,
  },
  cancelledNote: {
    fontSize: 7,
    color: C.muted,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 1.4,
  },

  // ── Remarks & footer meta ───────────────────────────────────────────────
  remarksTitle: {
    fontSize: 6.5,
    color: C.primary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  remarksCard: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    padding: 10,
    backgroundColor: C.surface,
    minHeight: 36,
    marginBottom: 10,
  },
  remarksText: {
    fontSize: 8,
    color: C.body,
    lineHeight: 1.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  metaItem: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: C.white,
  },
  metaLabel: {
    fontSize: 6,
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 8,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
  },
  footerText: {
    fontSize: 6.5,
    color: C.muted,
  },
  footerBrand: {
    fontSize: 6.5,
    color: C.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
}

// ============================================================================
// PRIMITIVES
// ============================================================================

function Badge({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'primary' | 'amber' | 'muted';
}) {
  return (
    <View
      style={[
        s.badge,
        ...whenStyle(variant === 'primary', s.badgePrimary),
        ...whenStyle(variant === 'amber', s.badgeAmber),
        ...whenStyle(variant === 'muted', s.badgeMuted),
      ]}
    >
      <Text
        style={[
          s.badgeText,
          ...whenStyle(variant === 'primary', s.badgePrimaryText),
          ...whenStyle(variant === 'amber', s.badgeAmberText),
          ...whenStyle(variant === 'muted', s.badgeMutedText),
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  muted,
  last,
}: {
  label: string;
  value: string;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.fieldRow, ...whenStyle(Boolean(last), s.fieldRowLast)]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text
        style={[s.fieldValue, ...whenStyle(Boolean(muted), s.fieldValueMuted)]}
      >
        {value || '--'}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>{title}</Text>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

// ============================================================================
// MAIN
// ============================================================================

function IncomingGatePassPdf({
  coldStorageName,
  generatedAt,
  data,
}: IncomingGatePassPdfProps) {
  const statusLabel = getStatusLabel(data.status);
  const gross = data.weightSlip?.grossWeightKg ?? 0;
  const tare = data.weightSlip?.tareWeightKg ?? 0;
  const netKg = gross - tare;
  const bardanaKg = data.bagsReceived * data.juteBagWeight;
  const netProductKg = netKg - bardanaKg;
  const documentTitle = `Incoming Gate Pass — IGP #${data.gatePassNo}`;

  return (
    <Document
      title={documentTitle}
      author="Bhatti Agri-tech"
      subject="Incoming Gate Pass"
      keywords="incoming gate pass, daybook, cold storage"
      creator="Coldop"
      producer="Coldop"
      language="en-IN"
      pageMode="useNone"
      pageLayout="singlePage"
    >
      <Page size="A4" style={s.page} wrap={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerBrand}>
            <Image
              src="https://res.cloudinary.com/dakh64xhy/image/upload/v1759410800/Bhatti-Agritech_gwqywg.jpg"
              style={s.logo}
            />
            <View>
              <Text style={s.orgLabel}>Bhatti Agritech Pvt Ltd</Text>
              <Text style={s.storageName}>{coldStorageName}</Text>
            </View>
          </View>
          <View style={s.headerMeta}>
            <Text style={s.docType}>Incoming Gate Pass</Text>
            <Text style={s.generatedAt}>Generated {generatedAt}</Text>
          </View>
        </View>

        {/* Identity band */}
        <View
          style={[
            s.identityBand,
            ...whenStyle(data.isCancelled, s.identityBandCancelled),
          ]}
        >
          <View
            style={[
              s.identityLeft,
              ...whenStyle(data.isCancelled, s.identityLeftCancelled),
            ]}
          >
            <Text style={s.identityTitle}>Incoming Gate Pass</Text>
            <Text style={s.identityDate}>{formatDateTime(data.date)}</Text>
          </View>
          <View
            style={[
              s.identityRight,
              ...whenStyle(data.isCancelled, s.identityRightCancelled),
            ]}
          >
            <Text
              style={[
                s.igpLabel,
                ...whenStyle(data.isCancelled, s.igpLabelCancelled),
              ]}
            >
              IGP No.
            </Text>
            <Text style={s.igpNumber}>#{data.gatePassNo}</Text>
          </View>
        </View>

        {/* Status chips */}
        <View style={s.badgeRow}>
          <Badge label={`${formatNumber(data.bagsReceived)} Bags`} />
          {data.manualGatePassNumber != null ? (
            <Badge label={`Manual #${data.manualGatePassNumber}`} />
          ) : null}
          <Badge label={statusLabel} variant="primary" />
          {data.isCancelled ? (
            <Badge label="Cancelled" variant="muted" />
          ) : null}
        </View>

        {/* Two-column body */}
        <View style={s.bodyRow}>
          {/* Left: party & shipment */}
          <View style={s.colLeft}>
            <SectionCard title="Party Details">
              <FieldRow label="Farmer" value={data.farmerName} />
              <FieldRow label="Account" value={data.accountNumber} />
              <FieldRow label="Mobile" value={data.farmerMobile} />
              <View style={s.fieldDivider} />
              <FieldRow label="Address" value={data.farmerAddress} muted last />
            </SectionCard>

            <SectionCard title="Shipment Details">
              <FieldRow label="Location" value={data.location} />
              <FieldRow label="Truck No." value={data.truckNumber} />
              <FieldRow label="Variety" value={data.variety} last />
            </SectionCard>
          </View>

          {/* Right: weight certificate */}
          <View style={s.colRight}>
            <View
              style={[
                s.weightCard,
                ...whenStyle(data.isCancelled, s.weightCardCancelled),
              ]}
            >
              <View
                style={[
                  s.weightHeader,
                  ...whenStyle(data.isCancelled, s.weightHeaderCancelled),
                ]}
              >
                <Text style={s.weightHeaderText}>Weight Slip</Text>
              </View>
              <View style={s.weightBody}>
                {data.isCancelled ? (
                  <Text style={s.cancelledNote}>
                    Cancelled entry — bags received is zero.
                  </Text>
                ) : null}

                <View style={s.weightMetrics}>
                  <View
                    style={[
                      s.weightMetric,
                      ...whenStyle(data.isCancelled, s.weightMetricCancelled),
                    ]}
                  >
                    <Text style={s.weightMetricLabel}>Slip No.</Text>
                    <Text style={s.weightMetricValue}>
                      {data.weightSlip?.slipNumber ?? '--'}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.weightMetric,
                      ...whenStyle(data.isCancelled, s.weightMetricCancelled),
                    ]}
                  >
                    <Text style={s.weightMetricLabel}>Gross</Text>
                    <Text style={s.weightMetricValue}>
                      {formatNumber(gross)} kg
                    </Text>
                  </View>
                  <View
                    style={[
                      s.weightMetric,
                      ...whenStyle(data.isCancelled, s.weightMetricCancelled),
                    ]}
                  >
                    <Text style={s.weightMetricLabel}>Tare</Text>
                    <Text style={s.weightMetricValue}>
                      {formatNumber(tare)} kg
                    </Text>
                  </View>
                </View>

                <View style={s.weightCalcRow}>
                  <Text style={s.weightCalcLabel}>Net Weight</Text>
                  <Text style={s.weightCalcValue}>
                    {formatNumber(netKg)} kg
                  </Text>
                </View>
                <View style={s.weightCalcRow}>
                  <Text style={s.weightCalcLabel}>
                    Bardana ({formatNumber(data.bagsReceived)} ×{' '}
                    {formatNumber(data.juteBagWeight)} kg)
                  </Text>
                  <Text style={[s.weightCalcValue, s.weightCalcDeduction]}>
                    − {formatNumber(bardanaKg)} kg
                  </Text>
                </View>

                <View
                  style={[
                    s.weightCalcDivider,
                    ...whenStyle(
                      data.isCancelled,
                      s.weightCalcDividerCancelled
                    ),
                  ]}
                />

                <View
                  style={[
                    s.weightFinal,
                    ...whenStyle(data.isCancelled, s.weightFinalCancelled),
                  ]}
                >
                  <Text style={s.weightFinalLabel}>Net Product Weight</Text>
                  <Text
                    style={[
                      s.weightFinalValue,
                      ...whenStyle(
                        data.isCancelled,
                        s.weightFinalValueCancelled
                      ),
                    ]}
                  >
                    {formatNumber(netProductKg)} kg
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Remarks */}
        {data.remarks ? (
          <View>
            <Text style={s.remarksTitle}>Remarks</Text>
            <View style={s.remarksCard}>
              <Text style={s.remarksText}>{data.remarks}</Text>
            </View>
          </View>
        ) : null}

        {/* System meta */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Created By</Text>
            <Text style={s.metaValue}>{data.createdBy}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>System Status</Text>
            <Text style={s.metaValue}>Logged in Daybook</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Document Ref.</Text>
            <Text style={s.metaValue}>IGP #{data.gatePassNo}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {coldStorageName} · Created by {data.createdBy}
          </Text>
          <Text style={s.footerBrand}>Powered by Coldop</Text>
        </View>
      </Page>
    </Document>
  );
}

export default IncomingGatePassPdf;
