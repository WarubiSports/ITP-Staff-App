import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { GroceryOrdersContent } from './grocery-orders-content'

export const dynamic = 'force-dynamic'

export default async function GroceryOrdersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all grocery orders with player info and items
  const { data: orders } = await supabase
    .from('grocery_orders')
    .select(`
      *,
      player:players(id, first_name, last_name, house_id),
      items:grocery_order_items(
        id, quantity, price_at_order,
        item:grocery_items(id, name, category)
      )
    `)
    .order('delivery_date', { ascending: true })
    .order('submitted_at', { ascending: false })

  // Fetch houses for grouping
  const { data: houses } = await supabase
    .from('houses')
    .select('id, name')
    .order('name')

  // Fetch all players to show house assignments
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, house_id')
    .eq('status', 'active')
    .order('last_name')

  return (
    <AppLayout
      title="Grocery Orders"
      subtitle="Manage player grocery orders by house"
      user={user}
    >
      <GroceryOrdersContent
        orders={orders || []}
        houses={houses || []}
        players={players || []}
      />
    </AppLayout>
  )
}
