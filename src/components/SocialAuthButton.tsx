import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type SocialProvider = "google" | "facebook" | "apple";

type SocialAuthButtonProps = {
  provider: SocialProvider;
  onPress?: () => void;
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  apple: "Continue with Apple",
};

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "facebook") {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#1877F2]">
        <Ionicons name="logo-facebook" size={16} color="#FFFFFF" />
      </View>
    );
  }
  if (provider === "apple") {
    return <Ionicons name="logo-apple" size={22} color="#FFFFFF" />;
  }
  return <Ionicons name="logo-google" size={20} color="#FFFFFF" />;
}

export function SocialAuthButton({ provider, onPress }: SocialAuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-divider bg-surface px-4 py-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <ProviderIcon provider={provider} />
      <Text className="body-lg flex-1 text-center text-text-primary">{PROVIDER_LABEL[provider]}</Text>
    </Pressable>
  );
}
