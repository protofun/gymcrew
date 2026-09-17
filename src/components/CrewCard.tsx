import { router } from "expo-router";
import { Image, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { images } from "@/constants/images";
import { EditableText } from "@/components/EditableText";
import { useCrewStore } from "@/store/crew-store";

export function CrewCard() {
  const name = useCrewStore((state) => state.name);
  const memberCount = useCrewStore((state) => state.members.length);
  const maxMembers = useCrewStore((state) => state.maxMembers);

  return (
    <Card onPress={() => router.push("/crew")} className="mx-4 mt-8 flex-row items-center gap-3 p-4">
      <Image
        source={images.mascotsCrew}
        resizeMode="contain"
        style={{ width: 190, height: 154, marginLeft: 4, marginVertical: -12 }}
      />

      <View className="flex-1 gap-1">
        <Text className="caption font-body-bold text-text-secondary">CREW</Text>
        {memberCount > 0 ? (
          <>
            <EditableText id="home.crewCard.name" className="heading-4 text-text-primary" numberOfLines={1}>
              {name}
            </EditableText>
            <View className="flex-row items-baseline">
              <EditableText id="home.crewCard.memberCount" className="body-md font-body-bold text-brand-yellow">
                {String(memberCount)}
              </EditableText>
              <Text className="body-md text-text-secondary"> / {maxMembers} Members</Text>
            </View>
            <Text className="caption font-body-semibold mt-1 text-brand-yellow">View crew</Text>
          </>
        ) : (
          <>
            <Text className="heading-4 text-text-primary">No Crew Yet</Text>
            <Text className="body-sm text-text-secondary">Join or create one to compete together</Text>
            <Text className="caption font-body-semibold mt-1 text-brand-yellow">Set up your crew</Text>
          </>
        )}
      </View>
    </Card>
  );
}
