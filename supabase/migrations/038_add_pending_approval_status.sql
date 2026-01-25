-- Add 'pending_approval' to chores status constraint
-- This status is used when a player submits a photo for verification

-- Drop the existing constraint
ALTER TABLE public.chores DROP CONSTRAINT IF EXISTS chores_status_check;

-- Add new constraint with 'pending_approval' status
ALTER TABLE public.chores
ADD CONSTRAINT chores_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'approved', 'rejected', 'pending_approval'));
