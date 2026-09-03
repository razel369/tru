import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";
import type { Pet } from "../../types";

import { buildCareHandoffHtml, buildCareHandoffText, type CareHandoffOptions } from "./care-handoff";
import { removeTemporaryShareFile } from "./temporary-share-file";
import type { CareTask, HealthRecord } from "./types";

const OPTION_ROWS: { key: keyof CareHandoffOptions; icon: keyof typeof Ionicons.glyphMap; label: string; body: string }[] = [
  { key: "routine", icon: "time-outline", label: "Daily routine", body: "Meals, walks, water, grooming and instructions" },
  { key: "medications", icon: "medical-outline", label: "Medications", body: "Active medication timing, directions and allergies" },
  { key: "appointments", icon: "calendar-outline", label: "Appointments", body: "Upcoming visits, providers, locations and reminder timing" },
  { key: "health", icon: "pulse-outline", label: "Recent health", body: "The latest 12 health passport entries" },
  { key: "contacts", icon: "call-outline", label: "Contacts & ID", body: "Vet, emergency contact and microchip" },
];

export function CareHandoffSheet({ visible, pet, tasks, records, bottomInset, onClose }: { visible: boolean; pet: Pet; tasks: CareTask[]; records: HealthRecord[]; bottomInset: number; onClose: () => void }) {
  const [options, setOptions] = useState<CareHandoffOptions>({ appointments: true, contacts: true, health: false, medications: true, routine: true });
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const selectedCount = Object.values(options).filter(Boolean).length;

  const close = () => {
    if (status === "working") return;
    setStatus("idle");
    onClose();
  };

  const share = async () => {
    if (!selectedCount || status === "working") return;
    setStatus("working");
    let temporaryPdfUri: string | undefined;
    try {
      if (Platform.OS === "web") {
        await Share.share({ title: `${pet.name} care handoff`, message: buildCareHandoffText(pet, tasks, records, options) });
      } else {
        const { uri } = await Print.printToFileAsync({ html: buildCareHandoffHtml(pet, tasks, records, options) });
        temporaryPdfUri = uri;
        if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is unavailable");
        await Sharing.shareAsync(uri, { dialogTitle: `${pet.name} care handoff`, mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      removeTemporaryShareFile(temporaryPdfUri);
    }
  };

  return (
    <Modal allowSwipeDismissal={status !== "working"} animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close care handoff" accessibilityRole="button" accessibilityState={{ disabled: status === "working" }} disabled={status === "working"} onPress={close} style={[styles.close, status === "working" && styles.disabled]}><Ionicons color={colors.ink} name="close" size={21} /></Pressable>
          <View style={styles.flex}><Text style={styles.eyebrow}>PRIVATE CARE SHARE</Text><Text style={styles.title}>Care handoff</Text></View>
          <View style={styles.count}><Text style={styles.countText}>{selectedCount}/{OPTION_ROWS.length}</Text></View>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 26 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Ionicons color={colors.sage} name="shield-checkmark" size={27} /></View>
            <Text style={styles.heroTitle}>Share only what they need</Text>
            <Text style={styles.heroBody}>PawPair creates a local PDF for {pet.name}. Nothing is uploaded and every section is optional.</Text>
          </View>
          <Text style={styles.sectionLabel}>INCLUDE IN THIS HANDOFF</Text>
          <View style={styles.options}>
            {OPTION_ROWS.map((row) => {
              const selected = options[row.key];
              return <Pressable accessibilityLabel={`${row.label}. ${row.body}`} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: status === "working" }} disabled={status === "working"} key={row.key} onPress={() => setOptions((current) => ({ ...current, [row.key]: !current[row.key] }))} style={[styles.option, selected && styles.optionSelected, status === "working" && styles.disabled]}>
                <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons color={selected ? colors.white : colors.navy} name={row.icon} size={20} /></View>
                <View style={styles.flex}><Text style={styles.optionTitle}>{row.label}</Text><Text style={styles.optionBody}>{row.body}</Text></View>
                <View style={[styles.check, selected && styles.checkSelected]}>{selected && <Ionicons color={colors.white} name="checkmark" size={14} />}</View>
              </Pressable>;
            })}
          </View>
          <View style={styles.privacyNote}><Ionicons color={colors.navy} name="information-circle-outline" size={18} /><Text style={styles.privacyText}>After sharing, the recipient controls their copy. Review sensitive health and contact details before sending.</Text></View>
          {status === "error" && <Pressable accessibilityLabel="Dismiss sharing error" accessibilityLiveRegion="assertive" accessibilityRole="button" onPress={() => setStatus("idle")} style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={17} /><Text style={styles.errorText}>The PDF could not be shared. Tap to dismiss.</Text></Pressable>}
          <Pressable accessibilityLabel="Create and share care handoff" accessibilityRole="button" accessibilityState={{ busy: status === "working", disabled: !selectedCount || status === "working" }} disabled={!selectedCount || status === "working"} onPress={() => void share()} style={[styles.share, !selectedCount && styles.shareDisabled]}>
            {status === "working" ? <ActivityIndicator color={colors.white} /> : <Ionicons color={colors.white} name="share-outline" size={20} />}
            <Text style={styles.shareText}>{status === "working" ? "Preparing private PDF..." : "Create and share PDF"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  check: { alignItems: "center", borderColor: colors.line, borderRadius: 10, borderWidth: 1, height: 22, justifyContent: "center", width: 22 }, checkSelected: { backgroundColor: colors.sage, borderColor: colors.sage }, close: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 }, count: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 15, height: 30, justifyContent: "center", minWidth: 42 }, countText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 10 }, disabled: { opacity: 0.45 }, error: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 16, flexDirection: "row", gap: 7, marginHorizontal: 18, marginTop: 12, padding: 11 }, errorText: { color: colors.danger, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 10 }, eyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 }, flex: { flex: 1 }, header: { alignItems: "center", flexDirection: "row", gap: 11, paddingHorizontal: 18, paddingTop: 16 }, hero: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 27, marginHorizontal: 18, marginTop: 17, padding: 21 }, heroBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 300, textAlign: "center" }, heroIcon: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 26, height: 52, justifyContent: "center", marginBottom: 10, width: 52, ...shadow.subtle }, heroTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 21 }, option: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 72, paddingHorizontal: 12 }, optionBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, lineHeight: 13, marginTop: 2 }, optionIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 18, height: 38, justifyContent: "center", width: 38 }, optionIconSelected: { backgroundColor: colors.navy }, optionSelected: { borderColor: "rgba(72,145,132,0.55)" }, optionTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 13 }, options: { gap: 8, paddingHorizontal: 18 }, privacyNote: { alignItems: "flex-start", backgroundColor: colors.skySoft, borderRadius: 17, flexDirection: "row", gap: 8, marginHorizontal: 18, marginTop: 12, padding: 12 }, privacyText: { color: colors.navy, flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 10, lineHeight: 15 }, screen: { backgroundColor: colors.background, flex: 1 }, sectionLabel: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1.1, marginBottom: 8, marginHorizontal: 21, marginTop: 20 }, share: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 20, flexDirection: "row", gap: 8, justifyContent: "center", marginHorizontal: 18, marginTop: 14, minHeight: 52, ...shadow.subtle }, shareDisabled: { opacity: 0.4 }, shareText: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 13 }, title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 25, lineHeight: 28 },
});
