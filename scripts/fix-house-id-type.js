import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixHouseIdType() {
  console.log('Fixing house_id column type in players table...')
  
  // First, clear any existing house_id values (since they're wrong type anyway)
  // Then alter the column type from UUID to TEXT
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Clear existing house_id values
      UPDATE players SET house_id = NULL;
      
      -- Drop the column and recreate as TEXT
      ALTER TABLE players DROP COLUMN IF EXISTS house_id;
      ALTER TABLE players ADD COLUMN house_id TEXT;
    `
  })
  
  if (error) {
    console.error('RPC error:', error)
    
    // Try direct approach - just update via the API
    console.log('Trying alternative approach...')
    
    // First clear all house_id values
    const { error: clearError } = await supabase
      .from('players')
      .update({ house_id: null })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Match all rows
    
    if (clearError) {
      console.error('Clear error:', clearError)
    }
    
    return
  }
  
  console.log('Column type fixed successfully!')
}

fixHouseIdType()
