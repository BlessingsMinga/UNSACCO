#!/bin/bash
# verify4 — robust verification using jq to parse snapshot JSON for refs.
cd /home/z/my-project

echo "================================================"
echo "  UNISSACO VERIFY 4 (jq-based)"
echo "================================================"

pkill -f "next/dist/bin/next" 2>/dev/null; sleep 1
echo "[0] Starting dev server..."
bun node_modules/next/dist/bin/next dev -p 3000 > dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 30); do
  curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1 && { echo "    ✓ ready"; break; }
  kill -0 $DEV_PID 2>/dev/null || { echo "    ✗ died"; exit 1; }
  sleep 1
done
trap 'agent-browser close 2>/dev/null; kill $DEV_PID 2>/dev/null' EXIT

# Helper: find first ref whose name matches a regex (case-insensitive)
ref_by_name() {
  agent-browser snapshot -i --json 2>/dev/null | \
    jq -r --arg rx "$1" 'tostream | select(length==2) as [$p,$v] | select($p[-1]=="name") | select(($v|ascii_downcase|test($rx;"i"))) | ($p|join("."))' 2>/dev/null | head -1
}

# Helper: get the ref id (e.g. "e3") for a given name match
get_ref() {
  local rx="$1"
  local raw
  raw=$(agent-browser snapshot -i 2>/dev/null | grep -iE "$rx" | grep -oE 'ref=[a-z]+[0-9]+' | head -1)
  echo "@${raw#ref=}"
}

echo ""
echo "=== A: Admin login ==="
agent-browser open http://127.0.0.1:3000 --timeout 30000 > /dev/null 2>&1
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
agent-browser find text "Member login" click 2>/dev/null; sleep 2

# Get refs using simple grep on snapshot text (format: [ref=e3])
SNAP=$(agent-browser snapshot -i 2>/dev/null)
E=$(echo "$SNAP" | grep -i 'Email address' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
P=$(echo "$SNAP" | grep -i 'textbox "Password' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
L=$(echo "$SNAP" | grep -i 'button "Log in"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
echo "  refs → email:$E pwd:$P login:$L"

agent-browser fill "$E" "admin@unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P" "Admin@123" 2>/dev/null
sleep 1
echo "  email field now: $(agent-browser get value "$E" 2>/dev/null)"
echo "  pwd field now: $(agent-browser get value "$P" 2>/dev/null | head -c 20)"
agent-browser click "$L" 2>/dev/null
sleep 5; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
agent-browser screenshot /tmp/v4-admin.png 2>/dev/null
AB=$(agent-browser get text body 2>/dev/null)
echo "  body sample: $(echo "$AB" | tr '\n' ' ' | head -c 300)"
if echo "$AB" | grep -qi "Admin Overview\|Total members\|Share capital"; then
  echo "  ✓✓ ADMIN DASHBOARD RENDERED"
else
  echo "  ✗ admin dashboard NOT rendered"
fi

echo ""
echo "=== B: Admin Members tab + approve ==="
agent-browser find text "Members" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v4-admin-members.png 2>/dev/null
MB=$(agent-browser get text body 2>/dev/null)
echo "  members sample: $(echo "$MB" | tr '\n' ' ' | head -c 250)"
if echo "$MB" | grep -qi "Tione\|Member Management"; then echo "  ✓ Members tab works"; else echo "  ⚠ unsure"; fi
SNAPM=$(agent-browser snapshot -i 2>/dev/null)
APR=$(echo "$SNAPM" | grep -i 'Approve' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
if [ -n "$APR" ]; then
  echo "  approve ref: $APR"
  agent-browser click "$APR" 2>/dev/null; sleep 3
  echo "  after approve: $(agent-browser get text body 2>/dev/null | tr '\n' ' ' | head -c 150)"
else
  echo "  (no Approve button — may already be approved)"
fi

echo ""
echo "=== C: Logout → member login ==="
agent-browser find text "Log out" click 2>/dev/null; sleep 4
agent-browser wait --load networkidle --timeout 15000 2>/dev/null; sleep 1
agent-browser find text "Member login" click 2>/dev/null; sleep 2
SNAP2=$(agent-browser snapshot -i 2>/dev/null)
E2=$(echo "$SNAP2" | grep -i 'Email address' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
P2=$(echo "$SNAP2" | grep -i 'textbox "Password' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
L2=$(echo "$SNAP2" | grep -i 'button "Log in"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
agent-browser fill "$E2" "grace.banda@students.unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P2" "Member@123" 2>/dev/null
agent-browser click "$L2" 2>/dev/null
sleep 5; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
MB2=$(agent-browser get text body 2>/dev/null | head -c 200)
echo "  member dashboard: $(echo "$MB2" | tr '\n' ' ' | head -c 150)"
if echo "$MB2" | grep -qi "Hello\|Savings balance\|net worth"; then echo "  ✓ member dashboard"; else echo "  ✗ missing"; fi

echo ""
echo "=== D: Savings tab + deposit dialog ==="
agent-browser find text "Savings" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v4-savings.png 2>/dev/null
SV=$(agent-browser get text body 2>/dev/null)
if echo "$SV" | grep -qi "Current balance\|Transaction ledger"; then echo "  ✓ Savings tab content"; else echo "  ✗ missing"; fi
SNAP3=$(agent-browser snapshot -i 2>/dev/null)
DEP=$(echo "$SNAP3" | grep -i 'button "Deposit"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
echo "  deposit btn ref: $DEP"
if [ -n "$DEP" ]; then
  agent-browser click "$DEP" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v4-deposit.png 2>/dev/null
  DD=$(agent-browser get text body 2>/dev/null)
  if echo "$DD" | grep -qi "Make a deposit\|Payment method\|Confirm deposit"; then
    echo "  ✓✓ DEPOSIT DIALOG OPENED"
  else
    echo "  ✗ deposit dialog not opened"
    echo "  dialog text: $(echo "$DD" | tr '\n' ' ' | head -c 200)"
  fi
fi

echo ""
echo "=== E: Shares buy dialog ==="
agent-browser press Escape 2>/dev/null; sleep 1
agent-browser find text "Shares" click 2>/dev/null; sleep 3
SNAP5=$(agent-browser snapshot -i 2>/dev/null)
BUY=$(echo "$SNAP5" | grep -i 'button "Buy shares"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
if [ -n "$BUY" ]; then
  agent-browser click "$BUY" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v4-buyshares.png 2>/dev/null
  BD=$(agent-browser get text body 2>/dev/null)
  if echo "$BD" | grep -qi "Buy shares\|Number of shares\|Total cost"; then echo "  ✓✓ BUY SHARES DIALOG OPENED"; else echo "  ✗ buy dialog missing"; fi
fi

echo ""
echo "=== F: Reports statement ==="
agent-browser press Escape 2>/dev/null; sleep 1
agent-browser find text "Reports" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v4-reports.png 2>/dev/null
RP=$(agent-browser get text body 2>/dev/null | head -c 400)
if echo "$RP" | grep -qi "Member Statement\|Net worth\|UNISSACO"; then echo "  ✓ Reports statement rendered"; else echo "  ✗ reports missing"; fi

echo ""
echo "=== G: Investments tab ==="
agent-browser find text "Investments" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v4-investments.png 2>/dev/null
IV=$(agent-browser get text body 2>/dev/null | head -c 400)
if echo "$IV" | grep -qi "Bean Seed\|Poultry\|Capital deployed\|Treasury"; then echo "  ✓ Investments tab rendered"; else echo "  ✗ investments missing"; fi

echo ""
echo "=== H: Console errors ==="
FE=$(agent-browser errors 2>/dev/null | head -10)
if [ -n "$FE" ]; then echo "  ⚠ errors: $FE"; else echo "  ✓ no console errors"; fi

echo ""
echo "================================================"
echo "  VERIFY 4 COMPLETE"
echo "================================================"
