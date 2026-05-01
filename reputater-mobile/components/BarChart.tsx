import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

type Series = {
  label: string;
  values: { key: string; value: number }[];
  color: string;
};

type Props = {
  labels: string[]; // x-axis categories
  series: Series[]; // up to 2 series rendered side by side per label
  emptyText?: string;
  formatY?: (v: number) => string;
};

const ROW_HEIGHT = 24;
const ROW_GAP = 8;
const LABEL_WIDTH = 70;

export default function BarChart({ labels, series, emptyText, formatY }: Props) {
  if (labels.length === 0) {
    return <Text style={styles.empty}>{emptyText ?? "No data yet."}</Text>;
  }

  // Find max across all series for scaling
  const allValues = series.flatMap((s) => s.values.map((v) => v.value));
  const max = Math.max(1, ...allValues);

  const formatVal = formatY ?? ((v: number) => String(v));

  return (
    <View>
      {/* Legend */}
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>

      {labels.map((label) => (
        <View key={label} style={styles.row}>
          <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
          <View style={styles.barsCol}>
            {series.map((s) => {
              const v = s.values.find((x) => x.key === label)?.value ?? 0;
              const widthPct = (v / max) * 100;
              return (
                <View key={s.label} style={styles.barRow}>
                  <View style={[styles.bar, { width: `${widthPct}%`, backgroundColor: s.color }]} />
                  <Text style={styles.barValue}>{formatVal(v)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_GAP / 2,
  },
  rowLabel: { width: LABEL_WIDTH, fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  barsCol: { flex: 1, gap: 4 },
  barRow: { flexDirection: "row", alignItems: "center", height: ROW_HEIGHT, gap: 8 },
  bar: { height: ROW_HEIGHT - 4, borderRadius: 4, minWidth: 2 },
  barValue: { fontSize: 11, color: colors.text, fontWeight: "600" },
});
