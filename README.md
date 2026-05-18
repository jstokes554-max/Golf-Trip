# Golf Trip

Real-time golf trip scoring. Next.js 14 + Supabase. No auth, the 8-char trip code in the URL is the access gate.

## Status: ready to deploy

- ☑ Supabase project created and schema applied
- ☑ Realtime enabled on all 5 tables
- ☑ `.env.local` populated for local dev
- ☑ `vercel.json` populated for Vercel (no manual env setup needed)
- ☐ Run it locally and confirm
- ☐ Deploy to Vercel

## Deploy in 4 commands

Open a terminal, navigate to this folder, then run:

```bash
npm install
npm install -g vercel
vercel             # first time: opens browser to log in. accept all defaults.
vercel --prod      # promotes the preview to production. gives you the live URL.
```

That's the whole flow. The `vercel.json` in this folder has your Supabase keys inlined, so you don't need to set environment variables in the Vercel dashboard.

### What `vercel` will ask

- Set up and deploy? **Yes** (Y)
- Which scope? **your personal account** (press enter)
- Link to existing project? **No** (N)
- Project name? **golf-trip** (or hit enter for default)
- Directory? **./** (just press enter)
- Modify settings? **No** (N)

After ~60 seconds you'll see a preview URL. The `vercel --prod` step gives you the permanent production URL like `golf-trip-abc.vercel.app`. Share that link.

## Local dev (optional, to test before pushing live)

```bash
npm install
npm run dev
```

Visit http://localhost:3000, click "Create New Trip". Open the same URL in a second browser tab and confirm changes sync.

## Supabase project

- URL: https://ftyuykufmqtavdulvzct.supabase.co
- Dashboard: https://supabase.com/dashboard/project/ftyuykufmqtavdulvzct
- Region: us-east-2 (Ohio)
- Tier: Free

## What it does

- Create a trip via the landing page, get a short URL
- Roster, draft, course setup, hole-by-hole scoring with USGA stroke allocation
- All phones see and edit the same scoring state in real time
- 4 rounds (Scramble, Best Ball, Singles, Vegas) across 4 courses

## File structure

```
golf-trip/
├── app/
│   ├── layout.jsx
│   ├── page.jsx                # create / join landing
│   ├── [tripCode]/
│   │   └── page.jsx            # main dashboard
│   └── api/
│       └── create-trip/
│           └── route.js        # server-side trip creation + seeding
├── lib/
│   ├── supabase.js
│   └── hooks.js                # useTripData + mutations
├── schema.sql                  # already applied to your Supabase project
├── vercel.json                 # env vars for production deploy
├── .env.local                  # env vars for local dev
├── package.json
└── README.md
```

## Default seed on new trip

**Players:** Josh Stokes (17), Jake Stokes (20), Luke Gardner (9), Austin Wulff (13), Jeremy Cash (17), Cody Gardner (15), Jake Jorgensen (18), Jason Powers (6)

**Courses:** R1 Meadowlark Hills (Kearney), R2 Bayside Golf (Brule), R3 Bayside Golf (Brule), R4 Wild Horse (Gothenburg)

Edit `DEFAULT_PLAYERS` and `DEFAULT_COURSES` in `app/api/create-trip/route.js` to change them.

## Why is the Supabase key in vercel.json?

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the public-facing key that gets bundled into the browser JS anyway. RLS policies in Supabase enforce what the key can do, not the key itself. The trip code in the URL is the access control layer. So checking the key into your repo (or pasting it into a config file) is the same exposure level as visiting the deployed site.

If you ever want to tighten this for a more serious app, you'd add real auth, move the key to Vercel's encrypted env var storage, and lock down the RLS policies to require an authenticated user.
