import { View } from "react-native";

import { Skeleton } from "@/components/Skeleton";

/** Sketches the shape of the real home screen (greeting + start-workout card, crew card, training
 * calendar, a couple of widget rows) while the initial server sync is still pending — see
 * `home.tsx`'s `hasSyncedOnce` gate. Replaces a single centered spinner with something that
 * reads as "this screen is arriving" instead of "wait." */
export function HomeSkeleton() {
  return (
    <View className="flex-1 bg-background px-4 pt-6" style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        <Skeleton width={160} height={22} radius={6} />
        <Skeleton width="100%" height={120} radius={24} />
      </View>

      <Skeleton width="100%" height={90} radius={20} />

      <View style={{ gap: 10 }}>
        <Skeleton width={120} height={16} radius={6} />
        <Skeleton width="100%" height={140} radius={20} />
      </View>

      <View className="flex-row" style={{ gap: 12 }}>
        <Skeleton width="48%" height={100} radius={16} />
        <Skeleton width="48%" height={100} radius={16} />
      </View>

      <Skeleton width="100%" height={110} radius={20} />
    </View>
  );
}
