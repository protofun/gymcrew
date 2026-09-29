import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeInUp, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { AuthField } from "@/components/AuthField";
import { GoalSheet } from "@/components/GoalSheet";
import { GoalTargetRuler } from "@/components/GoalTargetRuler";
import { ArcList } from "@/components/ui/molecules/arc-list";
import { FieldLabel } from "@/components/OnboardingScreen";
import { PillRow } from "@/components/PillRow";
import { RingChoice } from "@/components/RingChoice";
import { SectionHeading } from "@/components/SectionHeading";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { AI_SAVE_BUTTON_COLORS } from "@/constants/ai-scan-theme";
import { CUSTOM_UNITS, GOAL_ICONS, GOAL_KINDS, GOAL_PRESETS, goalKind, targetSpec } from "@/data/goal-kinds";
import { useBodyLogStore } from "@/store/body-log-store";
import { useGoalsStore, type GoalMetric } from "@/store/goals-store";
import { colors, fontFamily } from "@/theme";

// The wheel is given a fixed height and told not to flex, or it would stretch to fill the sheet instead of showing a few items —
// itemHeight is generous (not the vendored default) so a heading-sized, rotated label never overlaps its neighbour.
const ARC_HEIGHT = 260;
const ARC_ITEM_HEIGHT = 96;
const ARC_SWEEP = 10;
const ARC_STYLE = { flexGrow: 0, flexShrink: 0, flexBasis: "auto" } as const;

// brand.green and semantic.success are the same color, so only one appears here.
const COLOR_OPTIONS = [colors.brand.yellow, colors.semantic.info, colors.semantic.success, colors.semantic.streak, colors.semantic.error];

type AddGoalModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Making a goal: a live preview ring on top that changes as you choose, ideas to start from, what the goal measures (most of it worked out
 * by the app itself — workouts, weight, protein, calories, food logging), an icon from a long list, a color, and the target — set by dragging
 * a ruler with the number rolling right above it. The save button turns into a check. */
export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const addGoal = useGoalsStore((state) => state.addGoal);
  const latestWeight = useBodyLogStore((state) => state.entries[0]?.weightKg) ?? 75;

  const [metric, setMetric] = useState<GoalMetric>("workouts");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>(GOAL_KINDS[1].icon);
  const [color, setColor] = useState<string>(GOAL_KINDS[1].color);
  const [customUnit, setCustomUnit] = useState("km");
  const [target, setTarget] = useState(GOAL_KINDS[1].target);
  // Bumped when the target changes some way other than dragging the ruler — a preset, another kind or unit.
  const [rulerKey, setRulerKey] = useState(0);

  const kind = goalKind(metric);
  const unit = metric === "custom" ? customUnit : kind.unit;
  const spec = targetSpec(metric, unit, target);
  const preview = useSharedValue(0);
  // While a preset moves the "what it measures" wheel to its kind, the wheel passes other kinds on the way — those must not be taken as separate choices.
  const wheelBusy = useRef(false);
  const kindIndex = GOAL_KINDS.findIndex((option) => option.key === metric);

  // The preview ring refills whenever the look of the goal changes, so each choice is seen.
  useEffect(() => {
    preview.value = withSequence(withTiming(0, { duration: 120 }), withTiming(72, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [icon, color, metric, preview]);

  function reset() {
    const first = GOAL_KINDS[1];
    setMetric(first.key);
    setLabel("");
    setIcon(first.icon);
    setColor(first.color);
    setCustomUnit("km");
    setTarget(first.target);
    setRulerKey((key) => key + 1);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function chooseKind(next: GoalMetric) {
    const nextKind = goalKind(next);
    setMetric(next);
    setIcon(nextKind.icon);
    setColor(nextKind.color);
    setTarget(next === "weight" ? Math.max(nextKind.min, Math.round((latestWeight - 5) * 2) / 2) : nextKind.target);
    setRulerKey((key) => key + 1);
  }

  function applyPreset(key: string) {
    const preset = GOAL_PRESETS.find((option) => option.key === key);
    if (!preset) return;
    wheelBusy.current = true;
    setTimeout(() => (wheelBusy.current = false), 900);
    
    setMetric(preset.metric);
    setLabel(preset.label);
    setIcon(preset.icon);
    setColor(preset.color);
    if (preset.unit) setCustomUnit(preset.unit);
    setTarget(preset.weightChange !== undefined ? Math.round((latestWeight + preset.weightChange) * 2) / 2 : preset.target);
    setRulerKey((current) => current + 1);
  }

  function changeUnit(next: string) {
    const nextSpec = CUSTOM_UNITS.find((option) => option.key === next) ?? CUSTOM_UNITS[0];
    setCustomUnit(next);
    setTarget((current) => Math.min(nextSpec.max, Math.max(nextSpec.min, current)));
    setRulerKey((current) => current + 1);
  }

  function save() {
    const isWeight = metric === "weight";
    addGoal({
      label: label.trim() || kind.label,
      icon,
      color,
      metric,
      direction: isWeight && target < latestWeight ? "decrease" : "increase",
      trackingMode: kind.auto ? "auto" : "manual",
      startValue: isWeight ? latestWeight : 0,
      targetValue: target,
      manualCurrentValue: isWeight ? latestWeight : 0,
      unit,
    });
  }

  return (
    <GoalSheet visible={visible} onClose={handleClose}>
      <SectionHeading id="home.goals.new" title="New Goal" eyebrow="What are you going for?" />

      <Animated.View entering={FadeInUp.duration(350)} className="flex-row items-center gap-5">
        <CircularProgress
          progress={preview}
          size={96}
          strokeWidth={8}
          gap={0}
          outerCircleColor={colors.neutral.divider}
          progressCircleColor={color}
          backgroundColor="transparent"
          renderIcon={() => <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={32} color={color} />}
        />
        <View className="flex-1 gap-1">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 30, letterSpacing: 1, color: colors.brand.white }} numberOfLines={2}>
            {(label.trim() || kind.label).toUpperCase()}
          </Text>
          <View className="flex-row items-baseline gap-1.5">
            <NumberFlow value={target} decimals={spec.step < 1 ? 1 : 0} fontSize={22} color={color} fontWeight="800" />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>{unit}</Text>
          </View>
        </View>
      </Animated.View>

      <View className="gap-2">
        <FieldLabel>Ideas</FieldLabel>
        <ArcList.Root height={ARC_HEIGHT} style={ARC_STYLE} itemHeight={ARC_ITEM_HEIGHT} sweep={ARC_SWEEP} side="left" snap haptics onIndexChange={(index) => !wheelBusy.current && applyPreset(GOAL_PRESETS[index].key)}>
          <ArcList.Viewport>
            {GOAL_PRESETS.map((preset, index) => (
              <ArcList.Item key={preset.key} onPress={() => applyPreset(GOAL_PRESETS[index].key)}>
                <ArcList.Indicator size={16} color={colors.neutral.divider} activeColor={colors.brand.yellow} />
                <View className="gap-0.5">
                  <ArcList.Label color={colors.neutral.textSecondary} activeColor={colors.brand.white} style={{ fontFamily: fontFamily.heading, fontSize: 19, letterSpacing: 1, lineHeight: 21 }}>
                    {preset.label.toUpperCase()}
                  </ArcList.Label>
                </View>
              </ArcList.Item>
            ))}
          </ArcList.Viewport>
        </ArcList.Root>
      </View>

      <AuthField
        label="Goal name"
        placeholders={[kind.label, "Run a 5K", "Bench 100 kg"]}
        value={label}
        onChangeText={(text) => {
          setLabel(text);
        }}
      />

      <View className="gap-2">
        <FieldLabel>What it measures</FieldLabel>
        <ArcList.Root height={ARC_HEIGHT} style={ARC_STYLE} itemHeight={ARC_ITEM_HEIGHT} sweep={ARC_SWEEP} side="left" snap haptics index={kindIndex} onIndexChange={(index) => !wheelBusy.current && chooseKind(GOAL_KINDS[index].key)}>
          <ArcList.Viewport>
            {GOAL_KINDS.map((option) => (
              <ArcList.Item key={option.key}>
                <ArcList.Indicator size={16} color={colors.neutral.divider} activeColor={option.color} />
                <ArcList.Label color={colors.neutral.textSecondary} activeColor={colors.brand.white} style={{ fontFamily: fontFamily.heading, fontSize: 19, letterSpacing: 1, lineHeight: 21 }}>
                  {option.label.toUpperCase()}
                </ArcList.Label>
              </ArcList.Item>
            ))}
          </ArcList.Viewport>
        </ArcList.Root>
        <View className="flex-row items-center gap-2">
          <Ionicons name={kind.auto ? "sparkles" : "create-outline"} size={14} color={kind.auto ? colors.brand.yellow : colors.neutral.textSecondary} />
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.neutral.textSecondary }}>{`${kind.auto ? "Worked out for you. " : ""}${kind.hint}`}</Text>
        </View>
      </View>

      <View className="gap-2">
        <FieldLabel>Icon</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {GOAL_ICONS.map((option) => (
            <RingChoice key={option} size={44} selected={icon === option} onPress={() => setIcon(option)}>
              <Ionicons name={option} size={20} color={icon === option ? color : colors.neutral.textSecondary} />
            </RingChoice>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <FieldLabel>Color</FieldLabel>
        <View className="flex-row flex-wrap gap-3">
          {COLOR_OPTIONS.map((option) => (
            <RingChoice key={option} size={44} selected={color === option} onPress={() => setColor(option)}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: option }} />
            </RingChoice>
          ))}
        </View>
      </View>

      {metric === "custom" && (
        <View className="gap-2">
          <FieldLabel>Unit</FieldLabel>
          <PillRow wrap options={CUSTOM_UNITS.map((option) => ({ key: option.key, label: option.key }))} value={customUnit} onChange={changeUnit} />
        </View>
      )}

      <GoalTargetRuler
        label={metric === "weight" ? `Target weight (now ${latestWeight} kg)` : "Target"}
        value={target}
        unit={unit}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        color={color}
        onChange={(value) => {
          setTarget(value);
        }}
        resetKey={rulerKey}
      />

      <View className="items-center">
        <SaveButton.Root onSave={save} onSaved={handleClose} colors={AI_SAVE_BUTTON_COLORS} minLoading={350} successPause={300}>
          <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Create goal</SaveButton.Label>
          <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Goal created</SaveButton.Saved>
        </SaveButton.Root>
      </View>
    </GoalSheet>
  );
}
