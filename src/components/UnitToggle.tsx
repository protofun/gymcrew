import { Pressable, Text } from "react-native";

type UnitToggleProps = {
  unit: string;
  onPress: () => void;
};

export function UnitToggle({ unit, onPress }: UnitToggleProps) {
  return (
    <Pressable onPress={onPress} className="rounded-md bg-divider px-2 py-1">
      <Text className="body-sm text-text-primary">{unit}</Text>
    </Pressable>
  );
}
