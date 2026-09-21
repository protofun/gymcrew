import { useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ReceiptCard } from "@/components/ui/pieces/receipt-card";

type ProgressReceiptProps = {
  /** e.g. "Sep 15 – 21". */
  rangeLabel: string;
  rows: { label: string; value: string }[];
  totalLabel: string;
  totalValue: string;
  /** Printed under the barcode — anything stable for the week. */
  code: string;
};

/** The week as a receipt: what you ate, drank and trained, itemised, with a total at the bottom. */
export function ProgressReceipt({ rangeLabel, rows, totalLabel, totalValue, code }: ProgressReceiptProps) {
  const { width } = useWindowDimensions();

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: "center" }}>
      <ReceiptCard.Root width={Math.min(width - 40, 360)}>
        <ReceiptCard.Header>
          <ReceiptCard.Store>GYMCREW WEEKLY</ReceiptCard.Store>
          <ReceiptCard.Meta>{rangeLabel}</ReceiptCard.Meta>
        </ReceiptCard.Header>
        <ReceiptCard.Separator />
        <ReceiptCard.Items>
          {rows.map((row) => (
            <ReceiptCard.Item key={row.label} label={row.label} value={row.value} />
          ))}
        </ReceiptCard.Items>
        <ReceiptCard.Separator variant="solid" />
        <ReceiptCard.Total label={totalLabel} value={totalValue} />
        <ReceiptCard.Note>Numbers from your own log. Keep it going.</ReceiptCard.Note>
        <ReceiptCard.Barcode code={code} />
        <ReceiptCard.TornEdge side="bottom" />
      </ReceiptCard.Root>
    </Animated.View>
  );
}
