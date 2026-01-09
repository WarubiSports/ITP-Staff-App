'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type OrderStatusType = 'pending' | 'approved' | 'delivered' | 'cancelled'

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatusType
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Set approval/delivery timestamps and user
  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString()
    updateData.approved_by = user.id
  } else if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('grocery_orders')
    .update(updateData)
    .eq('id', orderId)

  if (error) {
    console.error('Error updating order status:', error)
    return { error: error.message }
  }

  revalidatePath('/grocery-orders')
  return { success: true }
}

export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatusType
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString()
    updateData.approved_by = user.id
  } else if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('grocery_orders')
    .update(updateData)
    .in('id', orderIds)

  if (error) {
    console.error('Error bulk updating order status:', error)
    return { error: error.message }
  }

  revalidatePath('/grocery-orders')
  return { success: true }
}
