import { describe, expect, it } from "vitest";
import { numericClaim, normalizeDigits } from "../shared/numeric-claims";
import { analyzeClaim } from "../shared/engine";

describe("sender-number screening, not predictions", () => {
  it.each([
    "Invest ₹5 hundred and receive ₹15 hundred in 30 days.",
    "Invest 5 hundred rupees and receive 15 hundred rupees in 30 days.",
    "Invest ₹5 सौ and receive ₹15 सौ in 30 days.",
    "Invest five thousand and get fifteen thousand back in 30 days.",
  ])("uses consistent monetary denominations: %s", (text) => {
    const result = analyzeClaim(text).findings.find((f) => f.id === "outsized");
    expect(result?.severity).toBe("attention");
  });
  it("does not annualize a ratio between different currencies", () => {
    expect(
      numericClaim("Invest 1 BTC and receive ₹1000 in 30 days")
        ?.annualizedPercent,
    ).toBeUndefined();
    expect(
      numericClaim("Invest $5 and receive ₹5000 in 30 days")?.annualizedPercent,
    ).toBeUndefined();
  });
  it("does not divide a payout by a zero starting amount", () => {
    expect(
      numericClaim("Invest ₹0 and receive ₹500 in 30 days")?.annualizedPercent,
    ).toBeUndefined();
  });
  it("separates ordinary freelance pay from investment returns", () => {
    const work =
      "The freelance work platform pays ₹500 per day for transcription.";
    expect(numericClaim(work)).toBeNull();
    expect(
      analyzeClaim(`${work} Our fund pays 8% monthly returns.`).findings.some(
        (f) => f.id === "outsized" && f.severity === "attention",
      ),
    ).toBe(true);
  });
  it("normalizes Indic decimal blocks without changing words", () => {
    expect(normalizeDigits("१२३ ১২৩ ੧੨੩ ૧૨૩ ୧୨୩ ௧௨௩ ౧౨౩ ೧೨೩ ൧൨൩")).toBe(
      "123 123 123 123 123 123 123 123 123",
    );
  });
  it.each([
    "Invest ₹5,000 and get ₹50,000 in 30 days.",
    "Earn 2% weekly on your deposit, paid every Friday.",
    "कल दोगुना!",
    "18 महीने में रकम डबल",
    "5 साल में पैसा तीन गुना",
    "Mere members ne pichle mahine 300% return kamaya.",
    "My subscribers already made 5x.",
    "रोज़ ₹500 की पक्की कमाई।",
    "Our platform pays 25,000 rupees per day.",
    "Har mahine ₹1 lakh pakka kamao.",
    "Hamari committee mein har mahine ₹2,000 do, 10 mahine baad ₹50,000 milenge.",
  ])("recognizes a return shape: %s", (text) => {
    expect(numericClaim(text)).not.toBeNull();
  });
  it("annualizes only stated rate and period and caps huge calculations", () => {
    expect(
      numericClaim("Earn 2% weekly returns")?.annualizedPercent,
    ).toBeCloseTo((1.02 ** (365 / 7) - 1) * 100);
    expect(
      numericClaim("Our platform pays ₹2000 daily")?.annualizedPercent,
    ).toBeUndefined();
    expect(
      Number.isFinite(
        numericClaim("Invest ₹1 for ₹99999999 in 1 day")?.annualizedPercent,
      ),
    ).toBe(true);
  });
  it.each([
    "FD offers 7.1% annual interest, paid monthly.",
    "PPF interest is 7.1% a year.",
    "The fund's expense ratio is 0.45% and an exit load of 1% applies if units are redeemed within one year.",
    "Over the past 20 years the Nifty 50 grew around 12% a year on average, but past performance does not guarantee future returns.",
    "Compounding means your returns earn returns. For example, 10% a year doubles money in about 7 years.",
    "In a 1:2 stock split, each share becomes two shares.",
  ])(
    "keeps modest rates and ordinary financial information clean: %s",
    (text) => {
      expect(analyzeClaim(text).findings).toEqual([]);
    },
  );
});

describe("borrowing costs and business metrics are not investor returns", () => {
  it.each([
    "Credit card interest can be 3.5% per month, which is over 40% a year — pay your bill in full.",
    "The company's revenue grew 120% year on year, according to its annual report.",
    "A loan charges interest at 4% monthly; compare the total borrowing cost.",
    "Interest charged on credit card balances is 42% annually.",
    "The company's net profit grew 90% annually in its reported accounts.",
    "Business sales grew from ₹5 lakh to ₹12 lakh in one year.",
    "The company's revenue doubled in 12 months, according to its accounts.",
    "क्रेडिट कार्ड पर ब्याज ३.५% हर महीने लगता है, यानी सालाना ४२%।",
    "कंपनी का राजस्व सालाना १२०% बढ़ा, वार्षिक रिपोर्ट के अनुसार।",
    "Loan ka interest 4% monthly hai; borrowing cost ko samjho.",
  ])("leaves a cost or operating measurement clean: %s", (text) => {
    expect(numericClaim(text)).toBeNull();
    expect(analyzeClaim(text).findings).toEqual([]);
  });

  it.each([
    "Credit card interest is 3.5% monthly, but our fund pays 8% every month.",
    "Our company revenue grew 120% annually, and your money earns 4% monthly.",
    "Loan interest is 4% monthly; earn 8% monthly returns on our platform.",
    "Company sales grew 120% yearly, invest ₹500 and get ₹5000 in 30 days.",
    "Our loan-backed scheme returns 5% every month.",
    "Your investment in company revenue gives returns of 40% a year.",
    "क्रेडिट कार्ड पर ब्याज ३.५% हर महीने है, लेकिन हमारे फंड में ८% मासिक रिटर्न मिलेगा।",
    "कंपनी का राजस्व १२०% बढ़ा, निवेश करें और ३० दिनों में पैसा डबल पाएँ।",
    "Loan ka interest 4% monthly hai, but hamare fund mein 8% monthly returns milenge.",
    "Loan ka interest 4% monthly hai lekin hamare plan mein 8% munafa har mahine milega.",
    "Company revenue grew 80% annually magar hamare fund mein 7% munafa har mahine milega.",
  ])("retains a separate or explicit return claim: %s", (text) => {
    expect(numericClaim(text)).not.toBeNull();
    expect(analyzeClaim(text).findings.some((f) => f.id === "outsized")).toBe(
      true,
    );
  });
});

describe("implicit rupee denominations remain numbers, not forecasts", () => {
  it.each([
    "Hamare fund mein paanch hazaar lagao, har hafte pandrah sau fix milega.",
    "Invest 5 thousand, our fund pays a fixed 15 hundred every week.",
  ])(
    "recognizes a promised monetary payout without inventing its return: %s",
    (text) => {
      const result = analyzeClaim(text);
      expect(result.findings.some((f) => f.id === "outsized")).toBe(true);
      // The payout is lower than the original deposit, so it must not become an
      // invented final-capital multiplier. Its recurring promise is still a cue.
      const normalized = text.replace("paanch", "5").replace("pandrah", "15");
      expect(numericClaim(normalized)?.kind).toBe("periodic-payout");
      expect(numericClaim(normalized)?.annualizedPercent).toBeUndefined();
    },
  );

  it.each([
    "The warehouse shipped 5 thousand boxes in a week.",
    "Paanch hazaar log har hafte library aate hain.",
    "My salary is 15 hundred rupees weekly.",
  ])(
    "does not turn an unrelated count or wage into investor income: %s",
    (text) => {
      expect(numericClaim(text)).toBeNull();
      expect(analyzeClaim(text).findings.some((f) => f.id === "outsized")).toBe(
        false,
      );
    },
  );
});
