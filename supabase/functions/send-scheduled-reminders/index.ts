import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") || "mailto:max.bisinger@warubi-sports.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---------------------------------------------------------------------------
// Timezone helpers (Europe/Berlin)
// ---------------------------------------------------------------------------

function getBerlinContext() {
  const now = new Date();

  // Berlin date as YYYY-MM-DD
  const berlinDate = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });

  // Berlin hour (0-23)
  const berlinHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );

  // UTC offset for Berlin right now (in ms)
  const utcRef = new Date(
    now.toLocaleString("en-US", { timeZone: "UTC" })
  );
  const berlinRef = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Berlin" })
  );
  const offsetMs = berlinRef.getTime() - utcRef.getTime();

  // Convert a Berlin YYYY-MM-DD midnight to UTC ISO string
  const midnightUtc = (dateStr: string) =>
    new Date(
      new Date(`${dateStr}T00:00:00Z`).getTime() - offsetMs
    ).toISOString();

  const todayUtcStart = midnightUtc(berlinDate);

  // Tomorrow Berlin date
  const tmrw = new Date(now.getTime() + 86_400_000);
  const tomorrowDate = tmrw.toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  const tomorrowUtcStart = midnightUtc(tomorrowDate);

  // Day after tomorrow
  const dayAfter = new Date(now.getTime() + 2 * 86_400_000);
  const dayAfterDate = dayAfter.toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  const dayAfterUtcStart = midnightUtc(dayAfterDate);

  return {
    berlinDate,
    berlinHour,
    tomorrowDate,
    todayUtcStart,
    tomorrowUtcStart,
    dayAfterUtcStart,
    now,
  };
}

function formatTimeBerlin(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PushSub {
  id: string;
  player_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Notif {
  playerId: string;
  type: string;
  referenceId: string;
  title: string;
  body: string;
  tag: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Auth check — same as notify-event-change
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ctx = getBerlinContext();
  const hour = ctx.berlinHour;

  // -----------------------------------------------------------------------
  // 1. Fetch all push subscriptions grouped by player_id
  // -----------------------------------------------------------------------
  const { data: allSubs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, player_id, endpoint, p256dh, auth");

  if (subsErr || !allSubs || allSubs.length === 0) {
    return json({
      sent: 0,
      reason: subsErr ? "fetch_error" : "no_subscriptions",
    });
  }

  const subsByPlayer = new Map<string, PushSub[]>();
  for (const sub of allSubs as PushSub[]) {
    const list = subsByPlayer.get(sub.player_id) || [];
    list.push(sub);
    subsByPlayer.set(sub.player_id, list);
  }

  const playerIds = [...subsByPlayer.keys()];

  // -----------------------------------------------------------------------
  // 2. Fetch today's notification_log for dedup
  // -----------------------------------------------------------------------
  const { data: sentToday } = await supabase
    .from("notification_log")
    .select("player_id, notification_type, reference_id")
    .eq("sent_date", ctx.berlinDate);

  const sentSet = new Set(
    (sentToday || []).map(
      (r: { player_id: string; notification_type: string; reference_id: string }) =>
        `${r.player_id}:${r.notification_type}:${r.reference_id}`
    )
  );

  const wasSent = (pid: string, type: string, ref: string) =>
    sentSet.has(`${pid}:${type}:${ref}`);

  // -----------------------------------------------------------------------
  // 3. Build notification list based on current time window
  // -----------------------------------------------------------------------
  const notifications: Notif[] = [];

  // --- Event tomorrow (6-9 PM Berlin) ---
  if (hour >= 18 && hour < 21) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, type, start_time, location")
      .gte("start_time", ctx.tomorrowUtcStart)
      .lt("start_time", ctx.dayAfterUtcStart);

    if (events) {
      for (const evt of events) {
        const time = formatTimeBerlin(evt.start_time);
        for (const pid of playerIds) {
          if (!wasSent(pid, "event_tomorrow", evt.id)) {
            notifications.push({
              playerId: pid,
              type: "event_tomorrow",
              referenceId: evt.id,
              title: "Tomorrow's Schedule",
              body: `${evt.title} at ${time}${evt.location ? ` — ${evt.location}` : ""}`,
              tag: `event-tomorrow-${evt.id}`,
              url: "/calendar",
            });
          }
        }
      }
    }
  }

  // --- Event today (7-9 AM Berlin) ---
  if (hour >= 7 && hour < 9) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, type, start_time, location")
      .gte("start_time", ctx.todayUtcStart)
      .lt("start_time", ctx.tomorrowUtcStart);

    if (events) {
      for (const evt of events) {
        const time = formatTimeBerlin(evt.start_time);
        for (const pid of playerIds) {
          if (!wasSent(pid, "event_today", evt.id)) {
            notifications.push({
              playerId: pid,
              type: "event_today",
              referenceId: evt.id,
              title: "Today's Schedule",
              body: `${evt.title} at ${time}${evt.location ? ` — ${evt.location}` : ""}`,
              tag: `event-today-${evt.id}`,
              url: "/calendar",
            });
          }
        }
      }
    }
  }

  // --- Event starting soon (any time, 45-75 min window) ---
  {
    const soonStart = new Date(ctx.now.getTime() + 45 * 60_000).toISOString();
    const soonEnd = new Date(ctx.now.getTime() + 75 * 60_000).toISOString();

    const { data: events } = await supabase
      .from("events")
      .select("id, title, type, start_time, location")
      .gte("start_time", soonStart)
      .lte("start_time", soonEnd);

    if (events) {
      for (const evt of events) {
        for (const pid of playerIds) {
          if (!wasSent(pid, "event_soon", evt.id)) {
            notifications.push({
              playerId: pid,
              type: "event_soon",
              referenceId: evt.id,
              title: "Starting Soon",
              body: `${evt.title} in ~1 hour${evt.location ? ` — ${evt.location}` : ""}`,
              tag: `event-soon-${evt.id}`,
              url: "/calendar",
            });
          }
        }
      }
    }
  }

  // --- Chore overdue + due today (8-10 AM Berlin) ---
  if (hour >= 8 && hour < 10) {
    // Overdue: deadline < today start AND still pending
    const { data: overdue } = await supabase
      .from("chores")
      .select("id, title, assigned_to")
      .eq("status", "pending")
      .lt("deadline", ctx.todayUtcStart)
      .not("assigned_to", "is", null);

    if (overdue) {
      for (const chore of overdue) {
        if (
          subsByPlayer.has(chore.assigned_to) &&
          !wasSent(chore.assigned_to, "chore_overdue", chore.id)
        ) {
          notifications.push({
            playerId: chore.assigned_to,
            type: "chore_overdue",
            referenceId: chore.id,
            title: "Chore Overdue",
            body: `"${chore.title}" is past due — complete it now`,
            tag: `chore-overdue-${chore.id}`,
            url: "/chores",
          });
        }
      }
    }

    // Due today: deadline between today start and tomorrow start
    const { data: dueToday } = await supabase
      .from("chores")
      .select("id, title, assigned_to")
      .eq("status", "pending")
      .gte("deadline", ctx.todayUtcStart)
      .lt("deadline", ctx.tomorrowUtcStart)
      .not("assigned_to", "is", null);

    if (dueToday) {
      for (const chore of dueToday) {
        if (
          subsByPlayer.has(chore.assigned_to) &&
          !wasSent(chore.assigned_to, "chore_due", chore.id)
        ) {
          notifications.push({
            playerId: chore.assigned_to,
            type: "chore_due",
            referenceId: chore.id,
            title: "Chore Due Today",
            body: `"${chore.title}" — due today`,
            tag: `chore-due-${chore.id}`,
            url: "/chores",
          });
        }
      }
    }
  }

  // --- Wellness check-in (8-10 AM or 6-8 PM Berlin) ---
  if ((hour >= 8 && hour < 10) || (hour >= 18 && hour < 20)) {
    // wellness_logs.date is a DATE column — compare directly with Berlin date
    const { data: todayLogs } = await supabase
      .from("wellness_logs")
      .select("player_id")
      .eq("date", ctx.berlinDate)
      .in("player_id", playerIds);

    const logged = new Set((todayLogs || []).map((l: { player_id: string }) => l.player_id));

    for (const pid of playerIds) {
      if (!logged.has(pid) && !wasSent(pid, "wellness_reminder", "")) {
        notifications.push({
          playerId: pid,
          type: "wellness_reminder",
          referenceId: "",
          title: "Wellness Check-In",
          body: "How are you feeling today? Log your wellness.",
          tag: "wellness-reminder",
          url: "/wellness",
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // 4. Send push notifications
  // -----------------------------------------------------------------------
  const expiredIds: string[] = [];
  let sent = 0;

  for (const notif of notifications) {
    const subs = subsByPlayer.get(notif.playerId);
    if (!subs) continue;

    const payload = JSON.stringify({
      title: notif.title,
      body: notif.body,
      tag: notif.tag,
      data: { url: notif.url },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number };
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.endpoint}:`, err);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 5. Log sent notifications (dedup for next run)
  // -----------------------------------------------------------------------
  if (notifications.length > 0) {
    const logEntries = notifications.map((n) => ({
      player_id: n.playerId,
      notification_type: n.type,
      reference_id: n.referenceId,
      sent_date: ctx.berlinDate,
    }));

    const { error: logErr } = await supabase
      .from("notification_log")
      .insert(logEntries);

    if (logErr) {
      console.warn("Log insert warning:", logErr.message);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Cleanup: expired subs + old log entries
  // -----------------------------------------------------------------------
  if (expiredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
    console.log(`Cleaned up ${expiredIds.length} expired subscriptions`);
  }

  // Delete log entries older than 7 days
  const weekAgo = new Date(ctx.now.getTime() - 7 * 86_400_000);
  const weekAgoStr = weekAgo.toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  await supabase
    .from("notification_log")
    .delete()
    .lt("sent_date", weekAgoStr);

  return json({
    sent,
    expired: expiredIds.length,
    notifications: notifications.length,
    hour,
  });
});

function json(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
