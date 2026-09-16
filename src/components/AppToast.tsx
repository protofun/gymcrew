import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import ToastMessage, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";

import { colors } from "@/theme";

const VARIANTS = {
  success: { icon: "checkmark-circle" as const, color: colors.semantic.success },
  error: { icon: "alert-circle" as const, color: colors.semantic.error },
  info: { icon: "information-circle" as const, color: colors.semantic.info },
  achievement: { icon: "trophy" as const, color: colors.brand.yellow },
};

export type ToastVariant = keyof typeof VARIANTS;

function ToastCard({ variant, text1, text2 }: { variant: ToastVariant; text1?: string; text2?: string }) {
  const { icon, color } = VARIANTS[variant];

  return (
    <View
      className="w-[92%] flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-4 py-3"
      style={{ shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View className="flex-1">
        {!!text1 && <Text className="body-md font-body-semibold text-text-primary">{text1}</Text>}
        {!!text2 && <Text className="body-sm text-text-secondary">{text2}</Text>}
      </View>
    </View>
  );
}

function renderer(variant: ToastVariant) {
  function VariantToast({ text1, text2 }: ToastConfigParams<unknown>) {
    return <ToastCard variant={variant} text1={text1} text2={text2} />;
  }
  return VariantToast;
}

const toastConfig: ToastConfig = {
  success: renderer("success"),
  error: renderer("error"),
  info: renderer("info"),
  achievement: renderer("achievement"),
};

/** Renders once near the root of the app (see `_layout.tsx`) — every `showToast()` call (see
 * `lib/toast.ts`) surfaces through this single, on-brand instance instead of the library's plain
 * default look. */
export function AppToast() {
  return <ToastMessage config={toastConfig} />;
}
