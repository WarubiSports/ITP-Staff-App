-- Migration: Auto-delete old grocery orders
-- Description: Automatically delete old grocery orders when a player has more than 3 orders
-- Rule: Keep only the 3 most recent orders per player

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_grocery_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete orders for this player where there are already 3 newer orders
  DELETE FROM grocery_orders
  WHERE id IN (
    SELECT id FROM grocery_orders
    WHERE player_id = NEW.player_id
    ORDER BY created_at DESC
    OFFSET 3
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER - Run after each new order
-- ============================================
DROP TRIGGER IF EXISTS trigger_cleanup_old_grocery_orders ON grocery_orders;

CREATE TRIGGER trigger_cleanup_old_grocery_orders
  AFTER INSERT ON grocery_orders
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_grocery_orders();

-- ============================================
-- INITIAL CLEANUP - Clean existing old orders
-- ============================================
DELETE FROM grocery_orders
WHERE id IN (
  SELECT id FROM (
    SELECT id, player_id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at DESC) as rn
    FROM grocery_orders
  ) ranked
  WHERE rn > 3
);

COMMENT ON FUNCTION cleanup_old_grocery_orders() IS 'Automatically keeps only the 3 most recent grocery orders per player';
