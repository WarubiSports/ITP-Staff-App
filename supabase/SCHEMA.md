# ITP Apps Database Schema

Supabase Project: `umblyhwumtadlvgccdwg`

## Core Tables (Created via Dashboard)

These tables were created before migrations were set up:

### `profiles`
User accounts linked to Supabase Auth.
- `id` UUID (PK, references auth.users)
- `email` TEXT
- `first_name`, `last_name` TEXT
- `role` TEXT (admin, staff, player)
- `created_at`, `updated_at` TIMESTAMPTZ

### `players`
Player profiles for ITP program.
- `id` UUID (PK)
- `player_id` TEXT (e.g., "ITP_001") - UNIQUE
- `user_id` UUID (references auth.users) - links to auth account
- `email` TEXT - required for Player App authentication
- `first_name`, `last_name` TEXT
- `status` TEXT (active, pending, alumni, cancelled)
- `date_of_birth` DATE
- `nationality` TEXT
- `positions` TEXT[]
- `phone` TEXT
- `photo_url` TEXT
- `cohort` TEXT
- `program_start_date`, `program_end_date` DATE
- `house_id` UUID (references houses)
- `room_number` TEXT
- `insurance_provider`, `insurance_number` TEXT
- `insurance_expiry` DATE
- `visa_status` TEXT
- `visa_expiry` DATE
- `whereabouts_status` TEXT
- `whereabouts_details` JSONB
- `emergency_contact_name`, `emergency_contact_phone` TEXT
- `notes` TEXT
- `created_at`, `updated_at` TIMESTAMPTZ

### `houses`
Housing units for players.
- `id` UUID (PK)
- `name` TEXT
- `address` TEXT
- `capacity` INTEGER
- `created_at`, `updated_at` TIMESTAMPTZ

### `events`
Calendar events.
- `id` UUID (PK)
- `title` TEXT
- `description` TEXT
- `date` DATE
- `start_time`, `end_time` TIMESTAMPTZ
- `type` TEXT (team_training, match, meeting, medical, etc.)
- `location` TEXT
- `all_day` BOOLEAN
- `created_at`, `updated_at` TIMESTAMPTZ

### `chores`
House chores assignments.
- `id` UUID (PK)
- `house_id` UUID (references houses)
- `player_id` UUID (references players)
- `title` TEXT
- `description` TEXT
- `due_date` DATE
- `status` TEXT (pending, completed)
- `points` INTEGER
- `created_at`, `updated_at` TIMESTAMPTZ

### `wellness_logs`
Daily player wellness check-ins.
- `id` UUID (PK)
- `player_id` UUID (references players)
- `date` DATE
- `sleep_hours` DECIMAL
- `sleep_quality` INTEGER (1-10)
- `energy_level` INTEGER (1-10)
- `soreness_level` INTEGER (1-10)
- `stress_level` INTEGER (1-10)
- `mood` INTEGER (1-10)
- `notes` TEXT
- `created_at` TIMESTAMPTZ

### `grocery_orders`
Player grocery orders.
- `id` UUID (PK)
- `player_id` UUID (references players)
- `status` TEXT (pending, approved, delivered)
- `total_amount` DECIMAL
- `notes` TEXT
- `created_at`, `updated_at` TIMESTAMPTZ

### `grocery_items`
Items in grocery orders.
- `id` UUID (PK)
- `order_id` UUID (references grocery_orders)
- `name` TEXT
- `quantity` INTEGER
- `price` DECIMAL
- `created_at` TIMESTAMPTZ

---

## Migration-Created Tables

### `wellpass_memberships` (001)
Gym membership tracking.

### `medical_appointments` (001)
Medical appointment scheduling.
- `appointment_time` TIME - just time, not timestamp

### `insurance_claims` (001)
Insurance claim tracking.

### `player_trials` (001)
External trial tracking for current players.

### `training_attendance` (006)
Training session attendance.

### `player_documents` (007)
Document storage for players.

### `tasks` (008)
Staff task management.

### `task_assignees` (008)
Task assignments to staff/players.

### `event_attendees` (010)
Event attendance tracking.

### `rooms` (012)
Room allocation within houses.

### `trial_prospects` (014)
Prospective players on trial.

### `approved_staff` (024)
Whitelist of approved staff emails.

### `staff_profiles` (025)
Extended staff profile data.

### `staff_invites` (026)
Staff invitation tokens.

### `bug_reports` (029)
Bug report submissions.

### Scout Tables (030)
- `scouts` - Scout profiles
- `scout_prospects` - Scouted players
- `scout_outreach_logs` - Contact history
- `scouting_events` - ID Days, showcases
- `scout_event_attendees` - Event attendance
- `scout_experience` - Scout work history
- `scout_certifications` - Scout certifications

---

## Key Relationships

```
profiles (auth users)
    └── players.user_id (linked via email on first login)

houses
    ├── players.house_id
    ├── rooms.house_id
    └── chores.house_id

players
    ├── wellness_logs.player_id
    ├── grocery_orders.player_id
    ├── medical_appointments.player_id
    ├── player_documents.player_id
    ├── player_trials.player_id
    ├── training_attendance.player_id
    ├── chores.player_id
    └── event_attendees.player_id

events
    └── event_attendees.event_id

grocery_orders
    └── grocery_items.order_id
```

---

## Notes

1. **Player Authentication Flow**:
   - Staff creates player with email in Staff App
   - Player uses magic link to login to Player App
   - On first login, player record is linked via email match

2. **Status Values**:
   - Players: active, pending, alumni, cancelled
   - Tasks: pending, in_progress, completed
   - Events: scheduled, completed, cancelled

3. **Soft Delete Pattern**:
   - Players use `status: 'cancelled'` for soft delete
   - Hard delete removes record completely
