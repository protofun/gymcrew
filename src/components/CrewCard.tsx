import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { images } from "@/constants/images";
import { EXISTING_CREWS } from "@/data/crews";

// Stands in for "the crew the current user is in" until that's wired to
// real crew membership (onboarding's crew store only covers join/create
// intent, not a persisted membership record yet).
const MY_CREW = EXISTING_CREWS[0];

export function CrewCard() {
  return (
    <Pressable
      onPress={() => router.push("/crew")}
      className="mx-4 mt-8 flex-row items-center gap-3 overflow-hidden rounded-3xl border border-divider bg-surface p-4"
    >
      <Image
        source={images.mascotsCrew}
        resizeMode="contain"
        style={{ width: 190, height: 154, marginLeft: 4, marginVertical: -12 }}
      />

      <View className="flex-1 gap-1">
        <Text className="caption font-body-bold text-text-secondary">CREW</Text>
        <Text className="heading-4 text-text-primary">{MY_CREW.name}</Text>
        <Text className="body-md">
          <Text className="font-body-bold text-brand-yellow">{MY_CREW.members}</Text>
          <Text className="text-text-secondary"> / {MY_CREW.maxMembers} Members</Text>
        </Text>
        <Text className="caption font-body-semibold mt-1 text-brand-yellow">View crew</Text>
      </View>
    </Pressable>
  );
}
