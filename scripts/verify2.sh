#!/bin/bash
# Focused re-verification: admin login + deposit dialog using ref-based interaction.
set -u
cd /home/z/my-project

echo "================================================"
echo "  UNISSACO FOCUSED RE-VERIFICATION"
echo "================================================"

# Start server
echo "[0] Starting dev server..."
pkill -f "next/dist/bin/next" 2>/dev/null; sleep 1
bun node_modules/next/dist/bin/next dev -p 3000 > dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 30); do
  curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1 && { echo "    ✓ ready"; break; }
  kill -0 $DEV_PID 2>/dev/null || { echo "    ✗ died"; exit 1; }
  sleep 1
done
trap 'agent-browser close 2>/dev/null; kill $DEV_PID 2>/dev/null' EXIT

echo ""
echo "=== TEST A: Admin login via ref-based fill ==="
agent-browser open http://127.0.0.1:3000 --timeout 30000 > /dev/null 2>&1
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
# Go to login view
agent-browser find text "Member login" click 2>/dev/null; sleep 2
echo "  snapshot of auth screen:"
agent-browser snapshot -i 2>/dev/null | grep -iE "textbox|email|password|button" | head -10
# Get refs for email + password + login button
SNAP=$(agent-browser snapshot -i 2>/dev/null)
EMAIL_REF=$(echo "$SNAP" | grep -i "email" | grep -oE "@e[0-9]+" | head -1)
PWD_REF=$(echo "$SNAP" | grep -i "password" | grep -oE "@e[0-9]+" | head -1)
LOGIN_REF=$(echo "$SNAP" | grep -iE "log in" | grep -oE "@e[0-9]+" | head -1)
echo "  email ref: $EMAIL_REF | pwd ref: $PWD_REF | login ref: $LOGIN_REF"
# Clear & fill admin creds explicitly
agent-browser fill "$EMAIL_REF" "admin@unissacco.ac.mw" 2>/dev/null
agent-browser fill "$PWD_REF" "Admin@123" 2>/dev/null
# verify what's actually in the fields
echo "  email field value: $(agent-browser get value "$EMAIL_REF" 2>/dev/null)"
echo "  pwd field value: $(agent-browser get value "$PWD_REF" 2>/dev/null)"
agent-browser click "$LOGIN_REF" 2>/dev/null
sleep 4
agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
agent-browser screenshot /tmp/v2-admin.png 2>/dev/null
A_BODY=$(agent-browser get text body 2>/dev/null | head -c 600)
echo "  post-login body (first 400):"
echo "$A_BODY" | head -c 400
echo ""
if echo "$A_BODY" | grep -qi "Admin Overview\|Total members\|Share capital\|Treasury"; then
  echo "  ✓✓ ADMIN DASHBOARD RENDERED"
else
  echo "  ✗ admin dashboard NOT rendered"
fi

echo ""
echo "=== TEST B: Admin Members tab + approve action ==="
agent-browser find text "Members" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v2-admin-members.png 2>/dev/null
MB=$(agent-browser get text body 2>/dev/null | head -c 500)
echo "  members tab (first 300): $(echo "$MB" | tr '\n' ' ' | head -c 300)"
if echo "$MB" | grep -qi "Tione\|Pending\|Approve\|Member Management"; then echo "  ✓ Members tab shows pending member"; else echo "  ⚠ Members tab content unclear"; fi

echo ""
echo "=== TEST C: Logout then member login + deposit dialog ==="
agent-browser find text "Log out" click 2>/dev/null; sleep 3
agent-browser wait --load networkidle --timeout 15000 2>/dev/null; sleep 1
agent-browser find text "Member login" click 2>/dev/null; sleep 2
SNAP2=$(agent-browser snapshot -i 2>/dev/null)
E2=$(echo "$SNAP2" | grep -i "email" | grep -oE "@e[0-9]+" | head -1)
P2=$(echo "$SNAP2" | grep -i "password" | grep -oE "@e[0-9]+" | head -1)
L2=$(echo "$SNAP2" | grep -iE "log in" | grep -oE "@e[0-9]+" | head -1)
agent-browser fill "$E2" "grace.banda@students.unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P2" "Member@123" 2>/dev/null
agent-browser click "$L2" 2>/dev/null
sleep 4; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
echo "  member logged in: $(agent-browser get text body 2>/dev/null | head -c 120)"
# Go to Savings tab
agent-browser find text "Savings" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v2-savings.png 2>/dev/null
SV=$(agent-browser get text body 2>/dev/null)
if echo "$SV" | grep -qi "Current balance\|Transaction ledger\|Make a deposit"; then echo "  ✓ Savings tab rendered with content"; else echo "  ✗ Savings tab content missing"; fi
# Click Deposit button (ref)
SNAP3=$(agent-browser snapshot -i 2>/dev/null)
DEP_REF=$(echo "$SNAP3" | grep -iE "deposit" | grep -oE "@e[0-9]+" | head -1)
echo "  deposit button ref: $DEP_REF"
if [ -n "$DEP_REF" ]; then
  agent-browser click "$DEP_REF" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v2-deposit-dialog.png 2>/dev/null
  DD=$(agent-browser get text body 2>/dev/null)
  if echo "$DD" | grep -qi "Make a deposit\|Payment method\|Confirm deposit"; then echo "  ✓✓ DEPOSIT DIALOG OPENED"; else echo "  ✗ deposit dialog not opened"; fi
  echo "  dialog text: $(echo "$DD" | tr '\n' ' ' | head -c 200)"
else
  echo "  ✗ no deposit button found"
fi

echo ""
echo "=== TEST D: Console errors final ==="
FE=$(agent-browser errors 2>/dev/null | head -10)
if [ -n "$FE" ]; then echo "  ⚠ errors: $FE"; else echo "  ✓ no console errors"; fi

echo ""
echo "================================================"
echo "  FOCUSED VERIFICATION COMPLETE"
echo "================================================"
