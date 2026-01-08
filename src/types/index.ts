// Player types matching the management app structure
export interface Player {
  id: string
  player_id: string // ITP_XXX format
  first_name: string
  last_name: string
  date_of_birth: string
  positions: string[]
  status: 'active' | 'pending' | 'alumni' | 'cancelled'
  nationality: string
  passports: string
  height_cm?: number
  email?: string
  phone?: string
  parent1_name?: string
  parent1_email?: string
  parent2_name?: string
  parent2_email?: string
  video_url?: string
  cohort?: string
  program_start_date?: string
  program_end_date?: string
  insurance_status?: 'valid' | 'expired' | 'not_set'
  insurance_expiry?: string
  house_id?: string
  room_id?: string
  notes?: string
  // Whereabouts tracking
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
  created_at: string
  updated_at: string
}

// Whereabouts details for different statuses
export interface WhereaboutsDetails {
  // For on_trial
  club?: string
  start_date?: string
  end_date?: string
  // For home_leave
  return_date?: string
  destination?: string
  // For injured
  expected_return?: string
  injury_type?: string
  // For traveling
  travel_destination?: string
}

// Staff user
export interface StaffUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'coach'
  avatar_url?: string
  created_at: string
}

// Staff user with task count (for staff list)
export interface StaffWithTaskCount extends StaffUser {
  task_count: number
}

// Housing
export interface House {
  id: string
  name: string
  address: string
  capacity: number
  current_occupancy: number
}

// Room within a house
export interface Room {
  id: string
  house_id: string
  name: string
  floor: number
  capacity: number
  has_bathroom?: boolean
  has_balcony?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

// Task types
export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'training' | 'admin' | 'visa' | 'medical' | 'housing' | 'other'
  assigned_to?: string
  player_id?: string
  due_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Training session
export interface TrainingSession {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  location: string
  type: 'individual' | 'group' | 'team' | 'fitness' | 'recovery'
  coach_id?: string
  player_ids: string[]
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

// Match
export interface Match {
  id: string
  opponent: string
  date: string
  time: string
  location: string
  type: 'friendly' | 'league' | 'tournament' | 'trial'
  result?: string
  score_for?: number
  score_against?: number
  player_ids: string[]
  notes?: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

// Visa tracking
export interface VisaRecord {
  id: string
  player_id: string
  visa_type: string
  issue_date: string
  expiry_date: string
  status: 'valid' | 'expiring_soon' | 'expired' | 'pending'
  notes?: string
}

// Calendar event
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  start_time?: string
  end_time?: string
  type: CalendarEventType
  location?: string
  player_ids?: string[]
  all_day: boolean
  // Recurring event fields
  is_recurring?: boolean
  recurrence_rule?: 'daily' | 'weekly' | 'monthly' | string
  recurrence_end_date?: string
  parent_event_id?: string
  created_at?: string
  updated_at?: string
}

// All calendar event types
export type CalendarEventType =
  // Training
  | 'team_training'
  | 'individual_training'
  | 'gym'
  | 'recovery'
  // Competition
  | 'match'
  | 'tournament'
  // Education
  | 'school'
  | 'language_class'
  // Logistics
  | 'airport_pickup'
  | 'team_activity'
  // Admin
  | 'meeting'
  | 'medical'
  // Legacy
  | 'training'
  // Other
  | 'other'
  | 'visa'

// Quick action types for staff dashboard
export interface QuickAction {
  id: string
  label: string
  icon: string
  href: string
  color: string
}

// Dashboard stats
export interface DashboardStats {
  activePlayers: number
  todayTrainings: number
  pendingTasks: number
  upcomingMatches: number
  expiringVisas: number
  expiringInsurance: number
}

// WellPass membership tracking
export interface WellPassMembership {
  id: string
  player_id: string
  membership_number: string
  status: 'active' | 'inactive' | 'pending' | 'expired'
  start_date: string
  end_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Medical appointments (Arzttermine)
export interface MedicalAppointment {
  id: string
  player_id: string
  appointment_date: string
  appointment_time?: string
  doctor_name: string
  doctor_type: 'general' | 'orthopedic' | 'physiotherapy' | 'dentist' | 'specialist' | 'other'
  clinic_name?: string
  clinic_address?: string
  reason: string
  diagnosis?: string
  prescription?: string
  follow_up_required: boolean
  follow_up_date?: string
  insurance_claim_status?: 'not_submitted' | 'submitted' | 'approved' | 'rejected' | 'paid'
  insurance_claim_amount?: number
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
  updated_at: string
}

// Insurance billing (K-Versicherung)
export interface InsuranceClaim {
  id: string
  player_id: string
  appointment_id?: string
  invoice_number: string
  invoice_date: string
  provider_name: string
  service_description: string
  amount: number
  status: 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'paid'
  submission_date?: string
  approval_date?: string
  payment_date?: string
  payment_reference?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Player trials - tracking ITP players trialing at external clubs
export interface PlayerTrial {
  id: string
  player_id: string // Required - must be an existing ITP player
  trial_club: string // The external club they're trialing at
  trial_start_date: string
  trial_end_date: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  // Club contact at the trial club
  club_contact_name?: string
  club_contact_email?: string
  club_contact_phone?: string
  // Outcome from the external club's perspective
  trial_outcome?: 'pending' | 'offer_received' | 'no_offer' | 'player_declined'
  offer_details?: string // Details if offer received
  // ITP's internal notes
  itp_notes?: string
  travel_arranged?: boolean
  accommodation_arranged?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

// Trial prospects - tracking players trying out FOR the ITP
export interface TrialProspect {
  id: string
  // Basic info
  first_name: string
  last_name: string
  date_of_birth: string
  position: string
  nationality: string
  current_club?: string
  // Contact
  email?: string
  phone?: string
  agent_name?: string
  agent_contact?: string
  parent_name?: string
  parent_contact?: string
  // Scouting
  video_url?: string
  scouting_notes?: string
  recommended_by?: string
  height_cm?: number
  // Trial logistics
  trial_start_date?: string
  trial_end_date?: string
  accommodation_details?: string
  travel_arrangements?: string
  // Status
  status: 'inquiry' | 'scheduled' | 'in_progress' | 'evaluation' | 'decision_pending' | 'accepted' | 'rejected' | 'withdrawn'
  // Evaluation
  technical_rating?: number
  tactical_rating?: number
  physical_rating?: number
  mental_rating?: number
  overall_rating?: number
  coach_feedback?: string
  evaluation_notes?: string
  // Decision
  decision_date?: string
  decision_notes?: string
  // Metadata
  created_by?: string
  created_at: string
  updated_at: string
}

// Training attendance tracking
export interface TrainingAttendance {
  id: string
  session_id: string
  session_date: string
  session_type: 'team_training' | 'individual' | 'gym' | 'recovery' | 'match' | 'other'
  session_name?: string
  player_id: string
  status: 'present' | 'late' | 'excused' | 'absent'
  late_minutes?: number
  excuse_reason?: string
  recorded_by?: string
  recorded_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Player documents
export interface PlayerDocument {
  id: string
  player_id: string
  name: string
  file_path: string
  file_type: string
  file_size?: number
  category: 'identity' | 'contract' | 'medical' | 'performance' | 'other'
  document_type?: string
  expiry_date?: string
  description?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}
