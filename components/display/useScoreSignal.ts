"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

/** Private Realtime topic carrying "scores changed" for one school. Must match
 *  private.can_receive_school_topic() and private.signal_school_scores() in
 *  supabase/migrations/20261109120200_private_score_signal.sql. */
export function scoreSignalTopic(schoolId: number): string {
  return `school:${schoolId}:scores`;
}

/** Bursts of score writes (a whole scorebook save) arrive as several signals; refetch once. */
const COALESCE_MS = 5_000;

/**
 * Calls `onSignal` (at most once per COALESCE_MS) when a score in `schoolId` changes.
 *
 * The channel is private: the database sends the signal (a trigger on student_point and point_event)
 * and only a signed-in admin or teacher of that school may receive it (RLS on realtime.messages).
 * No browser can send on it. A paired display has no Supabase session, so it does not subscribe and
 * relies on its 60 s refetch. The payload is empty; the signal only says "refetch".
 */
export function useScoreSignal(schoolId: number | null, onSignal: () => void): void {
  const callback = useRef(onSignal);
  callback.current = onSignal;

  useEffect(() => {
    if (schoolId === null) return;
    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(scoreSignalTopic(schoolId), { config: { private: true } })
        .on("broadcast", { event: "sync" }, () => {
          if (timer !== null) return;
          timer = setTimeout(() => {
            timer = null;
            callback.current();
          }, COALESCE_MS);
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [schoolId]);
}
