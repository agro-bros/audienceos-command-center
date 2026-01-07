# Citation Formatting Debug Guide

**Commit:** `9c179aa` (Enhanced logging deployed)
**Status:** Comprehensive logging added - ready for testing
**Goal:** Verify citation marker format is [1][2][3] (NOT [1.1][1.7])

---

## Quick Testing (5 minutes)

### Step 1: Navigate to App
```
URL: https://audienceos-agro-bros.vercel.app
Already authenticated as: E2E Tester (admin)
```

### Step 2: Open Intelligence Center → Chat History → Create New Query

**Send this test query:**
```
What is the latest news about Google Ads in January 2026?
```

This query is routed as "web" which enables Google Search grounding + citations.

---

## Step 3: Inspect Citation Markers (Choose ONE)

### Option A: Browser Console (Easiest)

**Open DevTools:**
1. Press `F12` or `Cmd+Option+I`
2. Click **Console** tab
3. Look for logs starting with:
   - `[=== CITATION PROCESSING START ===]`
   - `[DEPLOY CHECK] Regex test for decimal markers:`
   - `[CITATION STRIPPING]`
   - `[CITATION INSERTION]`
   - `[=== CITATION PROCESSING COMPLETE ===]`

**What to look for:**
- If you see `[CITATION STRIPPING] BEFORE - Contains decimal markers:` → decimal markers were in response
- If you see `[CITATION STRIPPING] SKIPPED - No decimal markers found` → no decimal markers (good!)
- If you see `[CITATION INSERTION] AFTER:` with `integerMarkersCount: > 0` → integers were inserted ✅

### Option B: Network Tab (More Details)

**Open Network tab:**
1. Press `F12` or `Cmd+Option+I`
2. Click **Network** tab
3. Clear with trash icon
4. Send the query
5. Find POST request to `/api/v1/chat`
6. Click on it
7. Click **Response** tab
8. Search (Ctrl+F) for `[1.1` or `[1]` in the response content field

**What to look for:**
```
WRONG (current bug):  [1.1, 1.7] or [1.3] format
CORRECT (after fix):  [1] [2] [3] format (integers only)
```

### Option C: Vercel Server Logs (Full Truth)

**Access Vercel Dashboard:**
1. Go to https://vercel.com/agro-bros/audienceos
2. Click **Deployments** tab
3. Find the latest deployment (should be from ~1-2 minutes ago)
4. Click **View Deployment**
5. Go to **Functions** or **Logs** tab
6. Search for `[=== CITATION PROCESSING START ===]`

**Server logs tell us:**
- If logs appear → code IS deployed ✅
- If NO logs appear → code NOT deployed ❌ (cache issue or rollback)

---

## Expected Log Output (What to See)

### If Citation Formatting is WORKING:

```
[=== CITATION PROCESSING START ===] {
  timestamp: "2026-01-07T...",
  route: "web",
  textLengthBefore: 842
}

[DEPLOY CHECK] Regex test for decimal markers: {
  hasMatch: false,  ← NO decimal markers found
  decimalMarkersFound: [],
  textSample: "In 2026, Google Ads has transitioned..."
}

[CITATION STRIPPING] SKIPPED - No decimal markers found

[CITATION INSERTION] Condition check: {
  hasGroundingSupports: true,
  groundingSupportsCount: 3,
  citationsCount: 3,
  willInsert: true
}

[CITATION INSERTION] AFTER: {
  hasIntegerMarkers: true,  ← [1][2][3] present
  integerMarkersCount: 3,
  hasDecimalMarkers: false,  ← NO decimal markers ✅
  textSample: "In 2026, Google Ads... automation [1] where... default [2]..."
}

[=== CITATION PROCESSING COMPLETE ===] {
  hasIntegerMarkers: true,  ← Final confirmation
  hasDecimalMarkers: false,
  citationsInResponse: 3
}
```

### If Citation Formatting is BROKEN:

```
[DEPLOY CHECK] Regex test for decimal markers: {
  hasMatch: true,  ← Found decimal markers ❌
  decimalMarkersFound: ["[1.1, 1.7]", "[1.3]", ...],
  textSample: "...manual bidding [1.1, 1.7]..."
}

[CITATION STRIPPING] BEFORE - Contains decimal markers: {
  count: 3,
  examples: ["[1.1, 1.7]", "[1.3]", ...],
}

[CITATION STRIPPING] AFTER - Decimal markers removed: {
  hasDecimalMarkersAfter: false,  ← Stripping worked
  textSample: "...manual bidding..."  ← Marker gone
}

[CITATION INSERTION] AFTER: {
  hasIntegerMarkers: false,  ← But no [1][2][3] inserted ❌
  integerMarkersCount: 0,
  hasDecimalMarkers: false,
}
```

---

## Possible Outcomes

### Outcome 1: Everything Working ✅
- Console shows integer markers [1][2][3]
- Network response shows [1] [2] [3] format
- Vercel logs show stripping + insertion working
- **Action:** ✨ Bug is fixed! Update the status and close.

### Outcome 2: Code Not Deployed ❌
- No `[=== CITATION PROCESSING START ===]` logs in console or Vercel
- OR Vercel shows old commit (not 9c179aa)
- **Action:**
  - Check Vercel dashboard for deployment status
  - May need manual trigger: https://vercel.com/agro-bros/audienceos/deployments
  - Or wait ~2-3 min for auto-deployment

### Outcome 3: Stripping Fails ❌
- Console shows `[CITATION STRIPPING] BEFORE - Contains decimal markers`
- BUT shows `hasDecimalMarkersAfter: true` (didn't remove them)
- **Action:** Regex pattern is wrong - need to debug replacement logic

### Outcome 4: Insertion Fails ❌
- Stripping works (decimal markers removed)
- BUT `[CITATION INSERTION] AFTER` shows `integerMarkersCount: 0`
- **Action:** groundingSupports/citations are missing or insertInlineCitations() has a bug

---

## Debugging Checklist

- [ ] Can see `[=== CITATION PROCESSING START ===]` in console?
  - **YES** → Code is deployed ✅
  - **NO** → Code not deployed, check Vercel

- [ ] Do you see decimal markers in console logs?
  - **YES** → Gemini is returning decimal format, stripping should remove them
  - **NO** → Gemini returned clean integer format already (less common)

- [ ] Does `[CITATION STRIPPING] AFTER` show `hasDecimalMarkersAfter: false`?
  - **YES** → Stripping regex is working ✅
  - **NO** → Regex pattern not matching, need to fix

- [ ] Does `[CITATION INSERTION] AFTER` show `integerMarkersCount > 0`?
  - **YES** → Insertion worked ✅
  - **NO** → Insertion didn't run, check groundingSupports/citations

- [ ] Do [1][2][3] markers appear in final UI text?
  - **YES** → Bug is fixed ✨
  - **NO** → Markers are there but not rendering, check client-side code

---

## Client-Side Debugging (If markers aren't showing in UI)

If logs show [1][2][3] were inserted but UI still shows [1.1]:

1. Check `[Citation Debug - Client]` log in console (line 369 of chat-interface.tsx)
2. Should show:
   ```
   hasIntegerMarkers: true
   integerMarkers: ["[1]", "[2]", "[3]"]
   ```

3. If log shows correct format but UI is wrong → CSS/rendering issue, not data issue

---

## Citation Processing Flow (Reference)

```
Gemini Response (raw)
        ↓
[DEPLOY CHECK] - Detect decimal markers?
        ↓
[CITATION STRIPPING] - Remove [1.1], [1.1, 1.7]
        ↓
[CITATION INSERTION] - Add [1], [2], [3] based on groundingSupports
        ↓
Final responseText with clean [1][2][3] markers
        ↓
Response sent to client
        ↓
[Citation Debug - Client] - Verify format in console
        ↓
Citation Footer + Inline Markers rendered in UI
```

---

## Next Steps After Testing

### If Working ✅
1. Create manual test with multiple web queries to verify consistency
2. Test non-web routes (casual, dashboard) to ensure no regression
3. Update deployment status in docs
4. Close the SITREP

### If Broken ❌
1. Check which logs appear
2. Use the "Outcome" section above to identify root cause
3. Share logs in conversation for analysis
4. May need additional code fix based on findings

---

## Links

- **App:** https://audienceos-agro-bros.vercel.app
- **Vercel Dashboard:** https://vercel.com/agro-bros/audienceos
- **Chat Route Code:** `app/api/v1/chat/route.ts` (lines 309-400)
- **Chat Component:** `components/chat/chat-interface.tsx` (lines 369-378)

---

**Commit 9c179aa deployed:**
```
fix(chat): add comprehensive deployment verification logging for citation processing
- Added [=== CITATION PROCESSING START/COMPLETE ===] markers
- Enhanced [DEPLOY CHECK], [CITATION STRIPPING], [CITATION INSERTION] logging
- Each section logs before/after state for debugging
```
