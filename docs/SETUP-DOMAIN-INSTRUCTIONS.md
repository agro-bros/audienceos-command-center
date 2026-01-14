# AudienceOS Domain Setup Instructions

**Status:** Domain `audienceos.diiiploy.io` needs to be configured
**Deadline:** ASAP (blocks Google OAuth)
**People:** Brent (DNS), Trevor (Vercel + Supabase)

---

## 🎯 What This Does

Changes the app URL from:
- ❌ `audienceos-agro-bros.vercel.app` (temporary)

To:
- ✅ `audienceos.diiiploy.io` (permanent branded domain)

This enables proper Google OAuth, email, and professional branding.

---

## 📌 FOR BRENT: Google Domains DNS Setup

**Time needed:** 5 minutes
**System:** Google Domains (for diiiploy.io)

### Step-by-Step

1. **Go to Google Domains**
   - URL: https://domains.google.com
   - Sign in with your account

2. **Find diiiploy.io**
   - Click on `diiiploy.io` in your domain list
   - Click **"Manage"**

3. **Go to DNS Settings**
   - Left sidebar → **"DNS"**
   - Scroll down to **"Custom records"** section

4. **Add the CNAME Record**
   - Click **"Create new record"**
   - Fill in EXACTLY:
     ```
     Type:     CNAME
     Host:     audienceos
     TTL:      3600
     Value:    cname.vercel-dns.com
     ```
   - Click **"Save"** (blue button)

5. **Verify It's Added**
   - You should see in the list:
     ```
     audienceos.diiiploy.io  CNAME  cname.vercel-dns.com  3600
     ```

6. **Wait 5-10 minutes for DNS to propagate**
   - Then tell Trevor it's done

### That's It for DNS!

Once Brent confirms DNS is done, Trevor can proceed with Vercel + Supabase.

---

## ⚙️ FOR TREVOR: Vercel + Supabase Setup

**Time needed:** 10 minutes
**Depends on:** Brent completing DNS above

### Part 1: Vercel (3 minutes)

1. **Go to Vercel**
   - URL: https://vercel.com
   - Sign in → Click **"audienceos"** project

2. **Add Custom Domain**
   - Left menu → **"Settings"**
   - Click **"Domains"** tab
   - Click **"Add Domain"**
   - Type: `audienceos.diiiploy.io`
   - Click **"Add"**

3. **Vercel Will Show Status**
   - Wait for it to show: ✅ **"Domain Valid"**
   - This means DNS is working correctly
   - If it says "Invalid", wait 5-10 minutes and refresh

4. **You're Done with Vercel**
   - Production URL is now: `https://audienceos.diiiploy.io`

---

### Part 2: Supabase (5 minutes)

**Project:** `audienceos-cc-fresh` (Project ID: ebxshdqfaqupnvpghodi)

#### 1. **Enable Google Provider**

1. Go to: https://supabase.com/dashboard
2. Select project: **`audienceos-cc-fresh`**
3. Left menu → **"Authentication"** → **"Providers"**
4. Find **"Google"** → Click to expand
5. Toggle: **"Enabled"** (turn on)
6. Leave OAuth 2.0 settings as-is (already configured)
7. Click **"Save"**

#### 2. **Update Site URL**

1. Still in Authentication section
2. Left menu → **"URL Configuration"**
3. Find field: **"Site URL"**
4. Delete the old value
5. Enter EXACTLY:
   ```
   https://audienceos.diiiploy.io
   ```
6. Click **"Save"**

#### 3. **Add Redirect URLs**

1. Still in "URL Configuration"
2. Find section: **"Redirect URLs"**
3. Click **"Add URL"**
4. Enter EXACTLY:
   ```
   https://audienceos.diiiploy.io/**
   ```
5. Click **"Add URL"** button
6. You should see it listed below
7. Click **"Save"**

---

## ✅ Verification Checklist

After both complete their parts:

- [ ] Brent: DNS added to Google Domains (audienceos → cname.vercel-dns.com)
- [ ] Trevor: Vercel shows ✅ "Domain Valid" for audienceos.diiiploy.io
- [ ] Trevor: Supabase Site URL is `https://audienceos.diiiploy.io`
- [ ] Trevor: Supabase Redirect URL includes `https://audienceos.diiiploy.io/**`
- [ ] Test: Go to https://audienceos.diiiploy.io/login
- [ ] Click: "Sign in with Google"
- [ ] Verify: Google OAuth works (redirects to Google, then back)

---

## 🆘 If Something Goes Wrong

### "Vercel says domain is invalid"
- **Cause:** DNS not propagated yet
- **Fix:** Wait 10 minutes, refresh Vercel page
- **Still broken?** Brent: Check DNS record is exactly right (no typos)

### "Google OAuth redirects to wrong domain"
- **Cause:** Supabase redirect URLs wrong
- **Fix:** Verify EXACTLY `https://audienceos.diiiploy.io/**` (notice the `/**`)

### "Google says 'Redirect URI mismatch'"
- **Cause:** Supabase Site URL or Redirect URLs don't match domain
- **Fix:** Verify all 3 fields in Supabase are set to `audienceos.diiiploy.io`

---

## 📞 Questions?

Message Roderic with:
1. What you're trying to do (DNS, Vercel, or Supabase)
2. What error/issue you're seeing
3. Screenshot if possible

**Timeline:** Do this today so Google OAuth works properly.

---

*Last updated: 2026-01-14 | Created for AudienceOS OAuth setup*
