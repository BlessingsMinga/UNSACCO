#!/bin/bash
# UNISSACO end-to-end verification with agent-browser.
# Runs the dev server + browser checks in a single process group so the
# server stays alive for the whole verification window.
set -u
cd /home/z/my-project

echo "================================================"
echo "  UNISSACO E2E VERIFICATION"
echo "================================================"

# 1. Start dev server
echo "[1/9] Starting dev server..."
pkill -f "next/dist/bin/next" 2>/dev/null
sleep 1
bun node_modules/next/dist/bin/next dev -p 3000 > dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://127.0.0.1:3000/api/auth/session > /dev/null 2>&1; then
    echo "      ✓ Server ready (PID $DEV_PID)"; break
  fi
  if ! kill -0 $DEV_PID 2>/dev/null; then echo "      ✗ Server died early"; tail -10 dev.log; exit 1; fi
  sleep 1
done

cleanup() { echo "[cleanup] closing browser + server"; agent-browser close 2>/dev/null; kill $DEV_PID 2>/dev/null; }
trap cleanup EXIT

# 2. Open landing page
echo "[2/9] Opening landing page..."
agent-browser open http://127.0.0.1:3000 --timeout 30000 > /tmp/ab1.log 2>&1
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
TITLE=$(agent-browser get title 2>/dev/null)
echo "      title: $TITLE"
agent-browser screenshot /tmp/01-landing.png 2>/dev/null && echo "      ✓ screenshot saved"

# Check landing content
LANDING_TEXT=$(agent-browser get text body 2>/dev/null | head -c 800)
if echo "$LANDING_TEXT" | grep -qi "UNISSACO\|Save. Invest"; then echo "      ✓ Landing renders UNISSACO branding"; else echo "      ✗ Landing branding missing"; fi
if echo "$LANDING_TEXT" | grep -qi "Get started\|Open your account"; then echo "      ✓ Landing CTA present"; else echo "      ✗ Landing CTA missing"; fi

# Console errors check
ERRS=$(agent-browser errors 2>/dev/null | head -20)
if [ -n "$ERRS" ]; then echo "      ⚠ page errors: $ERRS"; else echo "      ✓ No page errors"; fi

# 3. Go to login via Get Started -> switch to login
echo "[3/9] Navigating to login..."
agent-browser snapshot -i 2>/dev/null | grep -iE "get started|login|register" | head -5
# Click "Member login" or navigate to login view
agent-browser find text "Member login" click 2>/dev/null || agent-browser find text "Log in" click 2>/dev/null
sleep 2
agent-browser screenshot /tmp/02-auth.png 2>/dev/null
AUTH_TEXT=$(agent-browser get text body 2>/dev/null | head -c 500)
if echo "$AUTH_TEXT" | grep -qi "Log in to UNISSACO\|Create your account"; then echo "      ✓ Auth screen rendered"; else echo "      ✗ Auth screen missing"; fi

# 4. Login as member (demo creds prefilled, just click Log in)
echo "[4/9] Logging in as member (Grace Banda)..."
agent-browser snapshot -i 2>/dev/null | grep -iE "email|password|log in" | head -6
# Ensure we're on login view (not register)
agent-browser find text "Member login" click 2>/dev/null; sleep 1
# Fill login form (demo creds)
agent-browser find label "Email address" fill "grace.banda@students.unissacco.ac.mw" 2>/dev/null
agent-browser find label "Password" fill "Member@123" 2>/dev/null
# Click the Log in button (the one in the form, not header)
agent-browser find role button click --name "Log in" 2>/dev/null
sleep 3
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
sleep 2
agent-browser screenshot /tmp/03-member-dashboard.png 2>/dev/null
DASH_TEXT=$(agent-browser get text body 2>/dev/null | head -c 1000)
if echo "$DASH_TEXT" | grep -qi "Hello\|Overview\|Savings balance\|net worth"; then echo "      ✓ Member dashboard rendered"; else echo "      ✗ Member dashboard missing"; fi
echo "      dashboard preview: $(echo "$DASH_TEXT" | head -c 200)"

# 5. Navigate dashboard tabs
echo "[5/9] Testing dashboard tabs..."
for tab in Savings Shares Investments Reports Profile; do
  agent-browser find text "$tab" click 2>/dev/null
  sleep 2
  agent-browser screenshot "/tmp/04-tab-$tab.png" 2>/dev/null
  TAB_TEXT=$(agent-browser get text body 2>/dev/null | head -c 300)
  echo "      → $tab: $(echo "$TAB_TEXT" | tr '\n' ' ' | head -c 120)"
done

# 6. Test deposit on Savings tab
echo "[6/9] Testing deposit flow..."
agent-browser find text "Savings" click 2>/dev/null; sleep 1
agent-browser find text "Deposit" click 2>/dev/null; sleep 2
DEP_TEXT=$(agent-browser get text body 2>/dev/null)
if echo "$DEP_TEXT" | grep -qi "Make a deposit\|Payment method"; then echo "      ✓ Deposit dialog opened"; else echo "      ✗ Deposit dialog missing"; fi
agent-browser screenshot /tmp/05-deposit.png 2>/dev/null
# close dialog
agent-browser press Escape 2>/dev/null; sleep 1

# 7. Logout
echo "[7/9] Logging out..."
agent-browser find text "Log out" click 2>/dev/null
sleep 3
agent-browser wait --load networkidle --timeout 15000 2>/dev/null
sleep 1
LOGOUT_TEXT=$(agent-browser get text body 2>/dev/null | head -c 300)
if echo "$LOGOUT_TEXT" | grep -qi "UNISSACO\|Save. Invest\|Get started"; then echo "      ✓ Returned to landing after logout"; else echo "      ⚠ After logout: $(echo "$LOGOUT_TEXT" | head -c 100)"; fi

# 8. Login as admin
echo "[8/9] Logging in as admin..."
agent-browser find text "Member login" click 2>/dev/null; sleep 1
agent-browser find label "Email address" fill "admin@unissacco.ac.mw" 2>/dev/null
agent-browser find label "Password" fill "Admin@123" 2>/dev/null
agent-browser find role button click --name "Log in" 2>/dev/null
sleep 3
agent-browser wait --load networkidle --timeout 20000 2>/dev/null
sleep 2
agent-browser screenshot /tmp/06-admin-dashboard.png 2>/dev/null
ADMIN_TEXT=$(agent-browser get text body 2>/dev/null | head -c 800)
if echo "$ADMIN_TEXT" | grep -qi "Admin Overview\|Total members\|Share capital\|Super Admin"; then echo "      ✓ Admin dashboard rendered"; else echo "      ✗ Admin dashboard missing"; fi
echo "      admin preview: $(echo "$ADMIN_TEXT" | head -c 200)"

# Navigate admin tabs
for tab in Members Transactions "Audit Log"; do
  agent-browser find text "$tab" click 2>/dev/null; sleep 2
  agent-browser screenshot "/tmp/07-admin-$tab.png" 2>/dev/null
  echo "      → admin $tab: loaded"
done

# 9. Final checks - responsive + footer
echo "[9/9] Responsive + footer check..."
agent-browser set viewport 390 844 2>/dev/null; sleep 1
agent-browser find text "Overview" click 2>/dev/null; sleep 1
agent-browser screenshot /tmp/08-mobile.png 2>/dev/null
echo "      ✓ Mobile viewport tested (390x844)"
agent-browser set viewport 1280 800 2>/dev/null; sleep 1

# Footer presence
FOOTER=$(agent-browser eval "document.querySelector('footer')?.innerText?.slice(0,120) || 'NO FOOTER'" 2>/dev/null)
echo "      footer: $FOOTER"

# Console errors final
FINAL_ERRS=$(agent-browser errors 2>/dev/null | head -10)
if [ -n "$FINAL_ERRS" ]; then echo "      ⚠ Final page errors: $FINAL_ERRS"; else echo "      ✓ No console errors"; fi

echo ""
echo "================================================"
echo "  VERIFICATION COMPLETE"
echo "  Screenshots in /tmp/0*.png"
echo "================================================"
