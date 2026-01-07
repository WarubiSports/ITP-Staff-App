-- Migration: Add Operations Tables
-- Description: Creates tables for WellPass memberships, Medical appointments, Insurance claims, and Player trials

-- WellPass Memberships Table
CREATE TABLE IF NOT EXISTS wellpass_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  membership_number VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wellpass_player_id ON wellpass_memberships(player_id);
CREATE INDEX IF NOT EXISTS idx_wellpass_status ON wellpass_memberships(status);

-- Medical Appointments Table (Arzttermine)
CREATE TABLE IF NOT EXISTS medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  doctor_name VARCHAR(255) NOT NULL,
  doctor_type VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (doctor_type IN ('general', 'orthopedic', 'physiotherapy', 'dentist', 'specialist', 'other')),
  clinic_name VARCHAR(255),
  clinic_address TEXT,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  prescription TEXT,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_date DATE,
  insurance_claim_status VARCHAR(20) CHECK (insurance_claim_status IN ('not_submitted', 'submitted', 'approved', 'rejected', 'paid')),
  insurance_claim_amount DECIMAL(10, 2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for medical appointments
CREATE INDEX IF NOT EXISTS idx_medical_player_id ON medical_appointments(player_id);
CREATE INDEX IF NOT EXISTS idx_medical_appointment_date ON medical_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_medical_status ON medical_appointments(status);

-- Insurance Claims Table (K-Versicherung)
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES medical_appointments(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  service_description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'paid')),
  submission_date DATE,
  approval_date DATE,
  payment_date DATE,
  payment_reference VARCHAR(255),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for insurance claims
CREATE INDEX IF NOT EXISTS idx_claims_player_id ON insurance_claims(player_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_invoice_date ON insurance_claims(invoice_date);

-- Player Trials Table
CREATE TABLE IF NOT EXISTS player_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- Optional - might be for new prospects
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  nationality VARCHAR(100),
  positions TEXT[], -- Array of positions
  current_club VARCHAR(255),
  trial_start_date DATE NOT NULL,
  trial_end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  evaluation_status VARCHAR(20) CHECK (evaluation_status IN ('pending', 'positive', 'negative', 'undecided')),
  coach_feedback TEXT,
  technical_rating SMALLINT CHECK (technical_rating >= 1 AND technical_rating <= 10),
  tactical_rating SMALLINT CHECK (tactical_rating >= 1 AND tactical_rating <= 10),
  physical_rating SMALLINT CHECK (physical_rating >= 1 AND physical_rating <= 10),
  mental_rating SMALLINT CHECK (mental_rating >= 1 AND mental_rating <= 10),
  overall_recommendation VARCHAR(20) CHECK (overall_recommendation IN ('sign', 'extend_trial', 'reject', 'undecided')),
  agent_name VARCHAR(255),
  agent_contact VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for player trials
CREATE INDEX IF NOT EXISTS idx_trials_player_id ON player_trials(player_id);
CREATE INDEX IF NOT EXISTS idx_trials_status ON player_trials(status);
CREATE INDEX IF NOT EXISTS idx_trials_start_date ON player_trials(trial_start_date);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_wellpass_memberships_updated_at ON wellpass_memberships;
CREATE TRIGGER update_wellpass_memberships_updated_at
  BEFORE UPDATE ON wellpass_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_appointments_updated_at ON medical_appointments;
CREATE TRIGGER update_medical_appointments_updated_at
  BEFORE UPDATE ON medical_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_insurance_claims_updated_at ON insurance_claims;
CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_trials_updated_at ON player_trials;
CREATE TRIGGER update_player_trials_updated_at
  BEFORE UPDATE ON player_trials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all new tables
ALTER TABLE wellpass_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_trials ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (staff members)
-- WellPass policies
CREATE POLICY "Staff can view all wellpass memberships" ON wellpass_memberships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert wellpass memberships" ON wellpass_memberships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update wellpass memberships" ON wellpass_memberships
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete wellpass memberships" ON wellpass_memberships
  FOR DELETE TO authenticated USING (true);

-- Medical appointments policies
CREATE POLICY "Staff can view all medical appointments" ON medical_appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert medical appointments" ON medical_appointments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update medical appointments" ON medical_appointments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete medical appointments" ON medical_appointments
  FOR DELETE TO authenticated USING (true);

-- Insurance claims policies
CREATE POLICY "Staff can view all insurance claims" ON insurance_claims
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert insurance claims" ON insurance_claims
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update insurance claims" ON insurance_claims
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete insurance claims" ON insurance_claims
  FOR DELETE TO authenticated USING (true);

-- Player trials policies
CREATE POLICY "Staff can view all player trials" ON player_trials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert player trials" ON player_trials
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update player trials" ON player_trials
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete player trials" ON player_trials
  FOR DELETE TO authenticated USING (true);
