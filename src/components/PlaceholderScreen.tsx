import { Text, View } from "react-native";

import { colors } from "@/theme";

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }} className="items-center justify-center gap-2 px-6">
      <Text className="heading-3 text-text-primary">{title}</Text>
      <Text className="body-md text-center text-text-secondary">{description}</Text>
    </View>
  );
}
