#!/bin/bash
# verify3 — correct ref extraction (token "ref=e3" → "@e3")
set -u
cd /home/z/my-project

extract_ref() { echo "$1" | grep -oP 'ref\Ke[0-9]+' | head -1 | sed 's/^/@/'; }

echo "================================================"
echo "  UNISSACO VERIFY 3 (ref-fixed)"
echo "================================================"

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
echo "=== A: Admin login ==="
agent-browser open http://127.0.0.1:3000 --timeout 30000 > /dev/null 2>&1
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
agent-browser find text "Member login" click 2>/dev/null; sleep 2
SNAP=$(agent-browser snapshot -i 2>/dev/null)
E=$(extract_ref "$(echo "$SNAP" | grep -i 'email address')")
P=$(extract_ref "$(echo "$SNAP" | grep -i 'textbox \"Password'')")
L=$(extract_ref "$(echo "$SNAP" | grep -iE 'button \"Log in\"')")
echo "  refs → email:$E pwd:$P login:$L"
agent-browser fill "$E" "admin@unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P" "Admin@123" 2>/dev/null
echo "  email now: $(agent-browser get value "$E" 2>/dev/null)"
agent-browser click "$L" 2>/dev/null
sleep 4; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
agent-browser screenshot /tmp/v3-admin.png 2>/dev/null
AB=$(agent-browser get text body 2>/dev/null | head -c 700)
echo "  body (first 350): $(echo "$AB" | tr '\n' ' ' | head -c 350)"
if echo "$AB" | grep -qi "Admin Overview\|Total members\|Share capital\|Total assets"; then
  echo "  ✓✓ ADMIN DASHBOARD RENDERED"
else
  echo "  ✗ admin dashboard NOT rendered"
fi

echo ""
echo "=== B: Admin Members tab (find pending + approve) ==="
agent-browser find text "Members" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v3-admin-members.png 2>/dev/null
MB=$(agent-browser get text body 2>/dev/null | head -c 600)
echo "  members (first 300): $(echo "$MB" | tr '\n' ' ' | head -c 300)"
if echo "$MB" | grep -qi "Tione\|Member Management\|Approve"; then echo "  ✓ Members tab works (pending member visible)"; else echo "  ⚠ unsure"; fi
# Try approving Tione
SNAPM=$(agent-browser snapshot -i 2>/dev/null)
APPROVE_REF=$(extract_ref "$(echo "$SNAPM" | grep -i 'Approve' | head -1)")
if [ -n "$APPROVE_REF" ]; then
  echo "  approve ref: $APPROVE_REF — clicking..."
  agent-browser click "$APPROVE_REF" 2>/dev/null; sleep 3
  AB2=$(agent-browser get text body 2>/dev/null | head -c 300)
  echo "  after approve (first 200): $(echo "$AB2" | tr '\n' ' ' | head -c 200)"
  if echo "$AB2" | grep -qi "status updated\|ACTIVE"; then echo "  ✓ approve action triggered"; fi
else
  echo "  (no Approve button ref found — maybe already approved or none visible)"
fi

echo ""
echo "=== C: Logout → member login → deposit dialog ==="
agent-browser find text "Log out" click 2>/dev/null; sleep 3
agent-browser wait --load networkidle --timeout 15000 2>/dev/null; sleep 1
agent-browser find text "Member login" click 2>/dev/null; sleep 2
SNAP2=$(agent-browser snapshot -i 2>/dev/null)
E2=$(extract_ref "$(echo "$SNAP2" | grep -i 'email address')")
P2=$(extract_ref "$(echo "$SNAP2" | grep -i 'textbox \"Password'')")
L2=$(extract_ref "$(echo "$SNAP2" | grep -iE 'button \"Log in\"')")
agent-browser fill "$E2" "grace.banda@students.unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P2" "Member@123" 2>/dev/null
agent-browser click "$L2" 2>/dev/null
sleep 4; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
MB2=$(agent-browser get text body 2>/dev/null | head -c 200)
echo "  member dashboard: $(echo "$MB2" | tr '\n' ' ' | head -c 150)"
if echo "$MB2" | grep -qi "Hello\|Savings balance\|net worth"; then echo "  ✓ member dashboard"; else echo "  ✗ member dashboard missing"; fi
# Savings tab
agent-browser find text "Savings" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v3-savings.png 2>/dev/null
SV=$(agent-browser get text body 2>/dev/null)
if echo "$SV" | grep -qi "Current balance\|Transaction ledger"; then echo "  ✓ Savings tab content"; else echo "  ✗ Savings tab missing"; fi
# Deposit dialog
SNAP3=$(agent-browser snapshot -i 2>/dev/null)
DEP=$(extract_ref "$(echo "$SNAP3" | grep -iE 'button \"Deposit\"' | head -1)")
echo "  deposit button ref: $DEP"
if [ -n "$DEP" ]; then
  agent-browser click "$DEP" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v3-deposit.png 2>/dev/null
  DD=$(agent-browser get text body 2>/dev/null)
  if echo "$DD" | grep -qi "Make a deposit\|Payment method\|Confirm deposit"; then
    echo "  ✓✓ DEPOSIT DIALOG OPENED"
    # Try filling amount
    SNAP4=$(agent-browser snapshot -i 2>/dev/null)
    AMT=$(extract_ref "$(echo "$SNAP4" | grep -iE 'textbox' | head -1)")
    echo "  amount field ref: $AMT"
    agent-browser fill "$AMT" "5000" 2>/dev/null
    echo "  amount value: $(agent-browser get value "$AMT" 2>/dev/null)"
  else
    echo "  ✗ deposit dialog not opened"
  fi
fi

echo ""
echo "=== D: Shares buy dialog ==="
agent-browser press Escape 2>/dev/null; sleep 1
agent-browser find text "Shares" click 2>/dev/null; sleep 3
SNAP5=$(agent-browser snapshot -i 2>/dev/null)
BUY=$(extract_ref "$(echo "$SNAP5" | grep -iE 'button \"Buy shares\"' | head -1)")
if [ -n "$BUY" ]; then
  agent-browser click "$BUY" 2>/dev/null; sleep 2
  BD=$(agent-browser get text body 2>/dev/null)
  if echo "$BD" | grep -qi "Buy shares\|Number of shares\|Total cost"; then echo "  ✓✓ BUY SHARES DIALOG OPENED"; else echo "  ✗ buy dialog missing"; fi
  agent-browser screenshot /tmp/v3-buyshares.png 2>/dev/null
fi

echo ""
echo "=== E: Reports statement ==="
agent-browser press Escape 2>/dev/null; sleep 1
agent-browser find text "Reports" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v3-reports.png 2>/dev/null
RP=$(agent-browser get text body 2>/dev/null | head -c 400)
if echo "$RP" | grep -qi "Member Statement\|Net worth\|Savings balance"; then echo "  ✓ Reports statement rendered"; else echo "  ✗ reports missing"; fi

echo ""
echo "=== F: Console errors ==="
FE=$(agent-browser errors 2>/dev/null | head -10)
if [ -n "$FE" ]; then echo "  ⚠ errors: $FE"; else echo "  ✓ no console errors"; fi

echo ""
echo "================================================"
echo "  VERIFY 3 COMPLETE"
echo "================================================"
