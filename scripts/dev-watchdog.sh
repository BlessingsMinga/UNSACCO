#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next/dist/bin/next dev" > /dev/null 2>&1; then
    bun node_modules/next/dist/bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    NPID=$!
    for i in $(seq 1 25); do
      curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1 && break
      kill -0 $NPID 2>/dev/null || break
      sleep 1
    done
  fi
  sleep 3
done
