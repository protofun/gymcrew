import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { colors } from "@/theme";

const MINUTE_STEP = 5;

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function StepperColumn({
  label,
  value,
  onChange,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  max: number;
  step?: number;
}) {
  // Wraps at `max + step` (24 for hours, 60 for 5-minute-step minutes) — one full cycle past the
  // last valid value lands back on 0, keeping minute values on the same 5-multiple grid.
  function wrap(next: number): number {
    const modulus = max + step;
    return ((next % modulus) + modulus) % modulus;
  }

  return (
    <View className="items-center gap-2">
      <Pressable onPress={() => onChange(wrap(value + step))} hitSlop={10} className="h-9 w-9 items-center justify-center">
        <Ionicons name="chevron-up" size={22} color={colors.neutral.textSecondary} />
      </Pressable>
      <View className="w-16 items-center rounded-2xl bg-surface py-3">
        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 28 }} className="text-text-primary">
          {pad2(value)}
        </Text>
      </View>
      <Pressable onPress={() => onChange(wrap(value - step))} hitSlop={10} className="h-9 w-9 items-center justify-center">
        <Ionicons name="chevron-down" size={22} color={colors.neutral.textSecondary} />
      </Pressable>
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

type TimePickerModalProps = {
  visible: boolean;
  title?: string;
  /** "HH:mm", 24h. */
  value: string;
  onClose: () => void;
  onSelect: (time: string) => void;
};

/** A real hour/minute picker (any hour, 5-minute steps) — not a fixed set of preset times, so any
 * time of day can actually be chosen. No native/date-time-picker dependency: two simple stepper
 * columns keep this consistent with the rest of the app's hand-built pickers (see DatePickerModal). */
export function TimePickerModal({ visible, title = "Pick a time", value, onClose, onSelect }: TimePickerModalProps) {
  const [hour, setHour] = useState(() => parseTime(value).hour);
  const [minute, setMinute] = useState(() => parseTime(value).minute);

  // Re-syncs the draft to the real value each time the sheet opens, so a previous unsaved scroll
  // (closed without confirming) never lingers into the next open. A `useEffect` on `visible`
  // rather than Modal's `onShow`, which isn't reliable on React Native Web.
  useEffect(() => {
    if (!visible) return;
    const parsed = parseTime(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-5 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="heading-4 text-text-primary">{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center gap-4">
          <StepperColumn label="Hour" value={hour} onChange={setHour} max={23} />
          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 28 }} className="text-text-secondary">
            :
          </Text>
          <StepperColumn label="Minute" value={minute} onChange={setMinute} max={55} step={MINUTE_STEP} />
        </View>

        <Pressable
          onPress={() => onSelect(`${pad2(hour)}:${pad2(minute)}`)}
          className="items-center rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-md font-body-semibold text-brand-iron">Set Reminder Time</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
