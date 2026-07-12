import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, shadow } from "../../design";

interface LegalDocumentScreenProps {
  title: string;
  body: string;
  onClose: () => void;
}

/** Simple in-app legal document reader. */
export function LegalDocumentScreen({
  title,
  body,
  onClose,
}: LegalDocumentScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.close}
        >
          <Ionicons color={colors.ink} name="close" size={22} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.closeSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
  },
  close: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadow.subtle,
  },
  closeSpacer: { width: 40 },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
  },
});
