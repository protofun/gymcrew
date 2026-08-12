import { useState } from "react";

type UseUnitToggleOptions = {
  initialValue: string;
  units: readonly [string, string];
  factor: number;
};

export function useUnitToggle({ initialValue, units, factor }: UseUnitToggleOptions) {
  const [unit, setUnit] = useState<string>(units[0]);
  const [value, setValue] = useState(initialValue);

  function toggle() {
    const current = parseFloat(value) || 0;
    if (unit === units[0]) {
      setValue((current * factor).toFixed(1));
      setUnit(units[1]);
    } else {
      setValue((current / factor).toFixed(0));
      setUnit(units[0]);
    }
  }

  return { value, setValue, unit, toggle };
}
