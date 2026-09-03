import { describe, expect, it } from "vitest";

type RawGlobOptions = {
  eager: true;
  import: "default";
  query: "?raw";
};

declare global {
  interface ImportMeta {
    glob(pattern: string, options: RawGlobOptions): Record<string, string>;
  }
}

const SURFACES = {
  ...import.meta.glob("./**/*.tsx", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  ...import.meta.glob("../../components/AppErrorBoundary.tsx", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  ...import.meta.glob("../../components/{BreedPicker,ConfirmationSheet,LoadingScreen,Toast}.tsx", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  ...import.meta.glob("../../components/feedback/OfflineBanner.tsx", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  ...import.meta.glob("../settings/**/*.tsx", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
};

type OpeningTag = {
  name: "Pressable" | "TextInput" | "TouchableHighlight" | "TouchableOpacity";
  offset: number;
  source: string;
};

const INTERACTIVE_TAGS = new Set<OpeningTag["name"]>([
  "Pressable",
  "TouchableHighlight",
  "TouchableOpacity",
]);

function openingTags(contents: string): OpeningTag[] {
  const tags: OpeningTag[] = [];
  const startTag = /<(Pressable|TextInput|TouchableHighlight|TouchableOpacity)\b/g;
  let match: RegExpExecArray | null;

  while ((match = startTag.exec(contents))) {
    const preceding = match.index > 0 ? (contents[match.index - 1] ?? "") : "";
    if (/[\w)$\]]/.test(preceding)) continue;
    let braces = 0;
    let quote: '"' | "'" | "`" | null = null;
    let escaped = false;

    for (let index = startTag.lastIndex; index < contents.length; index += 1) {
      const character = contents[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = null;
        }
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        braces += 1;
      } else if (character === "}") {
        braces = Math.max(0, braces - 1);
      } else if (character === ">" && braces === 0) {
        tags.push({
          name: match[1] as OpeningTag["name"],
          offset: match.index,
          source: contents.slice(match.index, index + 1),
        });
        startTag.lastIndex = index + 1;
        break;
      }
    }
  }

  return tags;
}

function hasJsxAttribute(source: string, name: string) {
  return new RegExp(`\\b${name}\\s*=`).test(source);
}

function sourceLocation(file: string, contents: string, offset: number) {
  const line = contents.slice(0, offset).split(/\r?\n/).length;
  return `${file}:${line}`;
}

function inspectSurface(file: string, contents: string) {
  const missingInteractionHandlers: string[] = [];
  const missingInteractiveRoles: string[] = [];
  const missingDisabledStates: string[] = [];
  const missingInputLabels: string[] = [];

  for (const tag of openingTags(contents)) {
    const location = sourceLocation(file, contents, tag.offset);
    const hiddenFromAccessibility =
      hasJsxAttribute(tag.source, "accessibilityElementsHidden") ||
      /\baccessible\s*=\s*{\s*false\s*}/.test(tag.source);
    if (
      INTERACTIVE_TAGS.has(tag.name) &&
      !hasJsxAttribute(tag.source, "onPress") &&
      !hasJsxAttribute(tag.source, "onLongPress") &&
      !hasJsxAttribute(tag.source, "onPressIn")
    ) {
      missingInteractionHandlers.push(location);
    }
    if (
      INTERACTIVE_TAGS.has(tag.name) &&
      !hiddenFromAccessibility &&
      !hasJsxAttribute(tag.source, "accessibilityRole")
    ) {
      missingInteractiveRoles.push(location);
    }
    if (
      INTERACTIVE_TAGS.has(tag.name) &&
      hasJsxAttribute(tag.source, "disabled") &&
      !hasJsxAttribute(tag.source, "accessibilityState")
    ) {
      missingDisabledStates.push(location);
    }
    if (
      tag.name === "TextInput" &&
      !hasJsxAttribute(tag.source, "accessibilityLabel") &&
      !hasJsxAttribute(tag.source, "accessibilityLabelledBy")
    ) {
      missingInputLabels.push(location);
    }
  }

  return {
    missingDisabledStates,
    missingInputLabels,
    missingInteractionHandlers,
    missingInteractiveRoles,
  };
}

describe("care accessibility contract", () => {
  const surfaces = Object.entries(SURFACES);

  it("connects every touch target to an interaction handler", () => {
    const missing = surfaces.flatMap(
      ([file, contents]) => inspectSurface(file, contents).missingInteractionHandlers,
    );
    expect(
      missing,
      `Missing interaction handler at:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("gives every touch target an explicit accessibility role", () => {
    const missing = surfaces.flatMap(
      ([file, contents]) => inspectSurface(file, contents).missingInteractiveRoles,
    );
    expect(missing, `Missing accessibilityRole at:\n${missing.join("\n")}`).toEqual(
      [],
    );
  });

  it("gives every text input an explicit accessible name", () => {
    const missing = surfaces.flatMap(
      ([file, contents]) => inspectSurface(file, contents).missingInputLabels,
    );
    expect(missing, `Missing input label at:\n${missing.join("\n")}`).toEqual([]);
  });

  it("announces disabled touch targets as disabled", () => {
    const missing = surfaces.flatMap(
      ([file, contents]) => inspectSurface(file, contents).missingDisabledStates,
    );
    expect(
      missing,
      `Missing disabled accessibility state at:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
