#!/bin/bash
# verify5 — member flows: savings+deposit, shares+buy, investments
cd /home/z/my-project

echo "================================================"
echo "  UNISSACO VERIFY 5 (member flows)"
echo "================================================"

pkill -f "next/dist/bin/next" 2>/dev/null; sleep 1
echo "[0] Starting dev server..."
bun node_modules/next/dist/bin/next dev -p 3000 > dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 30); do
  curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1 && { echo "    ✓ ready"; break; }
  kill -0 $DEV_PID 2>/dev/null || exit 1
  sleep 1
done
trap 'agent-browser close 2>/dev/null; kill $DEV_PID 2>/dev/null' EXIT

echo ""
echo "=== Login as member (Grace) ==="
agent-browser open http://127.0.0.1:3000 --timeout 30000 > /dev/null 2>&1
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
agent-browser find text "Member login" click 2>/dev/null; sleep 2
SNAP=$(agent-browser snapshot -i 2>/dev/null)
E=$(echo "$SNAP" | grep -i 'Email address' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
P=$(echo "$SNAP" | grep -i 'textbox "Password' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
L=$(echo "$SNAP" | grep -i 'button "Log in"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
agent-browser fill "$E" "grace.banda@students.unissacco.ac.mw" 2>/dev/null
agent-browser fill "$P" "Member@123" 2>/dev/null
agent-browser click "$L" 2>/dev/null
sleep 5; agent-browser wait --load networkidle --timeout 20000 2>/dev/null; sleep 2
MB=$(agent-browser get text body 2>/dev/null | head -c 250)
echo "  dashboard: $(echo "$MB" | tr '\n' ' ' | head -c 200)"
if echo "$MB" | grep -qi "Hello\|Savings balance\|net worth"; then echo "  ✓ member dashboard"; else echo "  ✗ missing"; fi

echo ""
echo "=== Savings tab + deposit dialog ==="
agent-browser find text "Savings" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v5-savings.png 2>/dev/null
SV=$(agent-browser get text body 2>/dev/null)
echo "  savings sample: $(echo "$SV" | tr '\n' ' ' | head -c 200)"
if echo "$SV" | grep -qi "Current balance\|Transaction ledger\|Total deposits"; then echo "  ✓ Savings tab content rendered"; else echo "  ✗ Savings content missing"; fi
SNAP3=$(agent-browser snapshot -i 2>/dev/null)
DEP=$(echo "$SNAP3" | grep -i 'button "Deposit"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
echo "  deposit btn ref: $DEP"
if [ -n "$DEP" ]; then
  agent-browser click "$DEP" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v5-deposit.png 2>/dev/null
  DD=$(agent-browser get text body 2>/dev/null)
  if echo "$DD" | grep -qi "Make a deposit\|Payment method\|Confirm deposit"; then
    echo "  ✓✓ DEPOSIT DIALOG OPENED"
    # Fill amount and submit a real deposit
    SNAP4=$(agent-browser snapshot -i 2>/dev/null)
    AMT=$(echo "$SNAP4" | grep -iE 'Amount|textbox' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
    echo "  amount ref: $AMT"
    if [ -n "$AMT" ]; then
      agent-browser fill "$AMT" "5000" 2>/dev/null
      sleep 1
      # click Confirm deposit
      SNAP5=$(agent-browser snapshot -i 2>/dev/null)
      CONF=$(echo "$SNAP5" | grep -i 'Confirm deposit' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
      echo "  confirm ref: $CONF"
      if [ -n "$CONF" ]; then
        agent-browser click "$CONF" 2>/dev/null; sleep 3
        echo "  after deposit: $(agent-browser get text body 2>/dev/null | tr '\n' ' ' | head -c 150)"
        echo "  ✓ deposit submitted"
      fi
    fi
  else
    echo "  ✗ deposit dialog not opened"
    echo "  text: $(echo "$DD" | tr '\n' ' ' | head -c 200)"
  fi
fi

echo ""
echo "=== Shares tab + buy dialog ==="
sleep 1
agent-browser find text "Shares" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v5-shares.png 2>/dev/null
SH=$(agent-browser get text body 2>/dev/null)
echo "  shares sample: $(echo "$SH" | tr '\n' ' ' | head -c 200)"
if echo "$SH" | grep -qi "Shares held\|Share value\|Share ledger\|Why buy"; then echo "  ✓ Shares tab content"; else echo "  ✗ Shares content missing"; fi
SNAP6=$(agent-browser snapshot -i 2>/dev/null)
BUY=$(echo "$SNAP6" | grep -i 'button "Buy shares"' | grep -oE 'ref=[a-z]+[0-9]+' | head -1 | sed 's/ref=/@/')
echo "  buy btn ref: $BUY"
if [ -n "$BUY" ]; then
  agent-browser click "$BUY" 2>/dev/null; sleep 2
  agent-browser screenshot /tmp/v5-buyshares.png 2>/dev/null
  BD=$(agent-browser get text body 2>/dev/null)
  if echo "$BD" | grep -qi "Buy shares\|Number of shares\|Total cost\|Savings available"; then echo "  ✓✓ BUY SHARES DIALOG OPENED"; else echo "  ✗ buy dialog missing"; fi
fi

echo ""
echo "=== Investments tab ==="
agent-browser press Escape 2>/dev/null; sleep 1
agent-browser find text "Investments" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v5-investments.png 2>/dev/null
IV=$(agent-browser get text body 2>/dev/null | head -c 500)
echo "  investments sample: $(echo "$IV" | tr '\n' ' ' | head -c 250)"
if echo "$IV" | grep -qi "Bean Seed\|Poultry\|Capital deployed\|Treasury\|investments"; then echo "  ✓ Investments tab rendered"; else echo "  ✗ investments missing"; fi

echo ""
echo "=== Profile tab ==="
agent-browser find text "Profile" click 2>/dev/null; sleep 3
agent-browser screenshot /tmp/v5-profile.png 2>/dev/null
PF=$(agent-browser get text body 2>/dev/null | head -c 300)
if echo "$PF" | grep -qi "My Profile\|Personal information\|Membership details"; then echo "  ✓ Profile tab rendered"; else echo "  ✗ profile missing"; fi

echo ""
echo "=== Console errors ==="
FE=$(agent-browser errors 2>/dev/null | head -10)
if [ -n "$FE" ]; then echo "  ⚠ errors: $FE"; else echo "  ✓ no console errors"; fi

echo ""
echo "================================================"
echo "  VERIFY 5 COMPLETE"
echo "================================================"
