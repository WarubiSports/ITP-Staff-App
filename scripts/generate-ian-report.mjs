import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

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

const kolnLogo = resolve('public/fc-koln-logo.png')
const warubiLogo = resolve('public/warubi-fc-logo.png')

const c = {
  primary: '#C8102E',
  dark: '#1a1a1a',
  gray: '#4a4a4a',
  lightGray: '#e8e8e8',
  veryLightGray: '#f5f5f5',
  green: '#16a34a',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: c.dark, paddingBottom: 50 },
  // Header
  header: { backgroundColor: c.primary, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLogo: { height: 22, backgroundColor: 'white', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: 2 },
  headerSubtitle: { color: 'white', fontSize: 6.5, letterSpacing: 3, opacity: 0.8, marginTop: 1 },
  headerRight: { color: 'white', fontSize: 8, fontWeight: 700, letterSpacing: 1 },
  // Player bar
  playerBar: { paddingHorizontal: 36, paddingTop: 14, paddingBottom: 10, borderBottom: `2px solid ${c.primary}` },
  playerName: { fontSize: 20, fontWeight: 900, color: c.dark, marginBottom: 1 },
  playerMeta: { fontSize: 8.5, color: c.gray, letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', marginTop: 8, gap: 36 },
  infoLabel: { fontSize: 6.5, color: c.gray, letterSpacing: 1.5, fontWeight: 600, marginBottom: 1 },
  infoValue: { fontSize: 9.5, fontWeight: 700, color: c.dark },
  // Content
  content: { paddingHorizontal: 36, paddingTop: 10 },
  // Section
  section: { marginBottom: 10, border: `1px solid ${c.lightGray}`, borderRadius: 3 },
  sectionHeader: { backgroundColor: c.veryLightGray, paddingHorizontal: 14, paddingVertical: 6, borderBottom: `1px solid ${c.lightGray}` },
  sectionTitle: { fontSize: 7.5, fontWeight: 700, letterSpacing: 2, color: c.gray },
  sectionBody: { paddingHorizontal: 14, paddingVertical: 8 },
  // Bullets
  bulletItem: { flexDirection: 'row', marginBottom: 5, paddingRight: 6 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.primary, marginTop: 3, marginRight: 8, flexShrink: 0 },
  bulletContent: { flex: 1 },
  bulletTitle: { fontSize: 9, fontWeight: 700, color: c.dark, marginBottom: 1 },
  bulletText: { fontSize: 8.5, color: c.gray, lineHeight: 1.45 },
  // Assessment
  assessmentText: { fontSize: 8.5, color: c.gray, lineHeight: 1.45 },
  quoteIcon: { fontSize: 18, color: c.primary, opacity: 0.3, marginBottom: 1 },
  // Decision
  divider: { borderBottom: `1px solid ${c.primary}`, marginBottom: 10, marginTop: 2, opacity: 0.3 },
  decisionBox: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 5, alignItems: 'center', backgroundColor: '#dcfce7' },
  decisionText: { fontSize: 13, fontWeight: 900, letterSpacing: 4, color: c.green },
  decisionNotes: { fontSize: 8.5, color: c.gray, marginTop: 8, lineHeight: 1.45 },
  followUp: { fontSize: 8, color: c.gray, fontStyle: 'italic', marginTop: 6 },
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 10, borderTop: `1px solid ${c.lightGray}`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRight: { fontSize: 6.5, color: c.gray },
})

// Ian's exact data from Iker's PDF
const doc = React.createElement(Document, null,
  React.createElement(Page, { size: 'A4', style: s.page },
    // Header
    React.createElement(View, { style: s.header },
      React.createElement(Image, { src: warubiLogo, style: { height: 20 } }),
      React.createElement(View, { style: s.headerCenter },
        React.createElement(Text, { style: s.headerTitle }, 'TRIAL EVALUATION'),
        React.createElement(Text, { style: s.headerSubtitle }, 'INTERNATIONAL TALENT PATHWAY'),
      ),
      React.createElement(Text, { style: s.headerRight }, 'PROSPECT 2026-27'),
    ),
    // Player bar
    React.createElement(View, { style: s.playerBar },
      React.createElement(Text, { style: s.playerName }, 'IAN HABAUE'),
      React.createElement(Text, { style: s.playerMeta }, 'U-19 · CM / CAM / CDM · U.S.A/Peru'),
      React.createElement(View, { style: s.infoGrid },
        React.createElement(View, null,
          React.createElement(Text, { style: s.infoLabel }, 'DATE OF BIRTH'),
          React.createElement(Text, { style: s.infoValue }, 'October 12, 2008'),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: s.infoLabel }, 'AGE'),
          React.createElement(Text, { style: s.infoValue }, '17'),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: s.infoLabel }, 'FOOT'),
          React.createElement(Text, { style: s.infoValue }, 'Left'),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: s.infoLabel }, 'TRIAL PERIOD'),
          React.createElement(Text, { style: s.infoValue }, 'Mar 13 – Mar 18, 2026'),
        ),
      ),
    ),
    // Content
    React.createElement(View, { style: s.content },
      // Strengths
      React.createElement(View, { style: s.section },
        React.createElement(View, { style: s.sectionHeader },
          React.createElement(Text, { style: s.sectionTitle }, 'STRENGTHS'),
        ),
        React.createElement(View, { style: s.sectionBody },
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Game Understanding:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian reads the game well and positions himself intelligently in midfield, which helps him stay involved in play'),
            ),
          ),
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Ball Control and Composure:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian has a reliable first touch and comfortable composure on the ball during build-up play, allowing him to connect passes smoothly'),
            ),
          ),
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Coachability and Resilience:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian is genuinely receptive to feedback and bounces back well from mistakes in training, showing a strong attitude to improve'),
            ),
          ),
        ),
      ),
      // Areas of Opportunity
      React.createElement(View, { style: s.section },
        React.createElement(View, { style: s.sectionHeader },
          React.createElement(Text, { style: s.sectionTitle }, 'AREAS OF OPPORTUNITY'),
        ),
        React.createElement(View, { style: s.sectionBody },
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Decision-Making Under Pressure:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian can work on making quicker, more confident choices when receiving the ball in tight spaces during training drills'),
            ),
          ),
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Pressing and Transition Play:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian would benefit from developing his intensity and timing when pressing opponents and moving the ball forward quickly in transitions'),
            ),
          ),
          React.createElement(View, { style: s.bulletItem },
            React.createElement(View, { style: s.bulletDot }),
            React.createElement(View, { style: s.bulletContent },
              React.createElement(Text, { style: s.bulletTitle }, 'Physical Presence and Confidence:'),
              React.createElement(Text, { style: s.bulletText }, 'Ian can build his pace and power to help him compete more effectively in midfield and grow his confidence in key moments'),
            ),
          ),
        ),
      ),
      // Coaching Staff Assessment
      React.createElement(View, { style: s.section },
        React.createElement(View, { style: s.sectionHeader },
          React.createElement(Text, { style: s.sectionTitle }, 'COACHING STAFF ASSESSMENT'),
        ),
        React.createElement(View, { style: s.sectionBody },
          React.createElement(Text, { style: s.quoteIcon }, '\u201C'),
          React.createElement(Text, { style: s.assessmentText }, "Ian has a solid understanding of the game with good positioning and composure on the ball, and his build-up play and first touch are reliable assets in midfield. He's a genuinely nice person who gets along well with teammates and shows strong coachability, which is something we really value. To take the next step, Ian needs to work on his physicality, decision-making under pressure, and grow his confidence in key moments, especially during transitions and when pressing opponents. We're not looking to change how he plays, but rather expand his toolkit so he can be a more complete midfielder in all phases of the game."),
        ),
      ),
      // Decision
      React.createElement(View, { style: s.divider }),
      React.createElement(View, { style: s.sectionHeader },
        React.createElement(Text, { style: s.sectionTitle }, 'DECISION'),
      ),
      React.createElement(View, { style: s.decisionBox },
        React.createElement(Text, { style: s.decisionText }, 'ACCEPTED'),
      ),
      React.createElement(Text, { style: s.decisionNotes }, "Ian's coachability, resilience, and positive character make him a valuable addition with strong potential for development."),
      React.createElement(Text, { style: s.followUp }, 'Our administration team will follow up with an official offer and enrollment details shortly.'),
    ),
    // Footer with Warubi logo
    React.createElement(View, { style: s.footer, fixed: true },
      React.createElement(Image, { src: warubiLogo, style: { height: 18 } }),
      React.createElement(Text, { style: s.footerRight }, 'ITP TRIAL EVALUATION — IAN HABAUE — 1. FC KÖLN INTERNATIONAL TALENT PATHWAY'),
    ),
  ),
)

console.log('Generating PDF...')
const buffer = await renderToBuffer(doc)
const outputPath = '/Users/maxbisinger/Desktop/Ian_Habaue_Trial_Report.pdf'
writeFileSync(outputPath, buffer)
console.log(`Done! Saved to ${outputPath}`)
