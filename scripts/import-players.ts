import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local
function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
      }
    }
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// German month names to numbers (lowercase for matching)
const germanMonths: Record<string, string> = {
  'januar': '01', 'februar': '02', 'marz': '03', 'märz': '03', 'april': '04',
  'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
}

// Country code to full name mapping
const countryMap: Record<string, string> = {
  'US': 'United States', 'CA': 'Canada', 'DE': 'Germany', 'GB': 'United Kingdom',
  'NZ': 'New Zealand', 'AU': 'Australia', 'JP': 'Japan', 'MX': 'Mexico',
  'FR': 'France', 'ES': 'Spain', 'PL': 'Poland', 'CH': 'Switzerland',
  'ZA': 'South Africa', 'VE': 'Venezuela', 'IE': 'Ireland', 'IL': 'Israel',
  'IN': 'India', 'UZ': 'Uzbekistan', 'PE': 'Peru', 'KR': 'South Korea',
  'BA': 'Bosnia and Herzegovina', 'TH': 'Thailand', 'RW': 'Rwanda', 'JM': 'Jamaica',
  'HERZEGOVINA': 'Bosnia and Herzegovina', 'MEX': 'Mexico', 'NED': 'Netherlands'
}

// Parse German date format like "Juni 12, 2004" or "März 01, 2009"
function parseGermanDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  // Try standard format first (e.g., "8/8/07" or "2005-08-15")
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
    const parts = dateStr.split('/')
    let year = parts[2]
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`
    }
    return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  }

  // German format: "Juni 12, 2004" or "März 19, 2009"
  // Use [^\s\d]+ to match month names with special characters
  const match = dateStr.match(/^([^\s\d,]+)\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (match) {
    // Normalize: remove accents for matching
    const monthName = match[1].toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    const day = match[2].padStart(2, '0')
    const year = match[3]
    const month = germanMonths[monthName]
    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  // German format with dots: "01.10.2023"
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const parts = dateStr.split('.')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  // Try parsing as-is for other formats
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return null
}

// Parse insurance expiry date (various formats)
function parseInsuranceDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null
  return parseGermanDate(dateStr)
}

// Get primary nationality from passports field
function getNationality(passports: string): string {
  if (!passports || passports.trim() === '') return 'Unknown'

  // Take first country code if multiple
  const firstCode = passports.split(',')[0].trim().toUpperCase()
  return countryMap[firstCode] || firstCode
}

// Valid positions in database (exactly these values)
const VALID_POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'STRIKER']

// Map various position names to valid database values
const positionMap: Record<string, string> = {
  // Striker/Forward variants
  'FWD': 'STRIKER', 'CF': 'STRIKER', 'ST': 'STRIKER', 'STRIKER': 'STRIKER',
  'FORWARD': 'STRIKER', 'LW': 'STRIKER', 'RW': 'STRIKER',
  // Midfielder variants
  'MID': 'MIDFIELDER', 'MIDFIELDER': 'MIDFIELDER', 'MIDFIELD': 'MIDFIELDER',
  'AM': 'MIDFIELDER', 'DM': 'MIDFIELDER', 'CM': 'MIDFIELDER', 'CAM': 'MIDFIELDER',
  'CDM': 'MIDFIELDER', 'RM': 'MIDFIELDER', 'LM': 'MIDFIELDER',
  // Defender variants
  'DEF': 'DEFENDER', 'DEFENDER': 'DEFENDER', 'CB': 'DEFENDER',
  'LB': 'DEFENDER', 'RB': 'DEFENDER',
  // Goalkeeper variants
  'GK': 'GOALKEEPER', 'GOALKEEPER': 'GOALKEEPER', 'KEEPER': 'GOALKEEPER',
}

// Parse positions to the first valid database position
function parsePositions(positions: string): string[] {
  if (!positions || positions.trim() === '') return []

  return positions.split(',').map(p => {
    const code = p.trim().toUpperCase()
    const mapped = positionMap[code]
    if (mapped && VALID_POSITIONS.includes(mapped)) return mapped
    return null
  }).filter((p): p is string => p !== null)
}

// Parse CSV row (handles quoted fields with commas)
function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Parse height (remove non-numeric characters)
function parseHeight(height: string): number | null {
  if (!height || height.trim() === '') return null
  const num = parseInt(height.replace(/[^\d]/g, ''))
  return isNaN(num) ? null : num
}

async function importPlayers() {
  console.log('Starting player import...\n')

  // Sign in as staff user to bypass RLS
  console.log('Authenticating...')
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'max.bisinger@warubi-sports.com',
    password: 'ITP2024'
  })

  if (authError) {
    console.error('Authentication failed:', authError.message)
    console.log('Please ensure the credentials are correct')
    process.exit(1)
  }
  console.log('Authenticated successfully\n')

  // Read CSV file
  const csvPath = resolve(__dirname, 'players-data.csv')
  let csvContent: string
  try {
    csvContent = readFileSync(csvPath, 'utf-8')
  } catch {
    console.error(`Could not read CSV file at ${csvPath}`)
    console.log('Please copy the CSV data to scripts/players-data.csv')
    process.exit(1)
  }

  const lines = csvContent.split('\n')
  const headers = parseCSVRow(lines[0])

  console.log(`Found ${lines.length - 1} total rows`)
  console.log(`Headers: ${headers.slice(0, 10).join(', ')}...\n`)

  // Find column indices
  const col = (name: string) => headers.indexOf(name)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const row = parseCSVRow(line)
    let status = row[col('status')]?.toLowerCase()

    // Filter: Only Active and Pending
    if (status !== 'active' && status !== 'pending') {
      skipped++
      continue
    }

    // Database only allows 'active', so convert pending to active
    if (status === 'pending') {
      status = 'active'
    }

    const playerId = row[col('player_id')]
    const firstName = row[col('first_name')]
    const lastName = row[col('last_name')]

    if (!firstName || !lastName) {
      console.log(`Skipping row ${i}: missing name`)
      skipped++
      continue
    }

    // Parse positions
    const positions = parsePositions(row[col('positions')])
    // Database requires position (singular) - use first valid position or default to MIDFIELDER
    const position = positions.length > 0 ? positions[0] : 'MIDFIELDER'

    // Transform data - only fields that definitely exist in database
    const playerData: Record<string, unknown> = {
      player_id: playerId,
      first_name: firstName,
      last_name: lastName,
      status: status,
      date_of_birth: parseGermanDate(row[col('dob')]),
      nationality: getNationality(row[col('passports')]),
      position: position, // Database uses singular 'position'
      positions: positions, // Also try array field
      email: row[col('email_player')] || null,
      phone: row[col('mobile_player')] || null,
      notes: row[col('notes')] || null,
      whereabouts_status: 'at_academy',
    }

    // Only add height if present
    const height = parseHeight(row[col('height_cm')])
    if (height) playerData.height_cm = height

    const dob = row[col('dob')]
    const parsedDob = parseGermanDate(dob)
    console.log(`Importing: ${firstName} ${lastName} (${playerId}) - ${status}`)
    console.log(`  DOB: "${dob}" -> ${parsedDob}`)
    console.log(`  Positions: "${row[col('positions')]}" -> ${position} (${positions.join(', ')})`)

    // Check if player already exists
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('player_id', playerId)
      .single()

    if (existing) {
      // Update existing player
      const { error } = await supabase
        .from('players')
        .update(playerData)
        .eq('player_id', playerId)

      if (error) {
        console.error(`  Error updating ${playerId}: ${error.message}`)
        errors++
      } else {
        console.log(`  Updated existing player`)
        imported++
      }
    } else {
      // Insert new player
      const { error } = await supabase
        .from('players')
        .insert(playerData)

      if (error) {
        console.error(`  Error inserting ${playerId}: ${error.message}`)
        errors++
      } else {
        console.log(`  Inserted new player`)
        imported++
      }
    }
  }

  console.log('\n--- Import Complete ---')
  console.log(`Imported/Updated: ${imported}`)
  console.log(`Skipped (Alumni/Cancelled): ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importPlayers()
