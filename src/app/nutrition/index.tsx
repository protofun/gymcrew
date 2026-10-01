import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AiChromaButton } from "@/components/AiChromaButton";
import { NutritionAddFan } from "@/components/NutritionAddFan";
import { NutritionDiarySection } from "@/components/NutritionDiarySection";
import { NutritionHub } from "@/components/NutritionHub";
import { fromDateKey, toDateKey } from "@/lib/date";

// The floating buttons: the add fan (58), centered on the bar, and the AI button (46) pinned to the
// right edge instead — it used to ride just right of center, next to the fan ("in het midden"), which
// read as one cluster of two buttons crowding the middle of the bar rather than two distinct actions.
// A fixed `right` inset (not a `Dimensions`-derived offset from center) also means this doesn't need
// re-deriving on rotation/resize the way the old center-relative math did.
const FAN_BOTTOM = 16;
const FAN_SIZE = 58;
const AI_SIZE = 46;
const AI_RIGHT = 16;

/** Nutrition's diary — its home page. Other screens can send you to a day with a `date` param. */
export default function NutritionDiaryScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [viewedDate, setViewedDate] = useState(() => (dateParam ? fromDateKey(dateParam) : new Date()));

  useEffect(() => {
    if (dateParam) setViewedDate(fromDateKey(dateParam));
  }, [dateParam]);

  const dateKey = toDateKey(viewedDate);

  return (
    <NutritionHub
      active="diary"
      overlay={
        <>
          <View style={{ position: "absolute", right: AI_RIGHT, bottom: FAN_BOTTOM + (FAN_SIZE - AI_SIZE) / 2 }}>
            <AiChromaButton size={AI_SIZE} onPress={() => router.push({ pathname: "/nutrition/scan-meal", params: { date: dateKey } })} />
          </View>
          <NutritionAddFan dateKey={dateKey} bottom={FAN_BOTTOM} />
        </>
      }
    >
      <NutritionDiarySection viewedDate={viewedDate} onChangeViewedDate={setViewedDate} />
    </NutritionHub>
  );
}
