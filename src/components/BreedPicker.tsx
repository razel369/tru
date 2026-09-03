import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type PetSpecies } from "../data/pet-breeds";
import { colors } from "../design";
import { getVerifiedBreedOptions } from "../features/pet-visuals/registry";
import { INPUT_LIMITS } from "../utils/input-limits";

interface BreedPickerProps {
  species: PetSpecies;
  value: string;
  onChange: (value: string) => void;
}

export function BreedPicker({ species, value, onChange }: BreedPickerProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [species]);

  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const breeds = getVerifiedBreedOptions(species);
    if (!normalizedQuery) return breeds;
    return breeds.filter((option) =>
      option.name.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, species]);

  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
    setQuery("");
  };

  const chooseBreed = (name: string) => {
    onChange(name);
    close();
  };

  if (species === "other") {
    return (
      <View style={styles.inlineInput}>
        <Ionicons color={colors.muted} name="create-outline" size={18} />
        <TextInput
          accessibilityLabel="Pet kind"
          autoCapitalize="words"
          maxLength={INPUT_LIMITS.breed}
          onChangeText={onChange}
          placeholder="Type your pet's kind"
          placeholderTextColor={colors.muted}
          style={styles.inlineInputField}
          value={value}
        />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityHint="Opens a full-screen breed list"
        accessibilityLabel="Choose breed"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          open && styles.triggerActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.triggerIcon}>
          <Ionicons color={colors.sage} name="paw-outline" size={17} />
        </View>
        <Text
          numberOfLines={1}
          style={[styles.triggerText, !value && styles.placeholder]}
        >
          {value || "Choose a breed"}
        </Text>
        <Ionicons color={colors.muted} name="chevron-forward" size={18} />
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={close}
        presentationStyle="fullScreen"
        statusBarTranslucent={Platform.OS === "android"}
        visible={open}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.modal,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              paddingTop: Math.max(insets.top, 14),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.eyebrow}>{species.toUpperCase()} BREEDS</Text>
              <Text style={styles.modalTitle}>Choose their companion</Text>
            </View>
            <Pressable
              accessibilityLabel="Close breed picker"
              accessibilityRole="button"
              hitSlop={8}
              onPress={close}
              style={styles.closeButton}
            >
              <Ionicons color={colors.ink} name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons color={colors.muted} name="search" size={19} />
            <TextInput
              accessibilityLabel="Search available companion models"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={INPUT_LIMITS.breed}
              onChangeText={setQuery}
              placeholder="Search 3D-ready breeds"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityLabel="Clear breed search"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setQuery("")}
              >
                <Ionicons color={colors.muted} name="close-circle" size={19} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.verifiedNotice}>
            <Ionicons color={colors.sage} name="checkmark-circle" size={17} />
            <Text style={styles.verifiedNoticeText}>
              Every breed shown has its own verified PawPair companion. More
              breeds are being prepared.
            </Text>
          </View>

          <FlatList
            contentContainerStyle={styles.listContent}
            data={options}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.name}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons color={colors.sage} name="search-outline" size={24} />
                <Text style={styles.emptyTitle}>No exact match</Text>
                <Text style={styles.emptyCopy}>
                  That breed does not have a verified companion model yet. Try
                  a broader search.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected =
                item.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase();
              return (
                <Pressable
                  accessibilityLabel={`Choose ${item.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => chooseBreed(item.name)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      selected && styles.optionIconSelected,
                    ]}
                  >
                    <Ionicons
                      color={selected ? colors.white : colors.sage}
                      name="paw"
                      size={16}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.optionHint}>Exact companion visual</Text>
                  </View>
                  {selected ? (
                    <Ionicons
                      color={colors.coral}
                      name="checkmark-circle"
                      size={22}
                    />
                  ) : (
                    <Ionicons
                      color={colors.line}
                      name="ellipse-outline"
                      size={22}
                    />
                  )}
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 250,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 44,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    marginTop: 10,
  },
  eyebrow: {
    color: colors.coral,
    fontFamily: "Fredoka_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  inlineInput: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  inlineInputField: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    minHeight: 44,
    paddingVertical: 8,
  },
  listContent: { gap: 8, paddingBottom: 16 },
  modal: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 18,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 25,
    lineHeight: 29,
    marginTop: 2,
  },
  modalTitleCopy: { flex: 1 },
  option: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 64,
    paddingHorizontal: 12,
  },
  optionCopy: { flex: 1 },
  optionHint: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10,
    marginTop: 2,
    textTransform: "capitalize",
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  optionIconSelected: { backgroundColor: colors.sage },
  optionPressed: { opacity: 0.82 },
  optionSelected: {
    backgroundColor: colors.coralSoft,
    borderColor: colors.coral,
  },
  optionText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  optionTextSelected: { color: colors.navy },
  placeholder: { color: colors.muted },
  pressed: { opacity: 0.82 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 10,
    minHeight: 52,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    minHeight: 50,
    paddingVertical: 10,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 9,
  },
  triggerActive: { borderColor: colors.coral },
  triggerIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  triggerText: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  verifiedNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.sageSoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  verifiedNoticeText: {
    color: colors.navy,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    lineHeight: 15,
  },
});
