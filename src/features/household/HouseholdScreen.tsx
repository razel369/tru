import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { MotionPressable } from "../../components/motion";
import { colors } from "../../design";
import { currentUser, signIn } from "./auth";
import {
  acceptInvite,
  createHousehold,
  createInvite,
  listHouseholdsForUser,
  listMembers,
} from "./service";
import { useEffect, useState } from "react";

interface HouseholdScreenProps {
  onClose: () => void;
}

/**
 * Household management — the user sees the households they
 * belong to, the members of each, and can create new invites.
 * Stage 8 ships the in-memory state machine; the real Supabase
 * implementation lands in stage 8-final.
 */
export function HouseholdScreen({ onClose }: HouseholdScreenProps) {
  const insets = useSafeAreaInsets();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [, setRevision] = useState(0);
  const [previewUser, setPreviewUser] = useState(currentUser());

  useEffect(() => {
    if (previewUser) return;
    void signIn("local-dev").then((session) => setPreviewUser(session.user));
  }, [previewUser]);

  const me = previewUser;
  const households = me ? listHouseholdsForUser() : [];
  const active = households[0];
  const members = active ? listMembers(active.id) : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="close-outline"
        eyebrow="CAREGIVERS"
        onAction={onClose}
        title="Household"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        {households.length === 0 && (
          <View style={styles.card}>
            <Ionicons
              color={colors.muted}
              name="people-outline"
              size={28}
            />
            <Text style={styles.title}>No household yet</Text>
            <Text style={styles.body}>
              Create one to invite caregivers and sync doses
              across devices.
            </Text>
            <MotionPressable
              onPress={() => {
                if (!me) return;
                createHousehold(`${me.displayName}'s household`);
                setRevision((value) => value + 1);
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create household</Text>
            </MotionPressable>
          </View>
        )}

        {active && (
          <View style={styles.card}>
            <Text style={styles.label}>HOUSEHOLD</Text>
            <Text style={styles.title}>{active.name}</Text>

            <Text style={styles.label}>MEMBERS</Text>
            {members.length === 0 ? (
              <Text style={styles.body}>Just you so far.</Text>
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {m.userId === me?.id
                        ? me.displayName.slice(0, 1)
                        : m.userId.slice(-2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.memberName}>
                      {m.userId === me?.id ? me.displayName : `Caregiver ${m.userId.slice(-3)}`}
                    </Text>
                    <Text style={styles.memberRole}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.label}>INVITE</Text>
            {inviteCode ? (
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>{inviteCode}</Text>
                <Text style={styles.codeHint}>
                  Share this code. It expires in 24 hours and
                  can only be used once.
                </Text>
              </View>
            ) : (
              <MotionPressable
                onPress={() => {
                  if (!active) return;
                  const invite = createInvite(active.id, "caregiver");
                  setInviteCode(invite.token);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Generate invite</Text>
              </MotionPressable>
            )}

            <Text style={styles.label}>JOIN EXISTING</Text>
            <MotionPressable
              onPress={() => {
                if (!inviteCode) return;
                acceptInvite(inviteCode);
                setInviteCode(null);
                setRevision((value) => value + 1);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Try accepting the code above
              </Text>
            </MotionPressable>
          </View>
        )}

        <Text style={styles.footer}>
          Design preview uses a local household. Invites and members reset when the app restarts.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  codeBlock: {
    backgroundColor: colors.skySoft,
    borderRadius: 18,
    marginTop: 8,
    padding: 16,
  },
  codeHint: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 6,
  },
  codeText: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
    letterSpacing: 1.5,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  flex: { flex: 1 },
  footer: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    textAlign: "center",
  },
  label: {
    color: colors.sky,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 6,
    marginTop: 16,
  },
  memberAvatar: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginRight: 12,
    width: 36,
  },
  memberInitial: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  memberName: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  memberRole: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  memberRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    marginTop: 14,
    minHeight: 48,
    paddingVertical: 12,
    shadowColor: colors.coral,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 999,
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
    marginTop: 6,
  },
});
