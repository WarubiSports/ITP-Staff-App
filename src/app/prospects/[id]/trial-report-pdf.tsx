'use client'

import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Circle } from '@react-pdf/renderer'
import type { TrialProspect } from '@/types'

// Register a clean sans-serif font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hjQ.ttf', fontWeight: 900 },
  ],
})

const colors = {
  primary: '#C8102E',    // FC Köln red
  dark: '#1a1a1a',
  gray: '#4a4a4a',
  lightGray: '#e8e8e8',
  veryLightGray: '#f5f5f5',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: colors.dark,
    paddingBottom: 60,
  },
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 7,
    letterSpacing: 3,
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    color: 'white',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
  },
  // Player info bar
  playerBar: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottom: `2px solid ${colors.primary}`,
  },
  playerName: {
    fontSize: 22,
    fontWeight: 900,
    color: colors.dark,
    marginBottom: 2,
  },
  playerMeta: {
    fontSize: 9,
    color: colors.gray,
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 40,
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 7,
    color: colors.gray,
    letterSpacing: 1.5,
    fontWeight: 600,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.dark,
  },
  // Content
  content: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  // Section
  section: {
    marginBottom: 20,
    border: `1px solid ${colors.lightGray}`,
    borderRadius: 4,
  },
  sectionHeader: {
    backgroundColor: colors.veryLightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2,
    color: colors.gray,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Bullet points
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 3,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.dark,
    marginBottom: 2,
  },
  bulletText: {
    fontSize: 9.5,
    color: colors.gray,
    lineHeight: 1.5,
  },
  // Assessment
  assessmentText: {
    fontSize: 10,
    color: colors.gray,
    lineHeight: 1.6,
  },
  quoteIcon: {
    fontSize: 24,
    color: colors.primary,
    opacity: 0.3,
    marginBottom: 4,
  },
  // Ratings
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ratingItem: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 8,
    color: colors.gray,
    width: 55,
  },
  ratingBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 3,
  },
  ratingBarFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  ratingValue: {
    fontSize: 9,
    fontWeight: 700,
    width: 20,
    textAlign: 'right',
  },
  // Decision
  decisionBox: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  decisionAccepted: {
    backgroundColor: '#dcfce7',
  },
  decisionRejected: {
    backgroundColor: '#fee2e2',
  },
  decisionText: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 4,
  },
  decisionAcceptedText: {
    color: colors.green,
  },
  decisionRejectedText: {
    color: colors.red,
  },
  decisionNotes: {
    fontSize: 9.5,
    color: colors.gray,
    marginTop: 12,
    lineHeight: 1.5,
  },
  followUp: {
    fontSize: 9,
    color: colors.gray,
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderTop: `1px solid ${colors.lightGray}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.dark,
    letterSpacing: 0.5,
  },
  footerRight: {
    fontSize: 7,
    color: colors.gray,
  },
  // Divider before decision
  divider: {
    borderBottom: `1px solid ${colors.primary}`,
    marginBottom: 12,
    marginTop: 4,
    opacity: 0.3,
  },
})

export interface TrialReportData {
  strengths: { title: string; description: string }[]
  areas: { title: string; description: string }[]
  assessment: string
  decisionReasoning: string
}

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSeasonLabel(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  // Season runs Aug-Jul
  if (month >= 7) return `${year}-${(year + 1).toString().slice(2)}`
  return `${year - 1}-${year.toString().slice(2)}`
}

// FC Köln Geißbock logo as simplified SVG
function KolnLogo() {
  return (
    <Svg width={28} height={28} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill="white" />
      <Circle cx="50" cy="50" r="44" fill="none" stroke={colors.primary} strokeWidth="3" />
      <Text
        style={{ fontSize: 11, fontWeight: 900, color: colors.primary }}
        x="50"
        y="35"
      >
        1.FC
      </Text>
    </Svg>
  )
}

export function TrialReportDocument({
  prospect,
  reportData,
}: {
  prospect: TrialProspect
  reportData: TrialReportData
}) {
  const age = calculateAge(prospect.date_of_birth)
  const isAccepted = prospect.status === 'accepted' || prospect.status === 'placed'
  const trialPeriod = prospect.trial_start_date && prospect.trial_end_date
    ? `${formatDate(prospect.trial_start_date)} – ${formatDate(prospect.trial_end_date)}`
    : 'N/A'

  const ratings = [
    { label: 'Technical', value: prospect.technical_rating },
    { label: 'Tactical', value: prospect.tactical_rating },
    { label: 'Physical', value: prospect.physical_rating },
    { label: 'Mental', value: prospect.mental_rating },
    { label: 'Overall', value: prospect.overall_rating },
  ].filter(r => r.value != null)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View>
              <Text style={s.headerTitle}>TRIAL EVALUATION</Text>
              <Text style={s.headerSubtitle}>INTERNATIONAL TALENT PATHWAY</Text>
            </View>
          </View>
          <Text style={s.headerRight}>PROSPECT {getSeasonLabel()}</Text>
        </View>

        {/* Player Info */}
        <View style={s.playerBar}>
          <Text style={s.playerName}>
            {prospect.first_name.toUpperCase()} <Text style={{ fontWeight: 900 }}>{prospect.last_name.toUpperCase()}</Text>
          </Text>
          <Text style={s.playerMeta}>
            U-{age > 18 ? '23' : age} · {prospect.position}{prospect.nationality ? ` · ${prospect.nationality}` : ''}
          </Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>DATE OF BIRTH</Text>
              <Text style={s.infoValue}>{formatDate(prospect.date_of_birth)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>AGE</Text>
              <Text style={s.infoValue}>{age}</Text>
            </View>
            {prospect.height_cm && (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>HEIGHT</Text>
                <Text style={s.infoValue}>{prospect.height_cm} cm</Text>
              </View>
            )}
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>TRIAL PERIOD</Text>
              <Text style={s.infoValue}>{trialPeriod}</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
          {/* Ratings */}
          {ratings.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>PERFORMANCE RATINGS</Text>
              </View>
              <View style={s.sectionBody}>
                <View style={s.ratingsGrid}>
                  {ratings.map((r) => (
                    <View key={r.label} style={s.ratingItem}>
                      <Text style={s.ratingLabel}>{r.label}</Text>
                      <View style={s.ratingBarBg}>
                        <View style={[s.ratingBarFill, { width: `${(r.value! / 10) * 100}%` }]} />
                      </View>
                      <Text style={s.ratingValue}>{r.value}/10</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Strengths */}
          {reportData.strengths.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>STRENGTHS</Text>
              </View>
              <View style={s.sectionBody}>
                {reportData.strengths.map((item, i) => (
                  <View key={i} style={s.bulletItem}>
                    <View style={s.bulletDot} />
                    <View style={s.bulletContent}>
                      <Text style={s.bulletTitle}>{item.title}:</Text>
                      <Text style={s.bulletText}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Areas of Opportunity */}
          {reportData.areas.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>AREAS OF OPPORTUNITY</Text>
              </View>
              <View style={s.sectionBody}>
                {reportData.areas.map((item, i) => (
                  <View key={i} style={s.bulletItem}>
                    <View style={s.bulletDot} />
                    <View style={s.bulletContent}>
                      <Text style={s.bulletTitle}>{item.title}:</Text>
                      <Text style={s.bulletText}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Coaching Staff Assessment */}
          {reportData.assessment && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>COACHING STAFF ASSESSMENT</Text>
              </View>
              <View style={s.sectionBody}>
                <Text style={s.quoteIcon}>&ldquo;</Text>
                <Text style={s.assessmentText}>{reportData.assessment}</Text>
              </View>
            </View>
          )}

          {/* Decision */}
          <View style={s.divider} />
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>DECISION</Text>
          </View>
          <View style={[s.decisionBox, isAccepted ? s.decisionAccepted : s.decisionRejected]}>
            <Text style={[s.decisionText, isAccepted ? s.decisionAcceptedText : s.decisionRejectedText]}>
              {isAccepted ? 'ACCEPTED' : 'REJECTED'}
            </Text>
          </View>
          {reportData.decisionReasoning && (
            <Text style={s.decisionNotes}>{reportData.decisionReasoning}</Text>
          )}
          <Text style={s.followUp}>
            {isAccepted
              ? 'Our administration team will follow up with an official offer and enrollment details shortly.'
              : 'We encourage continued development and welcome future trial applications.'}
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerText}>1. FC KÖLN</Text>
            <Text style={{ fontSize: 8, color: colors.gray }}>·</Text>
            <Text style={{ fontSize: 7, color: colors.gray, letterSpacing: 0.5 }}>INTERNATIONAL TALENT PATHWAY</Text>
          </View>
          <Text style={s.footerRight}>
            ITP TRIAL EVALUATION — {prospect.first_name.toUpperCase()} {prospect.last_name.toUpperCase()} — 1. FC KÖLN INTERNATIONAL TALENT PATHWAY
          </Text>
        </View>
      </Page>
    </Document>
  )
}
