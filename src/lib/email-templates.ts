import { TrialProspect } from '@/types'

const BASE_URL = 'https://itp-trial-onboarding.vercel.app'

export function trialApprovedTemplate(
  prospect: TrialProspect,
  startDate: string,
  endDate: string
): { subject: string; body: string } {
  const start = new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const end = new Date(endDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    subject: `Trial Confirmed – 1. FC Köln ITP`,
    body: `Hi ${prospect.first_name},

We're pleased to confirm your trial with the 1. FC Köln International Talent Pathway.

Trial Dates: ${start} – ${end}
Location: Cologne, Germany

Please use the link below to view all important information about your trial, including arrival details, what to bring, and training schedule:

${BASE_URL}/${prospect.id}

If you have any questions, don't hesitate to reach out.

Best regards,
ITP Staff`,
  }
}

export function prospectAcceptedTemplate(
  prospect: TrialProspect
): { subject: string; body: string } {
  return {
    subject: `Next Steps – Onboarding for 1. FC Köln ITP`,
    body: `Hi ${prospect.first_name},

To prepare for your arrival, please complete the onboarding form below. This includes travel details, document uploads (passport, etc.), and equipment sizing:

${BASE_URL}/${prospect.id}/onboarding

Please complete this as soon as possible so we can have everything ready for you.

If you have any questions, don't hesitate to reach out.

Best regards,
ITP Staff`,
  }
}

export function prospectRejectedTemplate(
  prospect: TrialProspect,
  reason?: string
): { subject: string; body: string } {
  const reasonLine = reason
    ? `\nAfter careful consideration, we have decided not to move forward at this time. ${reason}`
    : `\nAfter careful consideration, we have decided not to move forward at this time.`

  return {
    subject: `Update on Your Trial – 1. FC Köln ITP`,
    body: `Hi ${prospect.first_name},

Thank you for your interest in the 1. FC Köln International Talent Pathway and for the time you invested in the trial process.
${reasonLine}

We appreciate your effort and wish you all the best in your football career. Should circumstances change in the future, we would be happy to hear from you again.

Best regards,
ITP Staff`,
  }
}
