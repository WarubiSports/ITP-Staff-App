import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const columns = [
    { name: 'email', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'emergency_contact_name', type: 'TEXT' },
    { name: 'emergency_contact_phone', type: 'TEXT' },
    { name: 'insurance_provider', type: 'TEXT' },
    { name: 'insurance_number', type: 'TEXT' },
    { name: 'program_start_date', type: 'DATE' },
    { name: 'notes', type: 'TEXT' },
  ]

  const results: { column: string; status: string; error?: string }[] = []

  for (const col of columns) {
    // Try to add column by selecting it first to check if it exists
    const { error: checkError } = await supabase
      .from('players')
      .select(col.name)
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      // Column doesn't exist, need to add it via SQL
      // Use Supabase's postgres REST endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          sql: `ALTER TABLE players ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`
        })
      })

      if (!response.ok) {
        results.push({ column: col.name, status: 'needs_manual_add', error: 'RPC not available' })
      } else {
        results.push({ column: col.name, status: 'added' })
      }
    } else if (checkError) {
      results.push({ column: col.name, status: 'error', error: checkError.message })
    } else {
      results.push({ column: col.name, status: 'exists' })
    }
  }

  const needsManual = results.filter(r => r.status === 'needs_manual_add')

  return NextResponse.json({
    results,
    message: needsManual.length > 0
      ? 'Some columns need to be added manually in Supabase SQL Editor'
      : 'All columns verified',
    sql: needsManual.length > 0 ? `
-- Run this in Supabase SQL Editor:
ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS insurance_number TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS program_start_date DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS notes TEXT;
    `.trim() : null
  })
}
