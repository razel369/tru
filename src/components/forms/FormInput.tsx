import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../design";

interface FormInputProps {
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  keyboardType?: "default" | "number-pad";
  onChange: (value: string) => void;
}

/**
 * Labeled text input used in the Add Medication form.
 * Extracted verbatim from App.tsx in stage 2.
 */
export function FormInput({
  label,
  value,
  placeholder,
  suffix,
  keyboardType,
  onChange,
}: FormInputProps) {
  return (
    <View style={styles.formInputGroup}>
      <Text style={styles.formInputLabel}>{label}</Text>
      <View style={styles.formInputShell}>
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#A9B0B3"
          style={styles.formInput}
          value={value}
        />
        {suffix && <Text style={styles.formInputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

export function FormLabel({ label }: { label: string }) {
  return <Text style={styles.formLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  formInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    padding: 0,
  },
  formInputGroup: { marginBottom: 15 },
  formInputLabel: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
    marginBottom: 7,
  },
  formInputShell: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    paddingHorizontal: 13,
  },
  formInputSuffix: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  formLabel: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
    marginBottom: 10,
  },
});
