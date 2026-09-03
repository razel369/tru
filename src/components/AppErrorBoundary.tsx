import { Ionicons } from "@expo/vector-icons";
import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  retryKey: number;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production deliberately avoids sending private care data to a logger.
    if (__DEV__) {
      console.error("[PawPair recovery]", error, info.componentStack);
    }
  }

  private retry = () => {
    this.setState((current) => ({
      error: null,
      retryKey: current.retryKey + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.screen}>
          <View
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={styles.card}
          >
            <View style={styles.iconShell}>
              <Ionicons color="#173042" name="paw" size={30} />
            </View>
            <Text style={styles.eyebrow}>PAWPAIR RECOVERY</Text>
            <Text style={styles.title}>Let's get back on our feet</Text>
            <Text style={styles.body}>
              Something interrupted this screen. Your care data stays safely on
              this device, so you can retry without resetting anything.
            </Text>
            {__DEV__ && this.state.error.message ? (
              <Text selectable style={styles.debugMessage}>
                {this.state.error.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityHint="Reloads the PawPair interface without deleting care data"
              accessibilityLabel="Try loading PawPair again"
              accessibilityRole="button"
              onPress={this.retry}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>Try again</Text>
              <Ionicons color="#FFFFFF" name="refresh" size={18} />
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
    );
  }
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#173042",
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  actionText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 15,
  },
  body: {
    color: "#5F6C72",
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(23,48,66,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    maxWidth: 390,
    paddingHorizontal: 28,
    paddingVertical: 34,
    shadowColor: "#173042",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    width: "100%",
  },
  debugMessage: {
    color: "#8D3D3D",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  eyebrow: {
    color: "#9B7048",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  iconShell: {
    alignItems: "center",
    backgroundColor: "#E8F0E8",
    borderRadius: 24,
    height: 66,
    justifyContent: "center",
    marginBottom: 22,
    transform: [{ rotate: "-4deg" }],
    width: 66,
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#F3EBDD",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  title: {
    color: "#173042",
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 30,
    lineHeight: 35,
    marginBottom: 12,
    textAlign: "center",
  },
});
