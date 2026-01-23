-- Add missing columns to chores table for Staff App functionality
-- These columns are needed for photo verification, recurring chores, and approval workflow

-- Add requires_photo column (defaults to true for photo verification)
ALTER TABLE public.chores
ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN NOT NULL DEFAULT true;

-- Add recurring_group_id column for grouping recurring chores
ALTER TABLE public.chores
ADD COLUMN IF NOT EXISTS recurring_group_id TEXT;

-- Add approval workflow columns
ALTER TABLE public.chores
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.chores
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chores
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update status CHECK constraint to include 'approved' and 'rejected'
-- First drop the existing constraint
ALTER TABLE public.chores DROP CONSTRAINT IF EXISTS chores_status_check;

-- Add new constraint with additional status values
ALTER TABLE public.chores
ADD CONSTRAINT chores_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'approved', 'rejected'));

-- Create index for recurring_group_id for faster queries
CREATE INDEX IF NOT EXISTS chores_recurring_group_id_idx ON public.chores(recurring_group_id);

-- Create chore_photos table for storing verification photos
CREATE TABLE IF NOT EXISTS public.chore_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_id UUID REFERENCES public.chores(id) ON DELETE CASCADE NOT NULL UNIQUE,
    photo_data TEXT NOT NULL, -- Base64 encoded image
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES public.players(id) ON DELETE SET NULL
);

-- Enable RLS on chore_photos
ALTER TABLE public.chore_photos ENABLE ROW LEVEL SECURITY;

-- Policies for chore_photos
CREATE POLICY "Anyone can view chore photos"
    ON public.chore_photos FOR SELECT
    USING (true);

CREATE POLICY "Players can upload photos for their chores"
    ON public.chore_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chores c
            JOIN public.players p ON c.assigned_to = p.id
            WHERE c.id = chore_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage chore photos"
    ON public.chore_photos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
