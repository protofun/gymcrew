import { View } from "react-native";

import { Skeleton } from "@/components/Skeleton";

/** Sketches the shape of the real home screen (the big greeting, the week's seven dots and the start button, a
 * card, the training calendar, a couple of section rows) while the initial server sync is still pending — see
 * `home.tsx`'s `hasSyncedOnce` gate. Replaces a single centered spinner with something that
 * reads as "this screen is arriving" instead of "wait." */
export function HomeSkeleton() {
  return (
    <View className="flex-1 bg-background px-4 pt-6" style={{ gap: 26 }}>
      <View style={{ gap: 10 }}>
        <Skeleton width={170} height={16} radius={6} />
        <Skeleton width={240} height={44} radius={8} />
        <Skeleton width={190} height={44} radius={8} />
      </View>

      <View className="flex-row justify-between">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} width={34} height={34} radius={17} />
        ))}
      </View>

      <Skeleton width="100%" height={62} radius={31} />
      <Skeleton width="100%" height={130} radius={26} />

      <View style={{ gap: 10 }}>
        <Skeleton width={200} height={30} radius={6} />
        <Skeleton width="100%" height={150} radius={12} />
      </View>
    </View>
  );
}
