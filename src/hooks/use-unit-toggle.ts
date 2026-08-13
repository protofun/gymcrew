import { useState } from "react";

type UseUnitToggleOptions = {
  initialValue: number;
  units: readonly [string, string];
  factor: number;
  decimals?: number;
};

export function useUnitToggle({ initialValue, units, factor, decimals = 1 }: UseUnitToggleOptions) {
  const [unit, setUnit] = useState<string>(units[0]);
  const [value, setValue] = useState(initialValue);

  function toggle() {
    if (unit === units[0]) {
      setValue(Number((value * factor).toFixed(decimals)));
      setUnit(units[1]);
    } else {
      setValue(Number((value / factor).toFixed(decimals)));
      setUnit(units[0]);
    }
  }

  return { value, setValue, unit, toggle };
}
