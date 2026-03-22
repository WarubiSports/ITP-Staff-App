-- =============================================
-- DRILL LIBRARY & COMPLETIONS
-- =============================================

-- Drill library: staff-managed drills tagged by category
CREATE TABLE IF NOT EXISTS drill_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    video_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drill completions: one check per drill per player per week
CREATE TABLE IF NOT EXISTS drill_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL REFERENCES drill_library(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (player_id, drill_id, week_start)
);

-- Add focus_point_categories parallel array to player_focus_notes
ALTER TABLE player_focus_notes
    ADD COLUMN IF NOT EXISTS focus_point_categories TEXT[] DEFAULT '{}';

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE drill_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_completions ENABLE ROW LEVEL SECURITY;

-- drill_library: staff full CRUD
CREATE POLICY "Staff can manage drills"
    ON drill_library FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'coach'))
    );

-- drill_library: players can read
CREATE POLICY "Players can view drills"
    ON drill_library FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM players WHERE id = auth.uid())
    );

-- drill_completions: staff full access
CREATE POLICY "Staff can manage drill completions"
    ON drill_completions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'coach'))
    );

-- drill_completions: players can view their own
CREATE POLICY "Players can view own completions"
    ON drill_completions FOR SELECT
    USING (player_id = auth.uid());

-- drill_completions: players can insert their own
CREATE POLICY "Players can insert own completions"
    ON drill_completions FOR INSERT
    WITH CHECK (player_id = auth.uid());

-- drill_completions: players can delete their own
CREATE POLICY "Players can delete own completions"
    ON drill_completions FOR DELETE
    USING (player_id = auth.uid());

-- =============================================
-- SEED DRILLS
-- =============================================

INSERT INTO drill_library (title, description, categories) VALUES
    ('Wall Ball First Touch', 'Pass against a wall and control with different surfaces. 50 reps each foot.', ARRAY['first-touch']),
    ('Cone Weave Dribbling', 'Set 8 cones 1m apart. Dribble through with inside/outside cuts at speed.', ARRAY['dribbling']),
    ('Finishing Under Pressure', 'Set up 5 cones as defenders. Receive, turn, and finish within 3 seconds. 10 reps each side.', ARRAY['finishing']),
    ('Heading Accuracy', 'Self-toss and head toward target zones. 20 reps, track accuracy.', ARRAY['heading']),
    ('Passing Patterns', 'Triangle passing with 2 cones. One-touch, two-touch, alternating feet. 5 min each variation.', ARRAY['passing', 'first-touch']),
    ('Shadow Pressing Drill', 'Mark out a 10x10 grid. Sprint to press imaginary receivers on coach call. 8 reps x 3 sets.', ARRAY['pressing', 'speed']),
    ('Transition Sprints', '40m sprints with direction change on whistle. Simulates defensive-to-offensive transition.', ARRAY['transition', 'speed']),
    ('Set Piece Delivery', 'Practice corner/free kick delivery to target zones. 10 inswingers, 10 outswingers.', ARRAY['set-pieces', 'passing']),
    ('Positional Shadow Play', 'Walk through positions on a half-pitch without ball. React to coach cues. 15 min.', ARRAY['positioning', 'decision-making']),
    ('Agility Ladder', 'Complete 6 ladder patterns: in-out, lateral, Icky shuffle, crossover, single-leg hop, carioca.', ARRAY['agility', 'speed']),
    ('Endurance Box Run', '20m x 20m box. Jog sides, sprint diagonals. 10 rounds with 30s rest between.', ARRAY['endurance']),
    ('Core & Strength Circuit', '3 rounds: 20 sit-ups, 15 push-ups, 30s plank, 10 squat jumps, 20 mountain climbers.', ARRAY['strength']),
    ('Composure Under Pressure', 'Receive ball with back to goal, defender behind. Turn and play accurate pass. Focus on calm decisions.', ARRAY['composure', 'first-touch', 'decision-making']),
    ('Communication Drill', 'Blindfolded partner drill — guide teammate through cone course using only voice commands.', ARRAY['communication']),
    ('Concentration Sequence', 'Juggle pattern: R foot, L foot, R thigh, L thigh, head x 10 cycles. Track drops.', ARRAY['concentration', 'first-touch'])
ON CONFLICT DO NOTHING;
