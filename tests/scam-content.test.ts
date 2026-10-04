import { describe, expect, it } from "vitest";
import { lessons, sources } from "../shared/content";
import { scamLessons } from "../shared/scam-lessons";
import { scamStories } from "../shared/scam-stories";
import type { Localized } from "../shared/types";

const sourceIds = new Set(sources.map((source) => source.id));
const lessonIds = new Set(lessons.map((lesson) => lesson.id));

function expectTrilingual(value: Localized, where: string) {
  expect(value.en.trim(), where).not.toBe("");
  expect(value.en, where).toMatch(/[A-Za-z]/);
  expect(value.hi, where).toMatch(/\p{Script=Devanagari}/u);
  expect(value.bn, where).toMatch(/\p{Script=Bengali}/u);
  // Bengali copy uses Bengali digits, as the rest of the app does.
  expect(
    value.bn.replace(
      /cybercrime\.gov\.in|UPI|PIN|OTP|KYC|APK|SMS|IPO|VIP|TRAI|I4C|QR/g,
      "",
    ),
    where,
  ).not.toMatch(/[0-9]/);
}

describe("scam lessons", () => {
  it("adds eight unique lessons after the start-here lesson", () => {
    expect(scamLessons).toHaveLength(8);
    expect(lessons).toHaveLength(15);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(15);
    expect(lessons[0].id).toBe("risk");
    expect(lessons.slice(1, 9).map((lesson) => lesson.id)).toEqual(
      scamLessons.map((lesson) => lesson.id),
    );
  });
  it("is complete in English, Hindi and Bengali with a valid quiz", () => {
    for (const lesson of scamLessons) {
      for (const key of [
        "title",
        "subtitle",
        "category",
        "analogy",
        "explanation",
        "takeaway",
        "question",
        "feedback",
      ] as const)
        expectTrilingual(lesson[key], `${lesson.id}.${key}`);
      expect(lesson.options).toHaveLength(3);
      lesson.options.forEach((option, i) =>
        expectTrilingual(option, `${lesson.id}.options[${i}]`),
      );
      expect(lesson.answer).toBeGreaterThanOrEqual(0);
      expect(lesson.answer).toBeLessThan(lesson.options.length);
      expect(lesson.minutes).toBeGreaterThan(0);
    }
  });
  it("cites only official sources that exist", () => {
    for (const lesson of scamLessons) {
      expect(lesson.sourceIds.length, lesson.id).toBeGreaterThan(0);
      for (const id of lesson.sourceIds)
        expect(sourceIds.has(id), id).toBe(true);
    }
  });
  it("keeps the UPI lesson about the UPI PIN and recovery advice in context", () => {
    const upi = scamLessons.find((lesson) => lesson.id === "upi-pin")!;
    expect(upi.title.en).toContain("UPI PIN");
    expect(upi.takeaway.en).toContain(
      "Receiving money never requires your UPI PIN",
    );
    const after = scamLessons.find((lesson) => lesson.id === "after-fraud")!;
    expect(after.takeaway.en).toContain("unsolicited agents");
    expect(after.explanation.en).toContain(
      "Reporting does not guarantee recovery",
    );
  });
});

describe("scam stories", () => {
  it("has unique stories that link to an existing lesson", () => {
    expect(scamStories.length).toBeGreaterThanOrEqual(4);
    expect(new Set(scamStories.map((story) => story.id)).size).toBe(
      scamStories.length,
    );
    for (const story of scamStories) {
      expect(lessonIds.has(story.lessonId), story.id).toBe(true);
      expect(story.sourceIds.length, story.id).toBeGreaterThan(0);
      for (const id of story.sourceIds)
        expect(sourceIds.has(id), id).toBe(true);
    }
  });
  it("is complete in three languages at every step", () => {
    for (const story of scamStories) {
      for (const key of ["title", "subtitle", "summary"] as const)
        expectTrilingual(story[key], `${story.id}.${key}`);
      expect(story.actions.length, story.id).toBeGreaterThanOrEqual(2);
      story.actions.forEach((action, i) =>
        expectTrilingual(action, `${story.id}.actions[${i}]`),
      );
      expect(story.steps.length, story.id).toBeGreaterThanOrEqual(3);
      story.steps.forEach((step, i) => {
        for (const key of [
          "speaker",
          "message",
          "tactic",
          "reveal",
          "safe",
          "risky",
        ] as const)
          expectTrilingual(step[key], `${story.id}.steps[${i}].${key}`);
        expect(step.safe.en).not.toBe(step.risky.en);
      });
    }
  });
  it("varies where the safe reply appears and never embeds a real link or phone number in fake messages", () => {
    for (const story of scamStories) {
      const order = story.steps.map((step) => step.safeFirst);
      expect(order.includes(true) && order.includes(false), story.id).toBe(
        true,
      );
      for (const step of story.steps)
        for (const text of Object.values(step.message)) {
          expect(text).not.toMatch(/https?:\/\/|www\.|\.com\b|\.in\b/i);
          expect(text).not.toMatch(/\b\d{10}\b|\+91/);
        }
    }
  });
});
