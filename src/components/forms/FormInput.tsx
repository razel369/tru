import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, shadow } from "../../design";

interface FormInputProps {
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  keyboardType?: "default" | "number-pad";
  onChange: (value: string) => void;
}

/** Labeled clay text input for medication / pet forms. */
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
  formInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    padding: 0,
  },
  formInputGroup: { marginBottom: 15 },
  formInputLabel: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    marginBottom: 7,
  },
  formInputShell: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 14,
    ...shadow.subtle,
  },
  formInputSuffix: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  formLabel: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
    marginBottom: 10,
  },
});
