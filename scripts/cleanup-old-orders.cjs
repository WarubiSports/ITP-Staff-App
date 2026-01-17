const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://umblyhwumtadlvgccdwg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'
)

async function cleanupOldOrders() {
  console.log('Cleaning up old grocery orders...')
  console.log('Rule: Keep only 3 most recent orders per player\n')

  // Get all orders
  const { data: orders, error: fetchError } = await supabase
    .from('grocery_orders')
    .select('id, player_id, created_at, delivery_date, status')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching orders:', fetchError.message)
    return
  }

  console.log('Total orders before cleanup:', orders.length)

  // Group by player
  const byPlayer = {}
  orders.forEach(o => {
    if (!byPlayer[o.player_id]) {
      byPlayer[o.player_id] = []
    }
    byPlayer[o.player_id].push(o)
  })

  // Find orders to delete (more than 3 per player)
  const toDelete = []
  Object.entries(byPlayer).forEach(([playerId, playerOrders]) => {
    if (playerOrders.length > 3) {
      const ordersToRemove = playerOrders.slice(3)
      toDelete.push(...ordersToRemove.map(o => o.id))
      console.log(`Player ${playerId}: ${playerOrders.length} orders, deleting ${ordersToRemove.length}`)
    }
  })

  console.log('\nOrders to delete:', toDelete.length)

  if (toDelete.length > 0) {
    // First delete the order items (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('grocery_order_items')
      .delete()
      .in('order_id', toDelete)

    if (itemsError) {
      console.error('Error deleting order items:', itemsError.message)
      return
    }

    // Then delete the orders
    const { error: delError } = await supabase
      .from('grocery_orders')
      .delete()
      .in('id', toDelete)

    if (delError) {
      console.error('Error deleting orders:', delError.message)
      return
    }

    console.log('Successfully deleted', toDelete.length, 'old orders')
  } else {
    console.log('No orders need to be deleted')
  }

  // Final count
  const { data: afterOrders } = await supabase
    .from('grocery_orders')
    .select('id')

  console.log('\nTotal orders after cleanup:', afterOrders?.length || 0)
}

cleanupOldOrders().catch(console.error)
