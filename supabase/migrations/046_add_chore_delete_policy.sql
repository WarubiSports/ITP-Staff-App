-- Add missing DELETE policy for chores table
-- Staff can delete chores (was missing, causing silent RLS rejection)

CREATE POLICY "Staff can delete chores"
    ON public.chores FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
