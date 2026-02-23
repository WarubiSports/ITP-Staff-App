import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:max.bisinger@warubi-sports.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface EventPayload {
  change_type: "created" | "updated" | "deleted";
  event_id: string;
  title: string;
  type: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
}

function buildNotification(event: EventPayload) {
  const typeLabels: Record<string, string> = {
    team_training: "Team Training",
    individual_training: "Individual Training",
    gym: "Gym Session",
    recovery: "Recovery",
    match: "Match",
    tournament: "Tournament",
    school: "School",
    language_class: "Language Class",
    airport_pickup: "Airport Pickup",
    team_activity: "Team Activity",
    meeting: "Meeting",
    medical: "Medical",
    training: "Training",
    other: "Event",
  };

  const label = typeLabels[event.type] || "Event";
  const date = event.date ? new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";

  switch (event.change_type) {
    case "created":
      return {
        title: `New ${label}`,
        body: `${event.title}${date ? ` — ${date}` : ""}${event.location ? ` @ ${event.location}` : ""}`,
        tag: `event-${event.event_id}`,
        data: { url: "/calendar" },
      };
    case "updated":
      return {
        title: `${label} Updated`,
        body: `${event.title}${date ? ` — ${date}` : ""}${event.location ? ` @ ${event.location}` : ""}`,
        tag: `event-${event.event_id}`,
        data: { url: "/calendar" },
      };
    case "deleted":
      return {
        title: `${label} Cancelled`,
        body: `${event.title}${date ? ` — ${date}` : ""} has been cancelled`,
        tag: `event-${event.event_id}`,
        data: { url: "/calendar" },
      };
  }
}

serve(async (req: Request) => {
  // Verify the request is from our service role
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event: EventPayload = await req.json();
  const notification = buildNotification(event);

  // Get all push subscriptions
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("Failed to fetch subscriptions:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify(notification);
  const expiredIds: string[] = [];
  let sent = 0;

  // Send to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number };
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          // Subscription expired or invalid — mark for deletion
          expiredIds.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.endpoint}:`, err);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
    console.log(`Cleaned up ${expiredIds.length} expired subscriptions`);
  }

  return new Response(
    JSON.stringify({ sent, expired: expiredIds.length, total: subscriptions.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
