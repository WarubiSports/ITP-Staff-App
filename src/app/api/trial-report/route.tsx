import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { TrialReportDocument, type TrialReportData } from '@/app/prospects/[id]/trial-report-pdf'
import type { TrialProspect } from '@/types'

export async function POST(req: Request) {
  const { prospect, reportData } = (await req.json()) as {
    prospect: TrialProspect
    reportData: TrialReportData
  }

  const buffer = await renderToBuffer(
    <TrialReportDocument prospect={prospect} reportData={reportData} />
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${prospect.first_name}_${prospect.last_name}_Trial_Report.pdf"`,
    },
  })
}
