import { describe, expect, it } from "vitest";
import { maskOffensiveLanguage } from "../shared/language-guard";

describe("quotation display protection", () => {
  it.each([
    ["Pay now, you fucking bastard!", "Pay now, you •••• ••••!"],
    ["You BITCH, pay [phone removed]", "You ••••, pay [phone removed]"],
    ["तुम चूतिया हो। [email removed]", "तुम •••• हो। [email removed]"],
    ["বোকাচোদা, টাকা পাঠাও", "••••, টাকা পাঠাও"],
    ["bokachoda taka pathao", "•••• taka pathao"],
    ["साले, ऐसी धमकी मत दो।", "••••, ऐसी धमकी मत दो।"],
    ["হারামজাদা, চুপ করো।", "••••, চুপ করো।"],
    ["f\u200buck you", "•••• you"],
    ["f💀u-c-k you", "•••• you"],
    ["fuck-off", "••••-off"],
    ["fuck,you must pay", "••••,you must pay"],
    ["shit,happens", "••••,happens"],
    ["ｆｕｃｋ [OTP removed]", "•••• [OTP removed]"],
    ["😊 shit 🥺", "😊 •••• 🥺"],
  ])("masks %s without damaging the rest of the quote", (input, masked) => {
    expect(maskOffensiveLanguage(input)).toEqual({
      text: masked,
      hasMaskedWords: true,
    });
    expect(maskOffensiveLanguage(input).text).not.toContain("undefined");
  });
  it.each([
    "Please share the worksheet",
    "The Scunthorpe branch",
    "Your bank statement is ready",
    "This title is a classic",
    "টাকা পাঠাবেন না",
    "अपना OTP किसी को न बताएँ",
    "[phone removed] [email removed]",
  ])("leaves ordinary text intact: %s", (text) => {
    expect(maskOffensiveLanguage(text)).toEqual({
      text,
      hasMaskedWords: false,
    });
  });
});
