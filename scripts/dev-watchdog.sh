#!/bin/bash
# Watchdog: keeps the Next.js dev server alive.
cd /home/z/my-project
while true; do
  if ! pgrep -f "next/dist/bin/next dev" > /dev/null 2>&1; then
    echo "[$(date +%T)] starting dev server..." >> /tmp/dev-watchdog.log
    bun node_modules/next/dist/bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    DEV_PID=$!
    # wait for it to be ready (or die)
    for i in $(seq 1 30); do
      if curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1; then
        echo "[$(date +%T)] dev server ready (PID $DEV_PID)" >> /tmp/dev-watchdog.log
        break
      fi
      if ! kill -0 $DEV_PID 2>/dev/null; then
        echo "[$(date +%T)] dev server exited early" >> /tmp/dev-watchdog.log
        break
      fi
      sleep 1
    done
  fi
  sleep 5
done
