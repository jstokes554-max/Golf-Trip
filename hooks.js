"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabase } from "./supabase";

export const DEFAULT_PAR = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 5, 3, 4, 5, 3, 4, 4];
export const DEFAULT_SI  = [9, 5, 17, 1, 13, 11, 15, 3, 7, 8, 4, 12, 18, 2, 10, 16, 14, 6];

// =====================================================
// HELPERS
// =====================================================

const scoreKeyOf = (s) => `${s.match_id}|${s.score_key}|${s.hole_index}`;

function applyRowChange(list, payload, idFn = (x) => x.id) {
  if (payload.eventType === "INSERT") {
    const id = idFn(payload.new);
    if (list.some((x) => idFn(x) === id)) return list;
    return [...list, payload.new];
  }
  if (payload.eventType === "UPDATE") {
    const id = idFn(payload.new);
    return list.map((x) => (idFn(x) === id ? payload.new : x));
  }
  if (payload.eventType === "DELETE") {
    const id = idFn(payload.old);
    return list.filter((x) => idFn(x) !== id);
  }
  return list;
}

function reshapeMatches(matchesRaw, scoresRaw) {
  // Build scores map: { matchId: { scoreKey: [18 hole values] } }
  const byMatch = {};
  for (const row of scoresRaw) {
    if (!byMatch[row.match_id]) byMatch[row.match_id] = {};
    if (!byMatch[row.match_id][row.score_key]) {
      byMatch[row.match_id][row.score_key] = new Array(18).fill("");
    }
    byMatch[row.match_id][row.score_key][row.hole_index] = row.gross ?? "";
  }

  // Group matches by round, sorted by created_at
  const byRound = { 1: [], 2: [], 3: [], 4: [] };
  const sorted = [...matchesRaw].sort((a, b) => {
    return new Date(a.created_at) - new Date(b.created_at);
  });

  for (const m of sorted) {
    const rid = m.round_id;
    if (!byRound[rid]) byRound[rid] = [];
    byRound[rid].push({
      id: m.id,
      sideA: m.side_a || [],
      sideB: m.side_b || [],
      manualResult: m.manual_result,
      scores: byMatch[m.id] || {},
    });
  }
  return byRound;
}

function reshapeCourses(coursesRaw) {
  const out = {};
  for (const c of coursesRaw) {
    out[c.round_id] = {
      id: c.id,
      name: c.name || "",
      par: c.par || [...DEFAULT_PAR],
      si: c.si || [...DEFAULT_SI],
    };
  }
  return out;
}

// =====================================================
// MAIN HOOK
// =====================================================

export function useTripData(tripCode) {
  const [trip, setTrip] = useState(null);
  const [players, setPlayers] = useState([]);
  const [coursesRaw, setCoursesRaw] = useState([]);
  const [matchesRaw, setMatchesRaw] = useState([]);
  const [scoresRaw, setScoresRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs used by realtime handlers to filter scores by current trip's matches
  const matchIdsRef = useRef(new Set());
  useEffect(() => {
    matchIdsRef.current = new Set(matchesRaw.map((m) => m.id));
  }, [matchesRaw]);

  useEffect(() => {
    if (!tripCode) return;
    const sb = getSupabase();
    let mounted = true;
    let channel = null;

    async function init() {
      // 1. Look up trip
      const { data: tripRow } = await sb
        .from("trips")
        .select("*")
        .eq("code", tripCode.toLowerCase())
        .maybeSingle();

      if (!mounted) return;
      if (!tripRow) {
        setError("not_found");
        setLoading(false);
        return;
      }
      setTrip(tripRow);

      // 2. Load all related rows in parallel
      const [pl, co, ma] = await Promise.all([
        sb.from("players").select("*").eq("trip_id", tripRow.id),
        sb.from("courses").select("*").eq("trip_id", tripRow.id),
        sb.from("matches").select("*").eq("trip_id", tripRow.id),
      ]);

      if (!mounted) return;
      setPlayers(pl.data || []);
      setCoursesRaw(co.data || []);
      setMatchesRaw(ma.data || []);

      // 3. Load scores for those matches
      const matchIds = (ma.data || []).map((m) => m.id);
      if (matchIds.length > 0) {
        const { data: scoreData } = await sb
          .from("scores")
          .select("*")
          .in("match_id", matchIds);
        if (mounted) setScoresRaw(scoreData || []);
      }

      setLoading(false);

      // 4. Realtime: single channel, multiple table listeners
      const tripFilter = `trip_id=eq.${tripRow.id}`;
      channel = sb
        .channel(`trip:${tripRow.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripRow.id}` },
          (payload) => {
            if (payload.eventType === "UPDATE") setTrip(payload.new);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: tripFilter },
          (payload) => setPlayers((prev) => applyRowChange(prev, payload))
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "courses", filter: tripFilter },
          (payload) => setCoursesRaw((prev) => applyRowChange(prev, payload))
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches", filter: tripFilter },
          (payload) => setMatchesRaw((prev) => applyRowChange(prev, payload))
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "scores" },
          (payload) => {
            const row = payload.new || payload.old;
            if (!matchIdsRef.current.has(row.match_id)) return;
            setScoresRaw((prev) => applyRowChange(prev, payload, scoreKeyOf));
          }
        )
        .subscribe();
    }

    init();

    return () => {
      mounted = false;
      if (channel) sb.removeChannel(channel);
    };
  }, [tripCode]);

  // Reshape into the structure the component expects
  const teamNames = useMemo(
    () => trip?.team_names || ["Team Alpha", "Team Bravo"],
    [trip]
  );
  const courses = useMemo(() => reshapeCourses(coursesRaw), [coursesRaw]);
  const matches = useMemo(
    () => reshapeMatches(matchesRaw, scoresRaw),
    [matchesRaw, scoresRaw]
  );

  // ===================================================
  // MUTATIONS
  // ===================================================
  const tripId = trip?.id;

  const addPlayer = useCallback(
    async (name, handicap) => {
      if (!tripId) return;
      await getSupabase().from("players").insert({
        trip_id: tripId,
        name,
        handicap,
        team: null,
      });
    },
    [tripId]
  );

  const removePlayer = useCallback(async (id) => {
    await getSupabase().from("players").delete().eq("id", id);
  }, []);

  const assignPlayer = useCallback(async (id, team) => {
    await getSupabase().from("players").update({ team }).eq("id", id);
  }, []);

  const updateTeamName = useCallback(
    async (index, name) => {
      if (!tripId) return;
      const current = trip?.team_names || ["Team Alpha", "Team Bravo"];
      const next = [...current];
      next[index] = name;
      await getSupabase().from("trips").update({ team_names: next }).eq("id", tripId);
    },
    [tripId, trip]
  );

  // Ref so setCourse always sees the latest courses without re-binding
  const coursesRef = useRef(coursesRaw);
  useEffect(() => {
    coursesRef.current = coursesRaw;
  }, [coursesRaw]);

  const setCourse = useCallback(
    async (roundId, patch) => {
      if (!tripId) return;
      const existing = coursesRef.current.find((c) => c.round_id === roundId);
      if (existing) {
        await getSupabase().from("courses").update(patch).eq("id", existing.id);
      } else {
        await getSupabase().from("courses").insert({
          trip_id: tripId,
          round_id: roundId,
          name: "",
          par: DEFAULT_PAR,
          si: DEFAULT_SI,
          ...patch,
        });
      }
    },
    [tripId]
  );

  const addMatch = useCallback(
    async (roundId, sideA, sideB) => {
      if (!tripId) return;
      await getSupabase().from("matches").insert({
        trip_id: tripId,
        round_id: roundId,
        side_a: sideA,
        side_b: sideB,
        manual_result: null,
      });
    },
    [tripId]
  );

  const removeMatch = useCallback(async (matchId) => {
    await getSupabase().from("matches").delete().eq("id", matchId);
  }, []);

  // Ref so setManualResult can toggle off without re-binding to matchesRaw
  const matchesRawRef = useRef(matchesRaw);
  useEffect(() => {
    matchesRawRef.current = matchesRaw;
  }, [matchesRaw]);

  const setManualResult = useCallback(async (matchId, result) => {
    const current = matchesRawRef.current.find((m) => m.id === matchId);
    const next = current?.manual_result === result ? null : result;
    await getSupabase()
      .from("matches")
      .update({ manual_result: next })
      .eq("id", matchId);
  }, []);

  const setHoleScore = useCallback(async (matchId, scoreKey, holeIndex, gross) => {
    await getSupabase()
      .from("scores")
      .upsert(
        {
          match_id: matchId,
          score_key: scoreKey,
          hole_index: holeIndex,
          gross: gross ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "match_id,score_key,hole_index" }
      );
  }, []);

  return {
    trip,
    players,
    teamNames,
    courses,
    matches,
    loading,
    error,
    // mutations
    addPlayer,
    removePlayer,
    assignPlayer,
    updateTeamName,
    setCourse,
    addMatch,
    removeMatch,
    setManualResult,
    setHoleScore,
  };
}
