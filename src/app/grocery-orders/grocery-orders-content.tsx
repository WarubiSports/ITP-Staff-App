'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Home,
  ClipboardList,
  Check,
  Truck,
  X,
  Calendar,
  Euro,
  Package,
  Printer,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { GroceryOrder } from '@/types'
import { updateOrderStatus, bulkUpdateOrderStatus } from './actions'

// Simplified types for data passed from server component
interface SimpleHouse {
  id: string
  name: string
}

interface SimplePlayer {
  id: string
  first_name: string
  last_name: string
  house_id: string | null
}

interface GroceryOrdersContentProps {
  orders: GroceryOrder[]
  houses: SimpleHouse[]
  players: SimplePlayer[]
}

type TabType = 'by-date' | 'by-house' | 'shopping-list'

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

export function GroceryOrdersContent({
  orders,
  houses,
  players,
}: GroceryOrdersContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('by-date')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [selectedHouse, setSelectedHouse] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  // Get unique delivery dates
  const deliveryDates = useMemo(() => {
    const dates = [...new Set(orders.map(o => o.delivery_date))].sort()
    return dates
  }, [orders])

  // Get house name helper
  const getHouseName = (houseId: string | undefined) => {
    if (!houseId) return 'Unassigned'
    const house = houses.find(h => h.id === houseId)
    return house?.name || houseId
  }

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesDate = selectedDate === 'all' || order.delivery_date === selectedDate
      const matchesHouse = selectedHouse === 'all' || order.player?.house_id === selectedHouse
      return matchesStatus && matchesDate && matchesHouse
    })
  }, [orders, statusFilter, selectedDate, selectedHouse])

  // Group orders by delivery date
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, GroceryOrder[]> = {}
    filteredOrders.forEach(order => {
      if (!grouped[order.delivery_date]) {
        grouped[order.delivery_date] = []
      }
      grouped[order.delivery_date].push(order)
    })
    return grouped
  }, [filteredOrders])

  // Group orders by house within each date
  const getOrdersByHouse = (dateOrders: GroceryOrder[]) => {
    const grouped: Record<string, GroceryOrder[]> = {}
    dateOrders.forEach(order => {
      const houseId = order.player?.house_id || 'unassigned'
      if (!grouped[houseId]) {
        grouped[houseId] = []
      }
      grouped[houseId].push(order)
    })
    return grouped
  }

  // Consolidate items for shopping list
  const consolidatedItems = useMemo(() => {
    const items: Record<string, {
      name: string
      category: string
      totalQty: number
      orders: { playerName: string; qty: number }[]
    }> = {}

    filteredOrders.forEach(order => {
      const playerName = order.player
        ? `${order.player.first_name} ${order.player.last_name}`
        : 'Unknown'

      order.items?.forEach(orderItem => {
        if (!orderItem.item) return
        const key = orderItem.item.id

        if (!items[key]) {
          items[key] = {
            name: orderItem.item.name,
            category: orderItem.item.category,
            totalQty: 0,
            orders: []
          }
        }
        items[key].totalQty += orderItem.quantity
        items[key].orders.push({ playerName, qty: orderItem.quantity })
      })
    })

    // Sort by category then name
    return Object.values(items).sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category)
      const catB = CATEGORY_ORDER.indexOf(b.category)
      if (catA !== catB) return catA - catB
      return a.name.localeCompare(b.name)
    })
  }, [filteredOrders])

  // Group consolidated items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, typeof consolidatedItems> = {}
    consolidatedItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })
    return grouped
  }, [consolidatedItems])

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: 'pending' | 'approved' | 'delivered' | 'cancelled') => {
    setLoading(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      router.refresh()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setLoading(null)
    }
  }

  // Handle bulk approve
  const handleBulkApprove = async (orderIds: string[]) => {
    setLoading('bulk')
    try {
      await bulkUpdateOrderStatus(orderIds, 'approved')
      router.refresh()
    } catch (error) {
      console.error('Failed to bulk approve:', error)
    } finally {
      setLoading(null)
    }
  }

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  // Format date for display
  const formatDeliveryDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatShortDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  // Print shopping list
  const handlePrint = () => {
    window.print()
  }

  const tabs = [
    { id: 'by-date' as TabType, label: 'By Delivery Date', icon: Calendar },
    { id: 'by-house' as TabType, label: 'By House', icon: Home },
    { id: 'shopping-list' as TabType, label: 'Shopping List', icon: ClipboardList },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">All Dates</option>
          {deliveryDates.map(date => (
            <option key={date} value={date}>{formatShortDate(date)}</option>
          ))}
        </select>

        <select
          value={selectedHouse}
          onChange={(e) => setSelectedHouse(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">All Houses</option>
          {houses.map(house => (
            <option key={house.id} value={house.id}>{house.name}</option>
          ))}
        </select>

        {activeTab === 'shopping-list' && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="ml-auto">
            <Printer className="w-4 h-4 mr-2" />
            Print List
          </Button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'by-date' && (
        <div className="space-y-6">
          {Object.entries(ordersByDate).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No orders found matching your filters
              </CardContent>
            </Card>
          ) : (
            Object.entries(ordersByDate).map(([date, dateOrders]) => {
              const ordersByHouse = getOrdersByHouse(dateOrders)
              const pendingOrders = dateOrders.filter(o => o.status === 'pending')

              return (
                <Card key={date}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        {formatDeliveryDate(date)}
                        <Badge variant="default" className="ml-2">
                          {dateOrders.length} orders
                        </Badge>
                      </CardTitle>
                      {pendingOrders.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleBulkApprove(pendingOrders.map(o => o.id))}
                          disabled={loading === 'bulk'}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve All ({pendingOrders.length})
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(ordersByHouse).map(([houseId, houseOrders]) => (
                      <div key={houseId} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                          <Home className="w-4 h-4" />
                          {getHouseName(houseId === 'unassigned' ? undefined : houseId)}
                          <Badge variant="default" className="ml-1">
                            {houseOrders.length} orders
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {houseOrders.map(order => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {order.player?.first_name} {order.player?.last_name}
                                </span>
                                <span className="text-gray-500">
                                  {order.items?.length || 0} items
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  <Euro className="w-4 h-4 inline" />
                                  {order.total_amount.toFixed(2)}
                                </span>
                                <StatusBadge status={order.status} />
                                <OrderActions
                                  order={order}
                                  loading={loading === order.id}
                                  onStatusUpdate={handleStatusUpdate}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'by-house' && (() => {
        const unassignedOrders = filteredOrders.filter(o => !o.player?.house_id)
        const unassignedTotal = unassignedOrders.reduce((sum, o) => sum + o.total_amount, 0)

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unassigned orders first if any */}
            {unassignedOrders.length > 0 && (
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
                    {unassignedOrders.map(order => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {order.player?.first_name} {order.player?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatShortDate(order.delivery_date)} - {order.items?.length} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">€{order.total_amount.toFixed(2)}</p>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between font-medium">
                      <span>Unassigned Total</span>
                      <span>€{unassignedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Houses */}
            {houses.map(house => {
              const houseOrders = filteredOrders.filter(o => o.player?.house_id === house.id)
              const housePlayers = players.filter(p => p.house_id === house.id)
              const totalSpent = houseOrders.reduce((sum, o) => sum + o.total_amount, 0)

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
                        {houseOrders.map(order => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <div>
                              <p className="font-medium">
                                {order.player?.first_name} {order.player?.last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatShortDate(order.delivery_date)} - {order.items?.length} items
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">€{order.total_amount.toFixed(2)}</p>
                              <StatusBadge status={order.status} />
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t flex justify-between font-medium">
                          <span>House Total</span>
                          <span>€{totalSpent.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      })()}

      {activeTab === 'shopping-list' && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Shopping List
              {selectedDate !== 'all' && (
                <span className="font-normal text-gray-500">
                  - {formatDeliveryDate(selectedDate)}
                </span>
              )}
              {selectedHouse !== 'all' && (
                <span className="font-normal text-gray-500">
                  - {getHouseName(selectedHouse)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consolidatedItems.length === 0 ? (
              <p className="text-gray-500">No items to display</p>
            ) : (
              <div className="space-y-6">
                {CATEGORY_ORDER.map(category => {
                  const items = itemsByCategory[category]
                  if (!items || items.length === 0) return null

                  return (
                    <div key={category}>
                      <h3 className="font-semibold text-gray-700 mb-2 uppercase text-sm">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="space-y-1">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="w-4 h-4 print:hidden" />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-medium">x {item.totalQty}</span>
                              <span className="text-xs text-gray-400 print:hidden">
                                ({item.orders.map(o => `${o.playerName}: ${o.qty}`).join(', ')})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'warning' | 'success' | 'info' | 'danger' | 'default'> = {
    pending: 'warning',
    approved: 'success',
    delivered: 'info',
    cancelled: 'danger',
  }

  return (
    <Badge variant={variants[status] || 'default'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// Order actions component
function OrderActions({
  order,
  loading,
  onStatusUpdate,
}: {
  order: GroceryOrder
  loading: boolean
  onStatusUpdate: (id: string, status: 'pending' | 'approved' | 'delivered' | 'cancelled') => void
}) {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return null
  }

  return (
    <div className="flex gap-1">
      {order.status === 'pending' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStatusUpdate(order.id, 'approved')}
          disabled={loading}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Check className="w-4 h-4" />
        </Button>
      )}
      {order.status === 'approved' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStatusUpdate(order.id, 'delivered')}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Truck className="w-4 h-4" />
        </Button>
      )}
      {order.status === 'pending' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStatusUpdate(order.id, 'cancelled')}
          disabled={loading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
