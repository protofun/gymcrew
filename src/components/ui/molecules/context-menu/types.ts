import type { ReactNode, RefObject } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

type TContextMenuTheme = "light" | "dark";
type TContextMenuContext =
  | "ContextMenu.Trigger"
  | "ContextMenu.Label"
  | "ContextMenu.Item"
  | "ContextMenu.Content"
  | "ContextMenu.Separator"
  | "Preview"
  | "Backdrop";
interface IRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface IContextMenuLayout {
  placeBelow: boolean;
  menuLeft: number;
  menuTop: number;
  shift: number;
  originX: number;
  originY: "top" | "bottom";
}

interface IContextMenuRoot {
  children: ReactNode;
  readonly theme?: TContextMenuTheme;
  readonly menuWidth?: number;
  readonly onOpenChange?: (open: boolean) => void;
}

interface IContextMenuTrigger {
  children: ReactNode;
  readonly disabled?: boolean;
  readonly longPressDuration?: number;
  readonly style?: StyleProp<ViewStyle>;
  /**
   * GymCrew patch: which gesture opens the menu. `"longPress"` (default) is the vendored iOS/Files-
   * style behavior — pair it with `onPress` below for a row that also does something on a plain tap
   * (e.g. navigate). `"press"` opens on a plain tap instead, for an ordinary dropdown-style trigger
   * (a filter pill, a sort button) where there is no separate tap action to also support.
   */
  readonly openTrigger?: "longPress" | "press";
  /**
   * GymCrew patch: a plain tap, on the SAME `Pressable` the long-press lives on — not a second,
   * nested one. Nesting a separately-`onPress`-ed Pressable inside this trigger's children looks
   * fine, but on release both fire: the trigger's `onLongPress` opens the menu AND the inner
   * Pressable's own `onPress` still goes through, e.g. navigating away right as the menu opens.
   * Give the trigger the tap here instead of wrapping pressable content in it. Ignored when
   * `openTrigger` is `"press"` — the tap there already means "open".
   */
  readonly onPress?: () => void;
}

interface IContextMenuContent {
  children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

interface IContextMenuItem {
  children: ReactNode;
  readonly onPress?: () => void;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly closeOnPress?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
}

interface IContextMenuItemIcon {
  children: ReactNode;
}

interface IContextMenuItemLabel {
  children: ReactNode;
}

interface IContextMenuItemSubtitle {
  children: ReactNode;
}

interface IContextMenuLabel {
  children: ReactNode;
  readonly style?: StyleProp<TextStyle>;
}

interface IContextMenuContext {
  visible: boolean;
  progress: SharedValue<number>;
  pressed: SharedValue<number>;
  theme: TContextMenuTheme;
  menuWidth: number;
  rect: IRect | null;
  layout: IContextMenuLayout | null;
  previewRef: RefObject<ReactNode>;
  openMenu: (rect: IRect) => void;
  close: () => void;
  setMenuHeight: (height: number) => void;
}

export type {
  TContextMenuTheme,
  IRect,
  IContextMenuLayout,
  IContextMenuRoot,
  IContextMenuTrigger,
  IContextMenuContent,
  IContextMenuItem,
  IContextMenuItemIcon,
  IContextMenuItemLabel,
  IContextMenuItemSubtitle,
  IContextMenuLabel,
  IContextMenuContext,
  TContextMenuContext,
};
