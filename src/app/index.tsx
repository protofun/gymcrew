import { ScrollView, Text, View } from "react-native";

const SWATCHES = [
  { label: "Gym Crew Yellow", className: "bg-brand-yellow" },
  { label: "Energy Green", className: "bg-brand-green" },
  { label: "Pure White", className: "bg-brand-white" },
  { label: "Iron Gray", className: "bg-brand-iron" },
  { label: "Success", className: "bg-success" },
  { label: "Warning", className: "bg-warning" },
  { label: "Streak", className: "bg-streak" },
  { label: "Error", className: "bg-error" },
  { label: "Info", className: "bg-info" },
  { label: "Surface", className: "bg-surface" },
  { label: "Divider", className: "bg-divider" },
];

export default function Index() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-6 pb-16">
      <Text className="heading-1 text-text-primary">GYMCREW</Text>
      <Text className="heading-2 text-text-primary">Section Title</Text>
      <Text className="heading-3 text-text-primary">Card Title</Text>
      <Text className="heading-4 text-text-primary">Subheading</Text>
      <Text className="body-lg text-text-primary">Body Large — important content like today&apos;s summary.</Text>
      <Text className="body-md text-text-secondary">Body Medium — regular body copy for descriptions.</Text>
      <Text className="body-sm text-text-secondary">Body Small — supporting text and helper copy.</Text>
      <Text className="caption text-text-secondary">CAPTION — LABELS & META TEXT</Text>

      <View className="gap-3">
        <Text className="heading-4 text-text-primary">Colors</Text>
        <View className="flex-row flex-wrap gap-3">
          {SWATCHES.map((swatch) => (
            <View key={swatch.label} className="w-24 gap-2">
              <View className={`h-16 w-24 rounded-xl border border-divider ${swatch.className}`} />
              <Text className="caption text-text-secondary">{swatch.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
