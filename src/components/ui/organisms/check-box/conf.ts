const PADDING = 10;
const VIEWPORT_SIZE = 64 + PADDING;
const TICK_PATH = "M20 32L28 40L44 24";
const BOX_PATH =
  "M24 0.5H40C48.5809 0.5 54.4147 2.18067 58.117 5.88299C61.8193 9.58532 63.5 15.4191 63.5 24V40C63.5 48.5809 61.8193 54.4147 58.117 58.117C54.4147 61.8193 48.5809 63.5 40 63.5H24C15.4191 63.5 9.58532 61.8193 5.88299 58.117C2.18067 54.4147 0.5 48.5809 0.5 40V24C0.5 15.4191 2.18067 9.58532 5.88299 5.88299C9.58532 2.18067 15.4191 0.5 24 0.5Z";

// GymCrew patch: `BOX_PATH`/`TICK_PATH` are fixed strings — their real length (`getTotalLength()`)
// never changes, so it's measured once (a real SVG in a real browser, not estimated) and hardcoded
// here instead of at runtime. The original component measured via each `<Path>`'s `onLayout` —
// real on native, but react-native-svg's WEB `<Path>` never fires `onLayout` at all (a real "Unknown
// event handler property onLayout" console warning, confirmed), so `pathLength` stayed 0 forever and
// the whole checkbox (box outline AND checkmark) rendered fully transparent on web, permanently.
// Redo this patch if the component is ever re-added with `--overwrite`.
const BOX_PATH_LENGTH = 219.13525390625;
const TICK_PATH_LENGTH = 33.941123962402344;

export { PADDING, BOX_PATH, BOX_PATH_LENGTH, TICK_PATH, TICK_PATH_LENGTH, VIEWPORT_SIZE };
