import { TrialProspect } from '@/types'

const BASE_URL = 'https://itp-trial-onboarding.vercel.app'

// --- Scout notification templates ---

export function scoutTrialScheduledTemplate(
  prospect: TrialProspect,
  scoutName: string,
  startDate: string,
  endDate: string
): { subject: string; body: string } {
  const start = new Date(startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const end = new Date(endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return {
    subject: `Trial Approved – ${prospect.first_name} ${prospect.last_name}`,
    body: `Hi ${scoutName},

Your prospect ${prospect.first_name} ${prospect.last_name} has been approved for a trial.

Trial Dates: ${start} – ${end}
Position: ${prospect.position}

The player has been notified with travel and logistics details. You can track their progress on your Scout Dashboard.

Thanks for the referral!

Best,
ITP Staff`,
  }
}

export function scoutTrialOutcomeTemplate(
  prospect: TrialProspect,
  scoutName: string,
  accepted: boolean,
  rejectionReason?: string
): { subject: string; body: string } {
  if (accepted) {
    return {
      subject: `Placement Confirmed – ${prospect.first_name} ${prospect.last_name}`,
      body: `Hi ${scoutName},

Great news — ${prospect.first_name} ${prospect.last_name} has been accepted into the ITP after their trial.

We're now processing their onboarding. This placement has been credited to your profile.

Thanks for the quality referral!

Best,
ITP Staff`,
    }
  }

  const reasonLine = rejectionReason
    ? `\nFeedback: ${rejectionReason}`
    : ''

  return {
    subject: `Trial Update – ${prospect.first_name} ${prospect.last_name}`,
    body: `Hi ${scoutName},

We wanted to update you on ${prospect.first_name} ${prospect.last_name}'s trial with the ITP.

After evaluation, we've decided not to move forward with a placement at this time.${reasonLine}

We appreciate the referral and encourage you to keep sending prospects our way — your pipeline is valued.

Best,
ITP Staff`,
  }
}

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
