'use client'

import { ShoppingCart, Package, Truck, CheckCircle, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { GroceryOrder } from '@/types'

interface Player {
  id: string
  first_name: string
  last_name: string
  house_id?: string
}

interface House {
  id: string
  name: string
}

interface GroceryTabProps {
  groceryOrders: GroceryOrder[]
  houses: House[]
  players: Player[]
}

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'carbs', 'drinks', 'spices', 'frozen', 'household']

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  meat: 'Meat & Eggs',
  dairy: 'Dairy',
  carbs: 'Carbs',
  drinks: 'Drinks',
  spices: 'Spices',
  frozen: 'Frozen',
  household: 'Household',
}

const getConsolidatedItemsForHouse = (houseOrders: GroceryOrder[]) => {
  const items: Record<string, {
    name: string
    category: string
    totalQty: number
  }> = {}

  houseOrders.forEach(order => {
    order.items?.forEach(orderItem => {
      const itemId = orderItem.item?.id || `unknown-${orderItem.item_id || orderItem.id}`
      const itemName = orderItem.item?.name || 'Unknown Item'
      const itemCategory = orderItem.item?.category || 'other'

      if (!items[itemId]) {
        items[itemId] = {
          name: itemName,
          category: itemCategory,
          totalQty: 0,
        }
      }
      items[itemId].totalQty += orderItem.quantity
    })
  })

  return Object.values(items).sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category)
    const catB = CATEGORY_ORDER.indexOf(b.category)
    if (catA !== catB) return catA - catB
    return a.name.localeCompare(b.name)
  })
}

export const GroceryTab = ({ groceryOrders, houses, players }: GroceryTabProps) => {
  const pendingGroceryOrders = groceryOrders.filter(o => o.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Grocery Orders</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groceryOrders.length}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingGroceryOrders.length}</p>
                <p className="text-sm text-gray-500">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groceryOrders.filter(o => o.status === 'approved').length}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groceryOrders.filter(o => o.status === 'delivered').length}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {groceryOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No grocery orders</p>
              <p className="text-sm">Orders from the player app will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Consolidated Shopping List by Delivery Date */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Consolidated Shopping List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Group orders by delivery date
                const ordersByDate = groceryOrders.reduce((acc, order) => {
                  const date = order.delivery_date
                  if (!acc[date]) acc[date] = []
                  acc[date].push(order)
                  return acc
                }, {} as Record<string, typeof groceryOrders>)

                // Sort dates
                const sortedDates = Object.keys(ordersByDate).sort((a, b) =>
                  new Date(a).getTime() - new Date(b).getTime()
                )

                return (
                  <div className="space-y-6">
                    {sortedDates.map(date => {
                      const ordersForDate = ordersByDate[date]
                      const approvedOrders = ordersForDate.filter(o => o.status === 'approved')

                      // Aggregate items across all approved orders for this date
                      const itemTotals: Record<string, { name: string; category: string; quantity: number; unit?: string }> = {}

                      approvedOrders.forEach(order => {
                        order.items?.forEach(item => {
                          const key = item.item?.name || item.item_id
                          if (!itemTotals[key]) {
                            itemTotals[key] = {
                              name: item.item?.name || 'Unknown Item',
                              category: item.item?.category || 'other',
                              quantity: 0
                            }
                          }
                          itemTotals[key].quantity += item.quantity
                        })
                      })

                      // Group by category
                      const itemsByCategory: Record<string, typeof itemTotals[string][]> = {}
                      Object.values(itemTotals).forEach(item => {
                        if (!itemsByCategory[item.category]) {
                          itemsByCategory[item.category] = []
                        }
                        itemsByCategory[item.category].push(item)
                      })

                      const totalAmount = approvedOrders.reduce((sum, o) => sum + o.total_amount, 0)

                      return (
                        <div key={date} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Truck className="w-5 h-5 text-primary" />
                              <h4 className="font-semibold text-lg">
                                Delivery: {formatDate(date)}
                              </h4>
                            </div>
                            <div className="text-right">
                              <Badge variant="info">{approvedOrders.length} orders</Badge>
                              <p className="text-sm text-gray-500 mt-1">
                                Total: &euro;{totalAmount.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {Object.keys(itemTotals).length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No approved orders for this date</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(itemsByCategory).map(([category, items]) => (
                                <div key={category} className="border rounded p-3 bg-gray-50">
                                  <h5 className="font-medium text-sm text-gray-600 uppercase mb-2 flex items-center gap-1">
                                    {category === 'meat' && '🥩'}
                                    {category === 'dairy' && '🥛'}
                                    {category === 'produce' && '🥬'}
                                    {category === 'carbs' && '🍞'}
                                    {category === 'drinks' && '🥤'}
                                    {category === 'frozen' && '🧊'}
                                    {category === 'spices' && '🧂'}
                                    {category === 'household' && '🏠'}
                                    {category}
                                  </h5>
                                  <ul className="space-y-1">
                                    {items.sort((a, b) => b.quantity - a.quantity).map(item => (
                                      <li key={item.name} className="flex justify-between text-sm">
                                        <span>{item.name}</span>
                                        <span className="font-medium">&times;{item.quantity}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Orders by House - Consolidated Items View (only pending/approved) */}
          <h3 className="text-md font-medium text-gray-700">Orders by House</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unassigned orders first if any */}
            {(() => {
              const activeOrders = groceryOrders.filter(o => o.status === 'pending' || o.status === 'approved')
              const unassignedOrders = activeOrders.filter(o => !o.player?.house_id)
              if (unassignedOrders.length === 0) return null
              const unassignedTotal = unassignedOrders.reduce((sum, o) => sum + o.total_amount, 0)
              const unassignedItems = getConsolidatedItemsForHouse(unassignedOrders)
              return (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-amber-700">
                        <Home className="w-5 h-5" />
                        Unassigned
                      </span>
                      <Badge variant="warning">
                        {unassignedOrders.length} orders
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unassignedItems.length === 0 ? (
                        <p className="text-gray-500 text-sm">No items</p>
                      ) : (
                        <>
                          {CATEGORY_ORDER.map(category => {
                            const categoryItems = unassignedItems.filter(i => i.category === category)
                            if (categoryItems.length === 0) return null
                            return (
                              <div key={category}>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  {CATEGORY_LABELS[category] || category}
                                </h4>
                                {categoryItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-1">
                                    <span>{item.name}</span>
                                    <span className="font-medium">x{item.totalQty}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                          {/* Items with unknown categories */}
                          {(() => {
                            const otherItems = unassignedItems.filter(i => !CATEGORY_ORDER.includes(i.category))
                            if (otherItems.length === 0) return null
                            return (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Other</h4>
                                {otherItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-1">
                                    <span>{item.name}</span>
                                    <span className="font-medium">x{item.totalQty}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </>
                      )}
                      <div className="pt-2 border-t flex justify-between font-medium">
                        <span>Unassigned Total</span>
                        <span>&euro;{unassignedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Houses */}
            {houses.map(house => {
              const activeHouseOrders = groceryOrders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.player?.house_id === house.id)
              const houseOrders = activeHouseOrders
              const housePlayers = players.filter(p => p.house_id === house.id)
              const totalSpent = houseOrders.reduce((sum, o) => sum + o.total_amount, 0)
              const houseItems = getConsolidatedItemsForHouse(houseOrders)

              return (
                <Card key={house.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Home className="w-5 h-5" />
                        {house.name}
                      </span>
                      <Badge variant="default">
                        {housePlayers.length} players
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {houseOrders.length === 0 ? (
                      <p className="text-gray-500 text-sm">No orders</p>
                    ) : (
                      <div className="space-y-3">
                        {CATEGORY_ORDER.map(category => {
                          const categoryItems = houseItems.filter(i => i.category === category)
                          if (categoryItems.length === 0) return null
                          return (
                            <div key={category}>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                {CATEGORY_LABELS[category] || category}
                              </h4>
                              {categoryItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between py-1">
                                  <span>{item.name}</span>
                                  <span className="font-medium">x{item.totalQty}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                        {/* Items with unknown categories */}
                        {(() => {
                          const otherItems = houseItems.filter(i => !CATEGORY_ORDER.includes(i.category))
                          if (otherItems.length === 0) return null
                          return (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Other</h4>
                              {otherItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between py-1">
                                  <span>{item.name}</span>
                                  <span className="font-medium">x{item.totalQty}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                        <div className="pt-2 border-t flex justify-between font-medium">
                          <span>House Total</span>
                          <span>&euro;{totalSpent.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
