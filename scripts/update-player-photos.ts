import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Convert Google Drive view URL to direct image URL
function convertToDirectUrl(viewUrl: string): string {
  // Extract file ID from URL like https://drive.google.com/file/d/FILE_ID/view
  const match = viewUrl.match(/\/file\/d\/([^\/]+)/)
  if (match) {
    const fileId = match[1]
    return `https://drive.google.com/uc?export=view&id=${fileId}`
  }
  return viewUrl
}

// Player photo URLs from CSV
const playerPhotos = [
  { name: 'Colin Dickinson', url: 'https://drive.google.com/file/d/1AeTT9z-i1BbZaWBO_sqFZlwW23JMV-Fi/view' },
  { name: 'Abdul-Rahman Haruna', url: 'https://drive.google.com/file/d/1gAAPU2L1Hmxpcj2kjKrI8CUwgafQfBIL/view' },
  { name: 'Conor Kasewurm', url: 'https://drive.google.com/file/d/1STlDaHhqb5NRYhzHkn9U9ZezrKZpzHkp/view' },
  { name: 'Samuel Rincon', url: 'https://drive.google.com/file/d/1jh13VF_45TGbrt12IUu5_eocawJBPNCI/view' },
  { name: 'Hartej Parmar', url: 'https://drive.google.com/file/d/1In1YDBiJUor8e_csQK62PDj4EehY0dEe/view' },
  { name: 'Rylan Douglas', url: 'https://drive.google.com/file/d/14JEF90uRTN-3ty2v96ZGBHNEkjgXCaNo/view' },
  { name: 'Ashton Tryon', url: 'https://drive.google.com/file/d/1IUMfRuHi6gV53tXYnAMhlnouTST4DZrA/view' },
  { name: 'Jalen Robertson', url: 'https://drive.google.com/file/d/12cw0uaiBPJkYKq9291brhEG0wHKyEhj0/view' },
  { name: 'Omar Gagula', url: 'https://drive.google.com/file/d/1j0K5NQ4F6m4XGOmwP49KwXmMBeqtYZZc/view' },
  { name: 'Noah Clarkson-Hall', url: 'https://drive.google.com/file/d/1KT7w7ZXkUxF_zK2O5wmub2ylVPqsbSp6/view' },
  { name: 'Julian Quirk', url: 'https://drive.google.com/file/d/1SWaZEpq9G39Aeb43wrjn6GKW1J_kgt0a/view' },
  { name: 'Marwan Kouyate', url: 'https://drive.google.com/file/d/1NgWPPnE41B10HxrS_M1FN5fk2cZ-xXA4/view' },
  { name: 'Saidjamolkhon Saidakbarov', url: 'https://drive.google.com/file/d/1-MMT8RzrcjK6JjqS-FRpih28QFpdP8kT/view' },
  { name: 'Stefan Gruskiewicz', url: 'https://drive.google.com/file/d/1xSMBaNTb_ppflPYwKF1ncvxdCb01xTSN/view' },
  { name: 'Samuel Winkel', url: 'https://drive.google.com/file/d/1Tea5qLPnA-mn9mRStL3Vsscfzig7hUIh/view' },
  { name: 'Patrick Revel', url: 'https://drive.google.com/file/d/14kmZXT2yuKYfwvh5eVHw-onHzyfet8wk/view' },
  { name: 'Karan Rao', url: 'https://drive.google.com/file/d/1X_XjrKMquzxMginvM9M2O8wiwCTd6QJU/view' },
  { name: 'Santiago Pando', url: 'https://drive.google.com/file/d/1IgqjYgPGnVq7msTW7YPWWUm8g_arAkPq/view' },
  { name: 'William Way', url: 'https://drive.google.com/file/d/1xlz3t19Pqstqq8n-puQ2zJtniIiUGmfS/view' },
  { name: 'Dae Yang Townsend', url: 'https://drive.google.com/file/d/1njytHEM6zn4e8k8tJMrA6g2LfAH0KwWw/view' },
  { name: 'Jordan Gisa Mugisha', url: 'https://drive.google.com/file/d/1dS9hH8VWAzdx6-2vJbU5dQzq01i2cRBH/view' },
  { name: 'Pete Byford', url: 'https://drive.google.com/file/d/189LbBMQRai7WwkTNteD020iwdav53tS_/view' },
  { name: 'Lucas Vinson', url: 'https://drive.google.com/file/d/1A2LqK4ihU1ZGYsdksFmPp8e9rqWC6XF6/view' },
]

async function updatePlayerPhotos() {
  console.log('Updating player photos...\n')

  for (const player of playerPhotos) {
    const directUrl = convertToDirectUrl(player.url)

    // Split name into first and last
    const nameParts = player.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    // Find the player by name
    const { data: existingPlayer, error: findError } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .single()

    if (findError || !existingPlayer) {
      // Try with just last name
      const { data: playerByLastName } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .ilike('last_name', lastName)
        .single()

      if (!playerByLastName) {
        console.log(`❌ Player not found: ${player.name}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: directUrl })
        .eq('id', playerByLastName.id)

      if (updateError) {
        console.log(`❌ Error updating ${player.name}: ${updateError.message}`)
      } else {
        console.log(`✓ Updated photo for ${playerByLastName.first_name} ${playerByLastName.last_name}`)
      }
    } else {
      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: directUrl })
        .eq('id', existingPlayer.id)

      if (updateError) {
        console.log(`❌ Error updating ${player.name}: ${updateError.message}`)
      } else {
        console.log(`✓ Updated photo for ${existingPlayer.first_name} ${existingPlayer.last_name}`)
      }
    }
  }

  console.log('\nDone!')
}

updatePlayerPhotos()
