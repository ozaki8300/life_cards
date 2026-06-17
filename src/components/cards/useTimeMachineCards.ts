"use client";

import { useMemo } from "react";

import { TimeMachineEngine } from "@/domain/timeMachine/engine";
import type { TimeMachineBucket } from "@/domain/timeMachine/types";
import type { Card } from "@/lib/types";

type Params = {
  cards: Card[];
  limitPerBucket?: number;
  today?: string;
};

type Result = {
  bucketCount: number;
  buckets: TimeMachineBucket[];
  hasBuckets: boolean;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function useTimeMachineCards({
  cards,
  limitPerBucket,
  today,
}: Params): Result {
  const resolvedToday = today ?? todayInputValue();
  const buckets = useMemo(() => {
    if (cards.length === 0) {
      return [];
    }

    return TimeMachineEngine.pick({
      cards,
      limitPerBucket,
      today: resolvedToday,
    });
  }, [cards, limitPerBucket, resolvedToday]);

  return useMemo(
    () => ({
      bucketCount: buckets.length,
      buckets,
      hasBuckets: buckets.length > 0,
    }),
    [buckets],
  );
}
