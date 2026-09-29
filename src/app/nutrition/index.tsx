import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";

import { AiChromaButton } from "@/components/AiChromaButton";
import { NutritionAddFan } from "@/components/NutritionAddFan";
import { NutritionDiarySection } from "@/components/NutritionDiarySection";
import { NutritionHub } from "@/components/NutritionHub";
import { fromDateKey, toDateKey } from "@/lib/date";

// The floating buttons: the add fan (58), centered on the bar, and the AI button (46) riding just to
// its right at the same vertical center — the fan itself moved off the bottom-right corner it used to
// sit in (see NutritionAddFan's own note), so this shifts with it instead of hanging off screen edge math.
const SCREEN_WIDTH = Dimensions.get("window").width;
const FAN_BOTTOM = 16;
const FAN_SIZE = 58;
const AI_SIZE = 46;
const AI_GAP = 14;

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
          <View style={{ position: "absolute", left: SCREEN_WIDTH / 2 + FAN_SIZE / 2 + AI_GAP, bottom: FAN_BOTTOM + (FAN_SIZE - AI_SIZE) / 2 }}>
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
