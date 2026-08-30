# Aayaan ops brief — NextXI (give this whole file to Claude)

> **Start with `docs/aayaan-launch-prompt.md` instead.** That is the ordered
> run of everything still standing between NextXI and real users, and it names
> which task below to read at each step. This file is the click-by-click
> reference it points into, not the entry point.

You are helping **Aayaan Sahu** finish the launch ops that the app repo cannot do from code. Mukilan already shipped the product changes. Your job is dashboard, DNS, and mailbox work only.

Do **not** change application code, open PRs, or “improve” settings that are already correct. Do **not** set Site URL back to a `*.vercel.app` host. After each task, write what you clicked, the exact values saved, and how you verified it.

**Canonical site:** `https://www.nextxi.pro`  
**Apex:** `https://nextxi.pro` (must 308 to www; do not use apex as Site URL)  
**Repo:** https://github.com/Aayaan-Sahu/NextXI  
**Vercel project:** `cricket-platform` (team `aayaansahus-projects`)  
**Supabase project:** `cricket-database` (ref `gvzavvdchapxvxzyuhac`)  
**Public contact the site now advertises:** `contact@nextxi.pro`  
**Auth email templates in the repo:**

- `supabase/templates/confirmation.html`
- `supabase/templates/magic-link.html`
- `supabase/templates/recovery.html`

---

## Why this exists

Signup is **link-only** — the person clicks the link in the email and the account opens. There are no 6-digit boxes anywhere in the app; if a step below asks you to type a code, that step is out of date. Supabase sends the email. On the free default mailer:

1. Templates cannot be edited. Users get a generic Supabase email, not NextXI. The app now says so on the sign-up, verify and reset screens (`SupabaseMailNote` in `components/auth.tsx`) — **delete that component and its three call sites once this task is done**.
2. If Site URL is a Vercel alias, the confirm link leaves `www.nextxi.pro` and the session cookie never lands.
3. The default mailer is rate-limited to a handful of messages an hour, so a group signing up together mostly will not receive anything. This is the single reason the platform cannot be opened to real users yet.

Contact and safeguarding pages now show `contact@nextxi.pro`. If that mailbox does not exist, parents write into a black hole. That is worse than no address.

---

## Already done — do not undo

Confirm these, then leave them alone.

### Supabase → Authentication → URL Configuration

| Field | Required value |
| --- | --- |
| **Site URL** | `https://www.nextxi.pro` |

**Redirect URLs** must include:

- `https://www.nextxi.pro/**`
- `https://nextxi.pro/**`
- `https://cricket-platform-nine.vercel.app/**` (old production alias; leftover emails)
- `https://cricket-platform-*.vercel.app/**` (preview deploys)
- `http://localhost:3000/**`

If Site URL is anything else (especially `https://cricket-platform-nine.vercel.app` or `http://localhost:3000`), set it to `https://www.nextxi.pro`. Do not remove the old Vercel alias from the allow list.

### App behaviour already in code

- Production confirm hops from `cricket-platform-nine.vercel.app` → `www.nextxi.pro`.
- Production never mints `*.vercel.app` as the email origin.
- `/contact` and `/safeguarding` show `contact@nextxi.pro`.

---

## Task order (do in this order)

1. Inbound mailbox for `contact@nextxi.pro` (so contact is real)
2. Domain verified at an SMTP provider (Resend recommended)
3. Custom SMTP on Supabase (unlocks templates)
4. Paste the three HTML templates
5. Send test signup / sign-in / reset emails
6. Vercel Production env `NEXT_PUBLIC_SITE_URL`
7. GitHub repo homepage
8. Final walkthrough on `www.nextxi.pro`

Stop and report if any step is blocked (no DNS access, not admin on GitHub, billing).

---

## Task 1 — Inbound mail: `contact@nextxi.pro`

The website tells people to email this address. It must land in a human inbox Aayaan reads daily.

### Preferred: Cloudflare Email Routing (receive-only, free)

Use this if `nextxi.pro` is on Cloudflare.

1. Open the Cloudflare dashboard → domain **nextxi.pro** → **Email** → **Email Routing**.
2. Enable Email Routing. Cloudflare will show MX records. Apply them (usually a one-click “Add records”). Typical values (confirm in the UI; do not invent):

   - MX `route1.mx.cloudflare.net` priority 13? **Use whatever Cloudflare displays.**
   - MX `route2.mx.cloudflare.net`
   - MX `route3.mx.cloudflare.net`
   - TXT `v=spf1 include:_spf.mx.cloudflare.net ~all` if they offer one for inbound.

3. **Destination addresses** → add Aayaan’s real inbox (the Gmail/whatever he actually reads) → confirm the verification email Cloudflare sends.
4. **Custom addresses** → create:

   | Custom address | Action | Destination |
   | --- | --- | --- |
   | `contact@nextxi.pro` | Forward | Aayaan’s verified inbox |

5. Optional aliases (same destination): `safeguarding@nextxi.pro` if you want a second door. The site currently uses `contact@` with subject `Safeguarding`, so `contact@` alone is enough if forwarding works.

6. Wait for DNS to go live (often minutes, can be an hour).

**Verify:** from a *different* email account (not the destination), send:

- To: `contact@nextxi.pro`
- Subject: `NextXI mailbox test`
- Body: `Inbound test from [your name] at [time].`

Aayaan must see it in the destination inbox within a few minutes. If it bounces, MX is wrong or routing is off. Do not proceed to advertise this as done until a real message arrives.

### Alternative: Google Workspace / Microsoft 365

If they want a real mailbox (send + receive from `contact@`) instead of forward-only:

1. Create the Workspace/M365 account for `nextxi.pro`.
2. Add the provider’s MX, SPF, DKIM, DMARC as the provider shows.
3. Create user `contact@nextxi.pro`.
4. Same send-a-test-from-outside verification.

Do **not** run Cloudflare Email Routing and Google MX at the same time. One inbound path only.

---

## Task 2 — Outbound SMTP (Resend) so Supabase can send branded mail

Supabase free tier + default mailer **refuses template edits** with:

> Email template modification is not available for free tier projects using the default email provider.

Custom SMTP (or a paid Supabase plan) is required. Resend is the usual path.

### 2a. Resend account and domain

1. Sign in at https://resend.com (Aayaan’s account).
2. **Domains** → **Add domain** → `nextxi.pro` (or `www.nextxi.pro` only if they insist; apex `nextxi.pro` is correct for mail).
3. Resend shows DNS records. Add **exactly** those records in Cloudflare (or wherever DNS lives). Typical set:

   | Type | Name | Value |
   | --- | --- | --- |
   | TXT | `resend._domainkey` (or whatever Resend shows) | DKIM public key Resend shows |
   | TXT | `@` or as shown | SPF `v=spf1 include:amazonses.com …` — **use Resend’s SPF, do not merge by guesswork** |
   | TXT | `_dmarc` | `v=DMARC1; p=none;` to start (tighten later) |

   If Cloudflare Email Routing already set an SPF, **combine** includes in one SPF TXT. Two SPF records on the same name fail. Example shape (adjust to the actual includes both vendors list):

   `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all`

   Confirm the includes against both dashboards. Do not copy this line blindly if Resend shows something else.

4. In Resend, wait until the domain is **Verified**.
5. **API Keys** → create a key with sending permission. Name it `supabase-auth`. Copy it once. Store it in Aayaan’s password manager. Never commit it. Never paste it into GitHub, Slack, or this repo.

### 2b. Supabase custom SMTP

1. Supabase dashboard → project **cricket-database** → **Project Settings** → **Authentication** (or **Authentication** → **SMTP Settings**, depending on the current UI).
2. Enable **Custom SMTP**.
3. Fill:

   | Field | Value |
   | --- | --- |
   | Sender email | `contact@nextxi.pro` |
   | Sender name | `NextXI` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the Resend API key |
   | Minimum interval | leave default unless the UI requires a number |

4. Save.

If Resend’s docs for the current month show port `587` + STARTTLS instead, use that. Prefer whatever Resend’s “SMTP” page lists today.

**Verify:** Supabase shows custom SMTP enabled, no error banner. Do not send a user-facing blast yet.

---

## Task 3 — Paste auth email templates

Only after custom SMTP is on. If you paste before SMTP, the dashboard will reject the save.

The dashboard does not read the repo — a template only changes when its HTML is in the project's auth config. From a checkout, that is one command, with a personal access token from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens):

```sh
SUPABASE_ACCESS_TOKEN=sbp_… bun run auth:templates
```

It pushes the bodies only, so the subjects below still have to be set once, by hand.

By hand for all of it: open the file in the repo, copy the **entire HTML**, paste into the matching Supabase field, set the subject, save. Supabase → **Authentication** → **Email Templates**.

### Confirm signup

- Subject: `Confirm your NextXI account`
- File: `supabase/templates/confirmation.html`
- Button URL (sign-up is link-only — no 6-digit code):

  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding`

### Magic Link

Nothing in the app sends this today — sign-in is a password, sign-up is a
confirmation link. Set it anyway so the template is right if magic-link sign-in
comes back.

- Subject: `Your NextXI sign-in code`
- File: `supabase/templates/magic-link.html`
- Must include `{{ .Token }}` (the 6-digit code) and:

  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/onboarding`

### Reset password

- Subject: `Reset your NextXI password`
- File: `supabase/templates/recovery.html`
- Link must be:

  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password`

Do not edit the Go template variables. Do not switch `type=` values. Do not point links at `cricket-platform-nine.vercel.app`.

If the UI still says templates are locked, SMTP is not actually active. Go back to Task 2.

---

## Task 4 — Send real test emails

Use a personal inbox that is **not** already a NextXI user, or delete/reset that user in Supabase Auth first.

### Signup (confirm template)

1. Open `https://www.nextxi.pro/auth?mode=sign-up` (production, not a preview).
2. Create an account with the test email.
3. Open the email.

**Pass only if all of these are true:**

- From name is **NextXI**, from address is `contact@nextxi.pro` (or Resend-on-behalf if they are still warming; prefer contact@).
- Body looks like the NextXI dark/gold template, not generic Supabase.
- The button/link host is `www.nextxi.pro` (not `cricket-platform-nine.vercel.app`, not localhost).
- Clicking the link signs you in on `www.nextxi.pro` and lands on onboarding.

There is **no 6-digit code** in the sign-up flow and no box to type one into. `/auth/check-email` offers a resend and nothing else.

**Open the link on a second device** (phone, or another browser) as well as the one you signed up on. The repo's own template confirms by `token_hash`, which works anywhere; Supabase's default template confirms by PKCE `code`, which only works in the browser that started the sign-up. If the second device fails and the first succeeds, the templates from Task 3 did not actually save.

### Magic link (magic-link template)

Nothing in the app sends this today — sign-in is a password. Send one from **Authentication → Users → … → Send magic link** if you want to check the template rendered; otherwise skip.

### Password reset (recovery template)

1. `/auth/reset-password` → send reset to the test email.
2. Link host is `www.nextxi.pro` and lands on set-password.

If the link is the old Vercel host, Site URL or Redirect URLs drifted — fix Task “Already done”.

Delete the test user in Supabase **Authentication → Users** when finished, unless you want to keep it as a staging account.

---

## Task 5 — Vercel Production environment variable

`NEXT_PUBLIC_*` is baked in at **build** time. Setting it without a production redeploy does nothing.

1. Vercel → team **aayaansahus-projects** → project **cricket-platform** → **Settings** → **Environment Variables**.
2. Add (or edit):

   | Name | Value | Environments |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.nextxi.pro` | **Production only** |

   Do **not** add this to Preview. Previews should keep using `VERCEL_URL` so a preview signup confirms on that preview host.

3. **Deployments** → latest Production → **Redeploy** (or merge/push so a new production deploy runs). Confirm the new deployment is Ready.

**Verify:** on the new production deployment, view env (Vercel deployment details) and confirm `NEXT_PUBLIC_SITE_URL` is present for Production. Then repeat one signup email and confirm the link still uses `www.nextxi.pro`.

---

## Task 6 — GitHub homepage (needs repo admin)

Mukilan’s GitHub user can push but **cannot** change repo metadata (PATCH homepage returned 404). Aayaan (or anyone with admin on `Aayaan-Sahu/NextXI`) must do this.

1. Open https://github.com/Aayaan-Sahu/NextXI/settings (you must be **Admin**, not just Write).
2. **General** → **Application** / homepage field (labelled **Website**).
3. Set to: `https://www.nextxi.pro`
4. Save.

**Verify:** the repo header on https://github.com/Aayaan-Sahu/NextXI shows the nextxi.pro link, not `https://cricket-platform-nine.vercel.app`.

If Claude is running as a user without admin, stop and tell Aayaan to click this himself while logged into the owner account.

---

## Task 7 — Final production walkthrough

On `https://www.nextxi.pro` (hard refresh, not a preview URL):

1. Create account → email looks like NextXI → code works → player intake (“You’re in”).
2. If the test user is under 18, the locked home shows a code plus Copy / Email a parent. The parent instructions mention “Parent or guardian? Link a child's account”, not a role-picker card.
3. `/contact` shows `contact@nextxi.pro`. Send another real email to it; Aayaan receives it.
4. `/safeguarding` uses the same address.
5. GitHub homepage points at nextxi.pro.
6. An old confirm link on `cricket-platform-nine.vercel.app` (if you still have one) 308s to www and still confirms.

---

## Ongoing (not a one-off, but tell Aayaan)

**Coach and club approvals.** Both are auto-approved on sign-up for now, so nobody waits on the queue. `/dashboard/admin` is still where an account gets rejected, and where a club claiming a name another club already holds gets settled — that sign-up is refused with a message pointing at `contact@nextxi.pro`, so those land in the mailbox from Task 1.

**Do not** change Site URL when adding preview domains. Only add more Redirect URL allow-list entries.

**Spam.** After SMTP is live, watch Resend logs for bounces. If Gmail files NextXI in spam, finish DKIM/DMARC (Task 2) and keep volume low while the domain warms.

---

## Report back to Mukilan

When done, reply with a checklist like this (yes/no + evidence):

- [ ] `contact@nextxi.pro` received a test mail from an outside address (timestamp)
- [ ] Resend domain status: Verified
- [ ] Supabase custom SMTP: on, sender `contact@nextxi.pro`
- [ ] Confirm / Magic Link / Reset templates pasted and saved
- [ ] Test signup email: branded, link host `www.nextxi.pro`, opens on a second device too
- [ ] Test reset email: same
- [ ] `SupabaseMailNote` deleted from `components/auth.tsx` and its three call sites
- [ ] Vercel Production `NEXT_PUBLIC_SITE_URL=https://www.nextxi.pro` + redeployed
- [ ] GitHub Website = `https://www.nextxi.pro`
- [ ] Site URL still `https://www.nextxi.pro` (unchanged)

If something is blocked, say which task, the exact error text, and which account is missing access (Cloudflare / Resend / Supabase / Vercel / GitHub admin).
