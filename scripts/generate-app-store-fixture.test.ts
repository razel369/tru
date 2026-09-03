// @ts-nocheck -- This Node-only release test is executed by Vitest, not bundled.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getPetCareStateValidationIssue } from "../src/features/care/state-validation";

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) rmSync(directory, { force: true, recursive: true });
  }
});

describe("App Store screenshot fixture", () => {
  it("generates a valid isolated care state and Watch payload", () => {
    const outputDirectory = mkdtempSync(
      path.join(tmpdir(), "pawpair-app-store-fixture-"),
    );
    temporaryDirectories.push(outputDirectory);

    execFileSync(
      process.execPath,
      [
        path.resolve("scripts/generate-app-store-fixture.mjs"),
        outputDirectory,
      ],
      { stdio: "pipe" },
    );

    const state = JSON.parse(
      readFileSync(path.join(outputDirectory, "care-state.json"), "utf8"),
    );
    const watchSnapshot = JSON.parse(
      readFileSync(path.join(outputDirectory, "watch-snapshot.json"), "utf8"),
    );

    expect(getPetCareStateValidationIssue(state)).toBeNull();
    expect(state.pets).toHaveLength(2);
    expect(
      state.pets.every(
        (pet: { visual?: { status?: string } }) =>
          pet.visual?.status === "ready",
      ),
    ).toBe(true);
    expect(watchSnapshot.items).toHaveLength(3);
  });
});
