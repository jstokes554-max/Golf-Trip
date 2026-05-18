import { createClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

const DEFAULT_PLAYERS = [
  { name: "Josh Stokes", handicap: 17 },
  { name: "Jake Stokes", handicap: 20 },
  { name: "Luke Gardner", handicap: 9 },
  { name: "Austin Wulff", handicap: 13 },
  { name: "Jeremy Cash", handicap: 17 },
  { name: "Cody Gardner", handicap: 15 },
  { name: "Jake Jorgensen", handicap: 18 },
  { name: "Jason Powers", handicap: 6 },
];

// Verbatim from COURSE_PRESETS in the original component
const DEFAULT_COURSES = [
  {
    round_id: 1,
    name: "Meadowlark Hills (Kearney)",
    par: [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 5, 4, 4, 3, 4, 3, 4],
    si:  [18, 14, 10, 8, 6, 16, 12, 2, 4, 1, 15, 7, 13, 9, 17, 5, 11, 3],
  },
  {
    round_id: 2,
    name: "Bayside Golf (Brule)",
    par: [5, 3, 4, 5, 3, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 3, 4],
    si:  [14, 12, 10, 18, 8, 2, 16, 6, 4, 7, 1, 11, 3, 15, 5, 13, 17, 9],
  },
  {
    round_id: 3,
    name: "Bayside Golf (Brule)",
    par: [5, 3, 4, 5, 3, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 3, 4],
    si:  [14, 12, 10, 18, 8, 2, 16, 6, 4, 7, 1, 11, 3, 15, 5, 13, 17, 9],
  },
  {
    round_id: 4,
    name: "Wild Horse (Gothenburg)",
    par: [4, 4, 5, 3, 4, 5, 4, 4, 3, 4, 3, 4, 3, 5, 4, 4, 5, 4],
    si:  [11, 3, 15, 9, 13, 5, 7, 1, 17, 10, 18, 4, 6, 16, 12, 2, 14, 8],
  },
];

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Server is missing Supabase env vars." },
      { status: 500 }
    );
  }

  const sb = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  // Generate code with one retry on unique-constraint collision
  let tripRow = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = nanoid();
    const r = await sb.from("trips").insert({ code }).select().single();
    if (!r.error) {
      tripRow = r.data;
      break;
    }
    lastErr = r.error;
    // 23505 = unique_violation, retry once
    if (r.error.code !== "23505") break;
  }

  if (!tripRow) {
    return NextResponse.json(
      { error: "Failed to create trip", detail: lastErr?.message },
      { status: 500 }
    );
  }

  // Seed default players and courses in parallel
  const [pErr, cErr] = await Promise.all([
    sb
      .from("players")
      .insert(
        DEFAULT_PLAYERS.map((p) => ({ ...p, trip_id: tripRow.id, team: null }))
      )
      .then((r) => r.error),
    sb
      .from("courses")
      .insert(
        DEFAULT_COURSES.map((c) => ({ ...c, trip_id: tripRow.id }))
      )
      .then((r) => r.error),
  ]);

  if (pErr || cErr) {
    return NextResponse.json(
      {
        code: tripRow.code,
        warning: "Trip created but seeding hit an error.",
        playersError: pErr?.message,
        coursesError: cErr?.message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ code: tripRow.code });
}
