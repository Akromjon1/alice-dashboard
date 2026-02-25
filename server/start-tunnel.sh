#!/bin/bash
# Auto quick tunnel — starts cloudflared, captures URL, saves to file
# Usage: ./start-tunnel.sh

TUNNEL_LOG="/tmp/cloudflared-api.log"
URL_FILE="/Users/akrom/.openclaw/workspace/data/tunnel-url.txt"

# Kill existing tunnel
pkill -f "cloudflared tunnel --url" 2>/dev/null
sleep 1

# Start new quick tunnel
nohup cloudflared tunnel --url http://127.0.0.1:3456 > "$TUNNEL_LOG" 2>&1 &
echo "⏳ Starting tunnel..."

# Wait for URL to appear (max 15 seconds)
for i in $(seq 1 15); do
  URL=$(grep -o 'https://[a-z-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1)
  if [ -n "$URL" ]; then
    echo "$URL" > "$URL_FILE"
    echo "✅ Tunnel ready: $URL"
    echo "📁 Saved to: $URL_FILE"
    exit 0
  fi
  sleep 1
done

echo "❌ Tunnel failed to start. Check $TUNNEL_LOG"
exit 1
