'use client'

import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import type { TrialProspect, TrialReportData } from '@/types'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hjQ.ttf', fontWeight: 900 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400, fontStyle: 'italic' },
  ],
})

const c = {
  primary: '#C8102E',
  dark: '#1a1a1a',
  gray: '#4a4a4a',
  lightGray: '#e8e8e8',
  veryLightGray: '#f5f5f5',
  green: '#16a34a',
  red: '#dc2626',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: c.dark, paddingBottom: 50 },
  header: { backgroundColor: c.primary, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: 2 },
  headerSubtitle: { color: 'white', fontSize: 6.5, letterSpacing: 3, opacity: 0.8, marginTop: 1 },
  headerRight: { color: 'white', fontSize: 8, fontWeight: 700, letterSpacing: 1 },
  playerBar: { paddingHorizontal: 36, paddingTop: 14, paddingBottom: 10, borderBottom: `2px solid ${c.primary}` },
  playerName: { fontSize: 20, fontWeight: 900, color: c.dark, marginBottom: 1 },
  playerMeta: { fontSize: 8.5, color: c.gray, letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', marginTop: 8, gap: 36 },
  infoLabel: { fontSize: 6.5, color: c.gray, letterSpacing: 1.5, fontWeight: 600, marginBottom: 1 },
  infoValue: { fontSize: 9.5, fontWeight: 700, color: c.dark },
  content: { paddingHorizontal: 36, paddingTop: 10 },
  section: { marginBottom: 10, border: `1px solid ${c.lightGray}`, borderRadius: 3 },
  sectionHeader: { backgroundColor: c.veryLightGray, paddingHorizontal: 14, paddingVertical: 6, borderBottom: `1px solid ${c.lightGray}` },
  sectionTitle: { fontSize: 7.5, fontWeight: 700, letterSpacing: 2, color: c.gray },
  sectionBody: { paddingHorizontal: 14, paddingVertical: 8 },
  bulletItem: { flexDirection: 'row', marginBottom: 5, paddingRight: 6 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.primary, marginTop: 3, marginRight: 8, flexShrink: 0 },
  bulletContent: { flex: 1 },
  bulletTitle: { fontSize: 9, fontWeight: 700, color: c.dark, marginBottom: 1 },
  bulletText: { fontSize: 8.5, color: c.gray, lineHeight: 1.45 },
  assessmentText: { fontSize: 8.5, color: c.gray, lineHeight: 1.45 },
  quoteIcon: { fontSize: 18, color: c.primary, opacity: 0.3, marginBottom: 1 },
  divider: { borderBottom: `1px solid ${c.primary}`, marginBottom: 10, marginTop: 2, opacity: 0.3 },
  decisionBox: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 5, alignItems: 'center' },
  decisionAccepted: { backgroundColor: '#dcfce7' },
  decisionRejected: { backgroundColor: '#fee2e2' },
  decisionText: { fontSize: 13, fontWeight: 900, letterSpacing: 4 },
  decisionAcceptedText: { color: c.green },
  decisionRejectedText: { color: c.red },
  decisionNotes: { fontSize: 8.5, color: c.gray, marginTop: 8, lineHeight: 1.45 },
  followUp: { fontSize: 8, color: c.gray, fontStyle: 'italic', marginTop: 6 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 10, borderTop: `1px solid ${c.lightGray}`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRight: { fontSize: 6.5, color: c.gray },
})

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTrialPeriod(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`
}

function getSeasonLabel(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (month >= 7) return `${year}-${(year + 1).toString().slice(2)}`
  return `${year - 1}-${year.toString().slice(2)}`
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
    ? formatTrialPeriod(prospect.trial_start_date, prospect.trial_end_date)
    : 'N/A'
  const ageGroup = age > 18 ? 'U-23' : `U-${age}`

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/warubi-fc-logo.png" style={{ height: 20 }} />
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>TRIAL EVALUATION</Text>
            <Text style={s.headerSubtitle}>INTERNATIONAL TALENT PATHWAY</Text>
          </View>
          <Text style={s.headerRight}>PROSPECT {getSeasonLabel()}</Text>
        </View>

        {/* Player Info */}
        <View style={s.playerBar}>
          <Text style={s.playerName}>
            {prospect.first_name.toUpperCase()} {prospect.last_name.toUpperCase()}
          </Text>
          <Text style={s.playerMeta}>
            {ageGroup} · {prospect.position}{prospect.nationality ? ` · ${prospect.nationality}` : ''}
          </Text>
          <View style={s.infoGrid}>
            <View>
              <Text style={s.infoLabel}>DATE OF BIRTH</Text>
              <Text style={s.infoValue}>{formatDate(prospect.date_of_birth)}</Text>
            </View>
            <View>
              <Text style={s.infoLabel}>AGE</Text>
              <Text style={s.infoValue}>{age}</Text>
            </View>
            {prospect.height_cm && (
              <View>
                <Text style={s.infoLabel}>HEIGHT</Text>
                <Text style={s.infoValue}>{prospect.height_cm} cm</Text>
              </View>
            )}
            {prospect.preferred_foot && (
              <View>
                <Text style={s.infoLabel}>FOOT</Text>
                <Text style={s.infoValue}>{prospect.preferred_foot}</Text>
              </View>
            )}
            <View>
              <Text style={s.infoLabel}>TRIAL PERIOD</Text>
              <Text style={s.infoValue}>{trialPeriod}</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
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
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/warubi-fc-logo.png" style={{ height: 18 }} />
          <Text style={s.footerRight}>
            ITP TRIAL EVALUATION — {prospect.first_name.toUpperCase()} {prospect.last_name.toUpperCase()} — 1. FC KÖLN INTERNATIONAL TALENT PATHWAY
          </Text>
        </View>
      </Page>
    </Document>
  )
}
