import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Player data from PDF
const playerUpdates = [
  { name: 'Colin Dickinson', jersey_number: 10, photo_url: 'https://drive.google.com/drive/folders/1IlNU8LY9xqKpS4uyn0bCO2A1qGH4DN9d?usp=sharing' },
  { name: 'Abdul-Rahman Haruna', jersey_number: 19, photo_url: 'https://drive.google.com/drive/folders/170r7wTbt5CnUzR1paQzA_XM3TBiShCgB?usp=sharing' },
  { name: 'Conor Kasewurm', jersey_number: 7, photo_url: 'https://drive.google.com/drive/folders/1aRXtfTrdjljX9oz0uU_9J04GETsgNVRr?usp=sharing' },
  { name: 'Samuel Rincon', jersey_number: 2, photo_url: 'https://drive.google.com/drive/folders/1WHWUtlL52KL-G7YNfOZb1Mj5H0Dxd4km?usp=sharing' },
  { name: 'Hartej Parmar', jersey_number: 13, photo_url: 'https://drive.google.com/drive/folders/1otqiIjRCVkfDAyYiOkwFIgbAR6KIglMV?usp=sharing' },
  { name: 'Rylan Douglas', jersey_number: 3, photo_url: 'https://drive.google.com/drive/folders/1RUIf08GxKIy_DOvwub1lsAP3ByJbJSfr?usp=sharing' },
  { name: 'Ashton Tryon', jersey_number: 4, photo_url: 'https://drive.google.com/drive/folders/1im3wnNrCCrXvx9tWYuqTExaF-cCfvaLZ?usp=sharing' },
  { name: 'Jalen Robertson', jersey_number: 11, photo_url: 'https://drive.google.com/drive/folders/1PI52hGPgwyVz30KYShySBOrHZiABWrCo?usp=sharing' },
  { name: 'Omar Gagula', jersey_number: 6, photo_url: 'https://drive.google.com/drive/folders/1lHR0bdANxbzheOXyalNVOhh_koWKjaFi?usp=sharing' },
  { name: 'Noah Clarkson-Hall', jersey_number: 1, photo_url: 'https://drive.google.com/drive/folders/1pPOSDa5sYiZrWUwuEJgCJ8Ljr1uKnhYU?usp=sharing' },
  { name: 'Julian Quirk', jersey_number: 1, photo_url: 'https://drive.google.com/drive/folders/1fLjNwj_x-YAYhVcgA5636H5FfKlUtDPd?usp=sharing' },
  { name: 'Marwan Kouyate', jersey_number: 17, photo_url: 'https://drive.google.com/drive/folders/1UWc_EicKcpEvAaAYfSYyn2y1RfbUYhXH?usp=sharing' },
  { name: 'Saidjamolkhon Saidakbarov', jersey_number: 20, photo_url: 'https://drive.google.com/drive/folders/16BnyeqKEpij0F7-eeS5zvGV6BVJw0lIQ?usp=sharing' },
  { name: 'Stefan Gruskiewicz', jersey_number: 15, photo_url: 'https://drive.google.com/drive/folders/13Az4IWIIxPPfw5WDzw62ScrR5CpyN0Pd?usp=sharing' },
  { name: 'Samuel Winkel', jersey_number: 14, photo_url: 'https://drive.google.com/drive/folders/1KAX5rAtbi7SPVogbGxoZO50qeegu5N0I?usp=sharing' },
  { name: 'Patrick Revel', jersey_number: 16, photo_url: 'https://drive.google.com/drive/folders/1fpaTRYmapE3WHoHz4-uSpFt2c3WF9cPo?usp=sharing' },
  { name: 'Karan Rao', jersey_number: 18, photo_url: 'https://drive.google.com/drive/folders/1smWyygH-76OjbFi-Bho22aTVona7_q_f?usp=sharing' },
  { name: 'Santiago Pando', jersey_number: 8, photo_url: 'https://drive.google.com/drive/folders/1X0h60Wy1wVaIY5KarU-VCQY5kOuSBU6L?usp=sharing' },
  { name: 'Abdullah Sermelwall', jersey_number: 8, photo_url: null },
  { name: 'Zaid Miller', jersey_number: 18, photo_url: null },
  { name: 'William Way', jersey_number: 5, photo_url: 'https://drive.google.com/drive/folders/1WqKAI5n0M-iRwbUNprSYJV1QukppsEwv?usp=sharing' },
  { name: 'Dae Yang Townsend', jersey_number: 9, photo_url: 'https://drive.google.com/drive/folders/1GDjDuCxYjVFXT3uuuYWh-wmFm7TI4i6O?usp=sharing' },
  { name: 'Jordan Gisa Mugisha', jersey_number: 21, photo_url: 'https://drive.google.com/drive/folders/1UxAY5mne_ImImO5qbfAOjZQg6L9yikbg?usp=sharing' },
  { name: 'Pete Byford', jersey_number: 24, photo_url: 'https://drive.google.com/drive/folders/189f2sI5pEkuxlpVE_iSeouzLxufdCBgk?usp=sharing' },
  { name: 'Lucas Vinson', jersey_number: 12, photo_url: 'https://drive.google.com/drive/folders/1Ndid_8lqzGP6KiVCcVnUKcgaqEY_Upew?usp=sharing' },
]

async function updatePlayers() {
  console.log('Starting player updates...\n')

  for (const player of playerUpdates) {
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
      // Try with just last name for better matching
      const { data: playerByLastName } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .ilike('last_name', lastName)
        .single()

      if (!playerByLastName) {
        console.log(`❌ Player not found: ${player.name}`)
        continue
      }

      // Update the player
      const updateData: { jersey_number?: number; photo_url?: string } = {}
      if (player.jersey_number) updateData.jersey_number = player.jersey_number
      if (player.photo_url) updateData.photo_url = player.photo_url

      const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', playerByLastName.id)

      if (updateError) {
        console.log(`❌ Error updating ${player.name}: ${updateError.message}`)
      } else {
        console.log(`✓ Updated ${playerByLastName.first_name} ${playerByLastName.last_name} - Jersey #${player.jersey_number}`)
      }
    } else {
      // Update the player
      const updateData: { jersey_number?: number; photo_url?: string } = {}
      if (player.jersey_number) updateData.jersey_number = player.jersey_number
      if (player.photo_url) updateData.photo_url = player.photo_url

      const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', existingPlayer.id)

      if (updateError) {
        console.log(`❌ Error updating ${player.name}: ${updateError.message}`)
      } else {
        console.log(`✓ Updated ${existingPlayer.first_name} ${existingPlayer.last_name} - Jersey #${player.jersey_number}`)
      }
    }
  }

  console.log('\nDone!')
}

updatePlayers()
