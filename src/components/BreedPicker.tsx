import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getBreedOptions, searchBreeds, type PetSpecies } from "../data/pet-breeds";
import { INPUT_LIMITS } from "../utils/input-limits";

interface BreedPickerProps {
  species: PetSpecies;
  value: string;
  onChange: (value: string) => void;
}

export function BreedPicker({ species, value, onChange }: BreedPickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const suggestions = useMemo(() => searchBreeds(species, value), [species, value]);
  const normalizedValue = value.trim().toLocaleLowerCase();
  const hasExactMatch = getBreedOptions(species).some(
    (option) => option.name.toLocaleLowerCase() === normalizedValue,
  );
  const canSuggest = species !== "other" && isFocused;
  const focusSearch = () => {
    setIsFocused(true);
    inputRef.current?.focus();
  };
  const chooseBreed = (name: string) => {
    onChange(name);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.input, isFocused && styles.inputFocused]}>
        <Pressable
          accessibilityHint="Opens the breed suggestions"
          accessibilityLabel="Search breeds"
          accessibilityRole="button"
          hitSlop={8}
          onPress={focusSearch}
          style={styles.searchButton}
        >
          <Ionicons color="#8A918E" name="search-outline" size={18} />
        </Pressable>
        <TextInput
          accessibilityLabel="Breed"
          autoCapitalize="words"
          maxLength={INPUT_LIMITS.breed}
          onBlur={() => setTimeout(() => setIsFocused(false), 240)}
          onChangeText={onChange}
          onFocus={() => setIsFocused(true)}
          placeholder={species === "other" ? "Type your pet's kind" : "Search or type a breed"}
          placeholderTextColor="#A9B0B3"
          ref={inputRef}
          style={styles.inputField}
          value={value}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear breed"
            accessibilityRole="button"
            hitSlop={13}
            onPress={() => {
              onChange("");
              focusSearch();
            }}
          >
            <Ionicons color="#8A918E" name="close-circle" size={19} />
          </Pressable>
        ) : null}
      </View>

      {canSuggest ? (
        <View style={styles.menu}>
          {suggestions.map((option) => (
            <Pressable
              accessibilityLabel={`Choose ${option.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: option.name.toLocaleLowerCase() === normalizedValue }}
              key={option.name}
              onPress={() => chooseBreed(option.name)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionText}>{option.name}</Text>
              {option.name.toLocaleLowerCase() === normalizedValue ? (
                <Ionicons color="#E66F51" name="checkmark" size={18} />
              ) : null}
            </Pressable>
          ))}

          {normalizedValue.length > 0 && !hasExactMatch ? (
            <Pressable
              accessibilityLabel={`Use custom breed ${value.trim()}`}
              accessibilityRole="button"
              onPress={() => chooseBreed(value.trim())}
              style={({ pressed }) => [styles.option, styles.customOption, pressed && styles.optionPressed]}
            >
              <View style={styles.customIcon}>
                <Ionicons color="#E66F51" name="create-outline" size={15} />
              </View>
              <View style={styles.customCopy}>
                <Text style={styles.optionText}>Use "{value.trim()}"</Text>
                <Text style={styles.optionHint}>Custom or mixed breed</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 20,
  },
  input: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E1D9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputFocused: {
    borderColor: "#E66F51",
    shadowColor: "#E66F51",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  inputField: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: "#252824",
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    paddingVertical: 10,
  },
  searchButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginLeft: -8,
    width: 44,
  },
  menu: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E2D9",
    backgroundColor: "#FFFFFF",
    padding: 6,
    shadowColor: "#2F312D",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    marginTop: 6,
  },
  option: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionPressed: {
    backgroundColor: "#FAF4EE",
  },
  optionText: {
    color: "#30332F",
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  customOption: {
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
    justifyContent: "flex-start",
  },
  customIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E9",
  },
  customCopy: {
    flex: 1,
  },
  optionHint: {
    marginTop: 1,
    color: "#888E89",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
  },
});
