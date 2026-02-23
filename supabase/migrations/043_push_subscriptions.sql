-- Migration: Push Subscriptions for Web Push Notifications
-- Stores browser push subscription endpoints for each player

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each player can have one subscription per browser/device endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_player_endpoint
  ON push_subscriptions(player_id, endpoint);

-- Index for querying all subscriptions (used by edge function)
CREATE INDEX IF NOT EXISTS idx_push_sub_player_id
  ON push_subscriptions(player_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Players can manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE TO authenticated
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Staff can view all (for debugging)
CREATE POLICY "Staff can view all push subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );
