'use client'

import { useState } from 'react'
import {
  Search,
  Users,
  Mail,
  Shield,
  ClipboardList,
  Edit2,
  UserPlus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EditStaffModal } from '@/components/modals/EditStaffModal'
import { InviteStaffModal } from '@/components/modals/InviteStaffModal'
import { StaffWithTaskCount } from '@/types'

interface StaffContentProps {
  staff: StaffWithTaskCount[]
  currentUserId: string
}

const roleConfig: Record<string, { color: string; bg: string; label: string }> = {
  admin: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'Admin' },
  staff: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Staff' },
  coach: { color: 'text-green-600', bg: 'bg-green-100', label: 'Coach' },
}

export function StaffContent({ staff, currentUserId }: StaffContentProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingStaff, setEditingStaff] = useState<StaffWithTaskCount | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Count by role
  const roleCounts = {
    all: staff.length,
    admin: staff.filter((s) => s.role === 'admin').length,
    staff: staff.filter((s) => s.role === 'staff').length,
    coach: staff.filter((s) => s.role === 'coach').length,
  }

  const roleButtons = [
    { value: 'all', label: 'All' },
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
    { value: 'coach', label: 'Coach' },
  ]

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Staff
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {roleButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={roleFilter === btn.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter(btn.value)}
                >
                  {btn.label} ({roleCounts[btn.value as keyof typeof roleCounts]})
                </Button>
              ))}
            </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((member) => {
          const config = roleConfig[member.role] || roleConfig.staff
          const isCurrentUser = member.id === currentUserId

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.full_name || member.email}
                      src={member.avatar_url}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.full_name || 'No name set'}
                        {isCurrentUser && (
                          <span className="text-xs text-gray-400 ml-2">(You)</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{member.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Role</span>
                    </div>
                    <Badge className={`${config.bg} ${config.color} border-0`}>
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Assigned Tasks</span>
                    </div>
                    <Badge variant={member.task_count > 0 ? 'info' : 'default'}>
                      {member.task_count}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingStaff(member)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No staff members found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <EditStaffModal
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staff={editingStaff}
          currentUserId={currentUserId}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Invite Staff Modal */}
      <InviteStaffModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
