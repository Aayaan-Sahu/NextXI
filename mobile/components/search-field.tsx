import { StyleSheet, View, type TextInputProps } from "react-native";
import { SearchIcon } from "@/components/icons";
import { colors } from "@/lib/theme";
import { TextField } from "@/lib/ui";

/** The cream-300 pill search bar used atop Connections and Messages. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  returnKeyType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
}) {
  return (
    <View style={styles.field}>
      <SearchIcon />
      <TextField
        autoCapitalize="none"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        returnKeyType={returnKeyType}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    backgroundColor: colors["cream-300"],
    borderRadius: 10,
    flexDirection: "row",
    gap: 9,
    height: 40,
    paddingHorizontal: 12,
  },
  input: { backgroundColor: "transparent", borderWidth: 0, flex: 1, paddingHorizontal: 0, paddingVertical: 0 },
});
