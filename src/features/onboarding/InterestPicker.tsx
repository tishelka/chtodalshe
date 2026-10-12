import { StyleSheet, View } from "react-native";
import { CATEGORIES, type Category } from "../../types/domain";
import { categoryLabels } from "../../lib/labels";
import { categoryStyle } from "../../theme/categories";
import { FilterOption } from "../../components/ui";
export function InterestPicker({
  selected,
  onChange,
}: {
  selected: Category[];
  onChange: (categories: Category[]) => void;
}) {
  return (
    <View style={styles.options}>
      {CATEGORIES.map((category) => (
        <FilterOption
          key={category}
          label={categoryLabels[category]}
          icon={categoryStyle[category].icon}
          selected={selected.includes(category)}
          onPress={() =>
            onChange(
              selected.includes(category)
                ? selected.filter((item) => item !== category)
                : [...selected, category],
            )
          }
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({ options: { gap: 10 } });
