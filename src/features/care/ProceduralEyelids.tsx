import { Animated, Image, type ImageSourcePropType, StyleSheet, View } from "react-native";

import type { PetRig25DEye } from "../pet-motion";

export function ProceduralEyelids({
  eyes,
  height,
  progress,
  source,
  width,
}: {
  eyes: readonly PetRig25DEye[];
  height: number;
  progress: Animated.Value;
  source: ImageSourcePropType;
  width: number;
}) {
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.22, 1],
    outputRange: [0, 0.28, 1, 1],
  });

  return (
    <>
      {eyes.map((eye, index) => {
        const calibratedHeight = height * eye.height;
        const calibratedWidth = width * eye.width;
        const eyeHeight = calibratedHeight * 0.58;
        const eyeWidth = calibratedWidth * 0.66;
        const upperLidHeight = eyeHeight * 0.58;
        const lowerLidHeight = eyeHeight * 0.48;
        const upperTranslateY = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-upperLidHeight * 1.08, -upperLidHeight * 0.52, 0],
        });
        const lowerTranslateY = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [lowerLidHeight * 1.08, lowerLidHeight * 0.52, 0],
        });

        return (
          <View
            key={`procedural-eye-${index}`}
            pointerEvents="none"
            style={[
              styles.eyeClip,
              {
                borderRadius: eyeWidth * 0.5,
                height: eyeHeight,
                left: width * eye.x + (calibratedWidth - eyeWidth) * 0.5,
                top: height * eye.y + (calibratedHeight - eyeHeight) * 0.5,
                transform: [{ rotate: index === 0 ? "-1.5deg" : "1.5deg" }],
                width: eyeWidth,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.lid,
                styles.upperLid,
                {
                  height: upperLidHeight,
                  opacity,
                  transform: [{ translateY: upperTranslateY }],
                  width: eyeWidth,
                },
              ]}
            >
              <Image
                resizeMode="contain"
                source={source}
                style={{
                  height,
                  left: -width * eye.x,
                  position: "absolute",
                  top: -height * (eye.y - eye.sampleOffsetY),
                  width,
                }}
              />
              <View style={styles.lidLine} />
            </Animated.View>
            <Animated.View
              style={[
                styles.lid,
                styles.lowerLid,
                {
                  height: lowerLidHeight,
                  opacity,
                  transform: [{ translateY: lowerTranslateY }],
                  width: eyeWidth,
                },
              ]}
            >
              <Image
                resizeMode="contain"
                source={source}
                style={{
                  height,
                  left:
                    -width * eye.x - (calibratedWidth - eyeWidth) * 0.5,
                  position: "absolute",
                  top: -height * (eye.y + eye.sampleOffsetY),
                  width,
                }}
              />
            </Animated.View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  eyeClip: {
    overflow: "hidden",
    position: "absolute",
    zIndex: 8,
  },
  lid: {
    overflow: "hidden",
    position: "absolute",
  },
  lowerLid: {
    bottom: 0,
    left: 0,
  },
  lidLine: {
    backgroundColor: "rgba(38, 27, 22, 0.26)",
    borderRadius: 999,
    bottom: 0,
    height: 1,
    left: "16%",
    position: "absolute",
    right: "16%",
  },
  upperLid: {
    left: 0,
    top: 0,
  },
});
