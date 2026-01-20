#!/bin/bash

# Check deployment status for Warubi projects
# Usage: ./scripts/check-deploy.sh [project]
# Projects: staff, player, scout, exposure, all (default)

STAFF_URL="https://itp-staff-app.vercel.app"
PLAYER_URL="https://itp-player-app.vercel.app"
SCOUT_URL="https://warubi-scout-platform.vercel.app"
EXPOSURE_URL="https://exposureengine-v2.vercel.app"

check_site() {
  local name=$1
  local url=$2

  # Use curl to check if site is responding
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null)

  if [ "$status_code" = "200" ]; then
    echo "✅ $name: UP ($url)"
    return 0
  elif [ "$status_code" = "000" ]; then
    echo "❌ $name: UNREACHABLE ($url)"
    return 1
  else
    echo "⚠️  $name: HTTP $status_code ($url)"
    return 1
  fi
}

echo "🔍 Checking deployment status..."
echo ""

case "${1:-all}" in
  staff)
    check_site "ITP Staff App" "$STAFF_URL"
    ;;
  player)
    check_site "ITP Player App" "$PLAYER_URL"
    ;;
  scout)
    check_site "Scout Platform" "$SCOUT_URL"
    ;;
  exposure)
    check_site "ExposureEngine V2" "$EXPOSURE_URL"
    ;;
  all|*)
    check_site "ITP Staff App" "$STAFF_URL"
    check_site "ITP Player App" "$PLAYER_URL"
    check_site "Scout Platform" "$SCOUT_URL"
    check_site "ExposureEngine V2" "$EXPOSURE_URL"
    ;;
esac

echo ""
echo "📌 To view recent Vercel deployments:"
echo "   vercel ls --scope=warubisports"
