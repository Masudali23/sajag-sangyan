import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  CircleAlert,
  FlaskConical,
  Info,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { calculateScenario } from "../../shared/engine";
import { useApp } from "../lib/preferences";
import { Eyebrow } from "../components/UI";
import { Emoji } from "../components/Emoji";
import { ScamStories } from "../components/ScamStory";
// Two learning simulators: how a scam unfolds (default) and fictional money scenarios.
export default function SimulatePage() {
  const [params] = useSearchParams();
  return params.get("mode") === "money" ? <MoneyScenarios /> : <ScamStoryLab />;
}
function SimulatorModes({ current }: { current: "scams" | "money" }) {
  const { t } = useApp();
  return (
    <nav
      className="simulator-modes"
      aria-label={t(
        "Choose a simulator",
        "सिम्युलेटर चुनें",
        "সিমুলেটর বেছে নিন",
      )}
    >
      <Link
        to="/simulate"
        className={current === "scams" ? "selected" : ""}
        aria-current={current === "scams" ? "page" : undefined}
      >
        <Emoji name="warning" size={26} />
        <span>
          <strong>
            {t("How scams unfold", "ठगी कैसे होती है", "প্রতারণা কীভাবে ঘটে")}
          </strong>
          <small>
            {t(
              "Step through a fictional scam chat",
              "एक काल्पनिक ठगी वाली बातचीत, कदम-दर-कदम",
              "একটা কাল্পনিক প্রতারণার কথোপকথন, ধাপে ধাপে",
            )}
          </small>
        </span>
      </Link>
      <Link
        to="/simulate?mode=money"
        className={current === "money" ? "selected" : ""}
        aria-current={current === "money" ? "page" : undefined}
      >
        <Emoji name="risk" size={26} />
        <span>
          <strong>
            {t("Money scenarios", "पैसों के उदाहरण", "টাকার উদাহরণ")}
          </strong>
          <small>
            {t(
              "Losses, ups and downs, and borrowing",
              "नुकसान, उतार-चढ़ाव और उधार",
              "লোকসান, ওঠানামা আর ধার",
            )}
          </small>
        </span>
      </Link>
    </nav>
  );
}
function ScamStoryLab() {
  const { t } = useApp();
  return (
    <div className="page simulate-page">
      <div className="page-heading">
        <div>
          <Eyebrow>{t("THE LEARNING LAB", "सीखने का अभ्यास")}</Eyebrow>
          <h1>
            {t(
              "See how a scam unfolds",
              "देखें, ठगी कैसे होती है",
              "দেখুন, প্রতারণা কীভাবে ঘটে",
            )}
          </h1>
          <p>
            {t(
              "Read each message, choose a reply, then see the trick behind it. Safe to explore.",
              "हर संदेश पढ़ें, जवाब चुनें, फिर उसके पीछे की चाल देखें। बिना किसी जोखिम के।",
              "প্রতিটি মেসেজ পড়ুন, উত্তর বেছে নিন, তারপর তার পেছনের চালটা দেখুন। কোনো ঝুঁকি ছাড়াই।",
            )}
          </p>
        </div>
        <span className="quiet-pill">
          <FlaskConical size={15} />
          {t("Learning sandbox", "सीखने का अभ्यास")}
        </span>
      </div>
      <SimulatorModes current="scams" />
      <div className="simulation-disclaimer">
        <ShieldCheck size={18} />
        <span>
          <strong>
            {t(
              "100% fictional. Zero real money.",
              "पूरी तरह काल्पनिक। असली पैसा नहीं।",
            )}
          </strong>{" "}
          {t(
            "Names, numbers and messages are invented for learning. The warning signs come from official RBI, SEBI and government alerts.",
            "नाम, नंबर और संदेश सीखने के लिए गढ़े गए हैं। चेतावनी के संकेत आरबीआई, सेबी और सरकारी अलर्ट से लिए गए हैं।",
            "নাম, নম্বর আর মেসেজ শেখার জন্য বানানো। সতর্কসংকেতগুলো আরবিআই, সেবি আর সরকারি সতর্কবার্তা থেকে নেওয়া।",
          )}
        </span>
      </div>
      <ScamStories />
    </div>
  );
}
function MoneyScenarios() {
  const { t, prefs } = useApp();
  const money = (n: number) =>
    Math.round(n).toLocaleString(prefs.language === "bn" ? "bn-IN" : "en-IN");
  const [scenario, setScenario] = useState<"dip" | "bumpy" | "borrow">("dip");
  const [drop, setDrop] = useState(-20);
  const [leverage, setLeverage] = useState(1);
  const [fees, setFees] = useState(0);
  const [played, setPlayed] = useState(false);
  const start = 10000;
  const multiplier = scenario === "borrow" ? leverage : 1;
  const result = calculateScenario(
    start,
    scenario === "bumpy" ? -1 : drop,
    multiplier,
    fees,
  );
  const baseResult = calculateScenario(
    start,
    scenario === "bumpy" ? -1 : drop,
    1,
    fees,
  );
  const values = useMemo(() => {
    const moves =
      scenario === "bumpy"
        ? [0, 0.04, 0.1, 0.06, 0.02, -0.01]
        : [
            0,
            0.018,
            -0.023,
            (drop / 100) * 0.38,
            (drop / 100) * 0.72,
            drop / 100,
          ];
    return moves.map((change, i) =>
      i === 0
        ? start
        : start * multiplier * (1 + change) -
          start * (multiplier - 1) -
          (i === 5 ? (start * multiplier * fees) / 100 : 0),
    );
  }, [scenario, drop, multiplier, fees]);
  const yMin = Math.min(0, ...values) - 1000;
  const yMax = Math.max(start * 1.2, ...values) + 500;
  const y = (v: number) => 195 - ((v - yMin) / (yMax - yMin)) * 160;
  const points = values.map((v, i) => `${40 + i * 96},${y(v)}`).join(" ");
  const scenarios = [
    {
      id: "dip" as const,
      title: t("A sudden dip", "अचानक गिरावट"),
      subtitle: t(
        "What a percentage loss really means",
        "प्रतिशत नुकसान का असली मतलब",
      ),
    },
    {
      id: "bumpy" as const,
      title: t("An uneven journey", "उतार-चढ़ाव का सफर"),
      subtitle: t(
        "+10%, then −10%. Back to the start?",
        "+10%, फिर −10%। वापस शुरुआत पर?",
      ),
    },
    {
      id: "borrow" as const,
      title: t("The weight of borrowing", "उधार का बोझ"),
      subtitle: t(
        "The value falls. The debt stays.",
        "मूल्य गिरता है। कर्ज रहता है।",
      ),
    },
  ];
  function changeScenario(id: typeof scenario) {
    setScenario(id);
    setPlayed(false);
    setLeverage(id === "borrow" ? 2 : 1);
    setFees(0);
  }
  return (
    <div className="page simulate-page">
      <div className="page-heading">
        <div>
          <Eyebrow>{t("THE LEARNING LAB", "सीखने का अभ्यास")}</Eyebrow>
          <h1>{t("Explore risk, safely", "जोखिम समझें, सुरक्षित ढंग से")}</h1>
          <p>
            {t(
              "See how changes, costs and borrowing affect fictional tokens.",
              "देखें कि बदलाव, शुल्क और उधार काल्पनिक टोकन को कैसे प्रभावित करते हैं।",
            )}
          </p>
        </div>
        <span className="quiet-pill">
          <FlaskConical size={15} />
          {t("Learning sandbox", "सीखने का अभ्यास")}
        </span>
      </div>
      <SimulatorModes current="money" />
      <div className="simulation-disclaimer">
        <ShieldCheck size={18} />
        <span>
          <strong>
            {t(
              "100% fictional. Zero real money.",
              "पूरी तरह काल्पनिक। असली पैसा नहीं।",
            )}
          </strong>{" "}
          {t(
            "These scenarios are arithmetic examples, not forecasts, expected returns or investment recommendations.",
            "ये गणित के उदाहरण हैं, भविष्यवाणी, अपेक्षित रिटर्न या निवेश सलाह नहीं।",
          )}
        </span>
      </div>
      <div className="scenario-tabs">
        {scenarios.map((s) => (
          <button
            key={s.id}
            aria-pressed={scenario === s.id}
            className={scenario === s.id ? "selected" : ""}
            onClick={() => changeScenario(s.id)}
          >
            <span className="scenario-radio" />
            <span>
              <strong>{s.title}</strong>
              <small>{s.subtitle}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="simulation-grid">
        <section className="card simulation-controls">
          <Eyebrow>{t("SET UP YOUR EXAMPLE", "अपना उदाहरण चुनें")}</Eyebrow>
          <h2>{t("Start with 10,000 tokens.", "10,000 टोकन से शुरू करें।")}</h2>
          {scenario !== "bumpy" ? (
            <div className="range-control">
              <label htmlFor="drop">
                {t(
                  "Fictional change in asset value",
                  "संपत्ति के मूल्य में काल्पनिक बदलाव",
                )}
                <strong>{drop}%</strong>
              </label>
              <input
                id="drop"
                type="range"
                min={-80}
                max={-5}
                step={5}
                value={drop}
                onChange={(e) => {
                  setDrop(Number(e.target.value));
                  setPlayed(false);
                }}
              />
              <div className="range-labels">
                <span>−80%</span>
                <span>−5%</span>
              </div>
            </div>
          ) : (
            <div className="callout">
              <strong>
                {t("A rise followed by a fall", "बढ़त के बाद गिरावट")}
              </strong>
              <p>
                {t(
                  "First +10%, then −10% of the new value. Intermediate points are invented for illustration.",
                  "पहले +10%, फिर नई राशि का −10%। बीच के बिंदु समझाने के लिए बनाए गए हैं।",
                )}
              </p>
            </div>
          )}
          {scenario === "borrow" && (
            <div className="range-control">
              <label htmlFor="leverage">
                {t(
                  "Exposure compared with your tokens",
                  "अपने टोकन के मुकाबले कुल जोखिम",
                )}
                <strong>{leverage}×</strong>
              </label>
              <input
                id="leverage"
                type="range"
                min={1}
                max={3}
                step={1}
                value={leverage}
                onChange={(e) => {
                  setLeverage(Number(e.target.value));
                  setPlayed(false);
                }}
              />
              <div className="range-labels">
                <span>{t("No borrowing", "बिना उधार")}</span>
                {t("3× exposure", "3× जोखिम")}
              </div>
              <small>
                {t(
                  "Borrowed tokens remain due even when the asset falls.",
                  "संपत्ति गिरने पर भी उधार चुकाना रहता है।",
                )}
              </small>
            </div>
          )}
          <div className="range-control">
            <label htmlFor="fees">
              {t("Illustrative one-time fee", "उदाहरण का एकमुश्त शुल्क")}
              <strong>{fees}%</strong>
            </label>
            <input
              id="fees"
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={fees}
              onChange={(e) => {
                setFees(Number(e.target.value));
                setPlayed(false);
              }}
            />
            <div className="range-labels">
              <span>0%</span>
              <span>3%</span>
            </div>
            <small>
              {t(
                "Charged on starting exposure at the final step. Excludes interest, taxes and actual product rules.",
                "अंतिम चरण में शुरुआती कुल जोखिम पर शुल्क। ब्याज, कर और वास्तविक उत्पाद नियम शामिल नहीं।",
              )}
            </small>
          </div>
          <button
            className="button primary full"
            onClick={() => {
              setPlayed(true);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(".chart-card")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              );
            }}
          >
            <Play size={17} />
            {t("Run this scenario", "यह उदाहरण चलाएँ")}
          </button>
          <button
            className="button ghost full small"
            onClick={() => {
              setDrop(-20);
              setLeverage(scenario === "borrow" ? 2 : 1);
              setFees(0);
              setPlayed(false);
            }}
          >
            <RotateCcw size={14} />
            {t("Reset example", "उदाहरण रीसेट करें")}
          </button>
        </section>
        <div className="simulation-output">
          <section className="card chart-card">
            <div className="section-heading">
              <div>
                <Eyebrow>
                  {t("FICTIONAL TOKEN BALANCE", "काल्पनिक टोकन राशि")}
                </Eyebrow>
                <div className="token-total">
                  {played ? money(result.remaining) : money(10000)}
                  <span>{t("tokens", "टोकन")}</span>
                </div>
              </div>
              <span className={`scenario-change ${played ? "loss" : ""}`}>
                {played ? (
                  <>
                    <ArrowDownRight size={16} />
                    {result.change.toFixed(1)}%
                  </>
                ) : (
                  t("Starting point", "शुरुआत")
                )}
              </span>
            </div>
            <div className="chart-wrapper">
              <svg
                viewBox="0 0 560 240"
                role="img"
                aria-label={
                  played
                    ? t(
                        `Fictional balance changes from 10,000 to ${money(result.remaining)} tokens.`,
                        `काल्पनिक राशि 10,000 से ${money(result.remaining)} टोकन होती है।`,
                        `কাল্পনিক টোকেনের পরিমাণ ১০,০০০ থেকে ${money(result.remaining)} হয়।`,
                      )
                    : t(
                        "Starting balance: 10,000 fictional tokens.",
                        "शुरुआती राशि: 10,000 काल्पनिक टोकन।",
                      )
                }
              >
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d18d70" stopOpacity=".18" />
                    <stop offset="100%" stopColor="#d18d70" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 5000, 10000].map((v) => (
                  <g key={v}>
                    <line
                      x1="40"
                      x2="520"
                      y1={y(v)}
                      y2={y(v)}
                      stroke="#e8e9e5"
                      strokeDasharray="4 5"
                    />
                    <text x="0" y={y(v) + 4} fontSize="10" fill="#7d857f">
                      {prefs.language === "bn"
                        ? v === 10000
                          ? "১০ হাজার"
                          : v === 5000
                            ? "৫ হাজার"
                            : "০"
                        : v === 10000
                          ? "10k"
                          : v === 5000
                            ? "5k"
                            : "0"}
                    </text>
                  </g>
                ))}
                {played ? (
                  <>
                    <polygon
                      points={`40,${y(0)} ${points} 520,${y(0)}`}
                      fill="url(#chart-fill)"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#b5795c"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {values.map((v, i) => (
                      <circle
                        cx={40 + i * 96}
                        cy={y(v)}
                        key={i}
                        r={i === 5 ? 5 : 3}
                        fill={i === 5 ? "#b5795c" : "#fff"}
                        stroke="#b5795c"
                        strokeWidth="2"
                      />
                    ))}
                  </>
                ) : (
                  <line
                    x1="40"
                    x2="520"
                    y1={y(start)}
                    y2={y(start)}
                    stroke="#537569"
                    strokeWidth="3"
                  />
                )}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <text
                    key={i}
                    x={40 + i * 96}
                    y="230"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#7d857f"
                  >
                    {t("Step", "चरण")} {i}
                  </text>
                ))}
              </svg>
            </div>
            <div className="chart-caption">
              <span className="chart-dot" />
              {t(
                "Invented illustration · not historical or future market data",
                "काल्पनिक चित्रण · पिछले या भविष्य के बाज़ार के आँकड़े नहीं",
              )}
            </div>
          </section>
          {played ? (
            <section className="card simulation-breakdown" aria-live="polite">
              <h3>{t("Where did the tokens go?", "टोकन कहाँ गए?")}</h3>
              <dl>
                <div>
                  <dt>{t("Your starting tokens", "आपके शुरुआती टोकन")}</dt>
                  <dd>10,000</dd>
                </div>
                <div>
                  <dt>{t("Borrowed tokens", "उधार के टोकन")}</dt>
                  <dd>{money(result.debt)}</dd>
                </div>
                <div>
                  <dt>
                    {t(
                      "Asset value after the change",
                      "बदलाव के बाद संपत्ति का मूल्य",
                    )}
                  </dt>
                  <dd>{money(result.assetValue)}</dd>
                </div>
                <div>
                  <dt>{t("Debt still due", "बाकी कर्ज")}</dt>
                  <dd>−{money(result.debt)}</dd>
                </div>
                <div>
                  <dt>{t("Illustrative fee", "उदाहरण का शुल्क")}</dt>
                  <dd>−{money(result.fee)}</dd>
                </div>
                <div className="total-row">
                  <dt>{t("Your remaining equity", "आपकी बची राशि")}</dt>
                  <dd>{money(result.remaining)}</dd>
                </div>
              </dl>
              {result.remaining < 0 && (
                <div className="form-error">
                  <CircleAlert size={17} />
                  {t(
                    `Your original tokens are gone, and ${money(-result.remaining)} tokens of debt remain in this simplified example.`,
                    `इस सरल उदाहरण में आपके मूल टोकन खत्म हो गए और ${money(-result.remaining)} टोकन का कर्ज बचा है।`,
                    `এই সরল উদাহরণে আপনার নিজের টোকেন শেষ, আর ${money(-result.remaining)} টোকেন ধার শোধ করা বাকি।`,
                  )}
                </div>
              )}
              <div className="learning-outcome">
                <Sparkles size={20} />
                <p>
                  {scenario === "bumpy"
                    ? t(
                        "10% up and 10% down do not cancel: 10,000 × 1.10 × 0.90 = 9,900 before fees.",
                        "10% बढ़त और 10% गिरावट रद्द नहीं होतीं: 10,000 × 1.10 × 0.90 = 9,900, शुल्क से पहले।",
                      )
                    : scenario === "borrow"
                      ? t(
                          `With the same fictional change and fee rate but no borrowing, ${money(baseResult.remaining)} tokens would remain. Borrowing magnifies the effect on your own tokens.`,
                          `उसी काल्पनिक बदलाव और शुल्क पर बिना उधार ${money(baseResult.remaining)} टोकन बचते। उधार अपने टोकन पर प्रभाव बढ़ाता है।`,
                          `একই কাল্পনিক পরিবর্তন ও ফি-তে ধার না নিলে ${money(baseResult.remaining)} টোকেন থাকত। ধার নিলে নিজের টোকেনের ওপর প্রভাব বাড়ে।`,
                        )
                      : result.recoveryPercent !== null
                        ? t(
                            `After this loss and fee, a ${result.recoveryPercent.toFixed(1)}% rise from the remaining amount would be needed to reach 10,000, ignoring further costs. Such a rise is not guaranteed.`,
                            `इस नुकसान और शुल्क के बाद वापस 10,000 तक पहुँचने के लिए बची राशि में ${result.recoveryPercent.toFixed(1)}% बढ़त चाहिए, आगे के खर्च छोड़कर। ऐसी बढ़त की गारंटी नहीं है।`,
                            `এই ক্ষতি ও ফি-এর পরে আবার ১০,০০০-এ ফিরতে বাকি টোকেন ${result.recoveryPercent.toFixed(1)}% বাড়তে হবে, আরও খরচ বাদ দিয়ে। এমন বাড়বে বলে কোনো নিশ্চয়তা নেই।`,
                          )
                        : t(
                            "Fees and the changing base affect the result.",
                            "शुल्क और बदलता आधार नतीजे को प्रभावित करते हैं।",
                          )}
                </p>
              </div>
            </section>
          ) : (
            <div className="simulation-placeholder">
              <FlaskConical size={23} />
              <div>
                <h3>{t("Before you press play…", "चलाने से पहले सोचें…")}</h3>
                <p>
                  {t(
                    "What do you think will happen to your tokens? Form an expectation, then compare it with the arithmetic.",
                    "आपके हिसाब से टोकन का क्या होगा? पहले सोचें, फिर गणित से मिलाएँ।",
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="simulation-footnote">
        <Info size={17} />
        <p>
          {t(
            "This deliberately simplified example excludes interest, margin calls, forced liquidation, taxes and real-product mechanics. A real borrowed position can behave differently. No trading, asset selection or real-money actions are available here.",
            "यह सरल उदाहरण ब्याज, मार्जिन कॉल, जबरन बिक्री, कर और वास्तविक उत्पाद प्रक्रिया शामिल नहीं करता। वास्तविक उधार की स्थिति अलग हो सकती है। यहाँ ट्रेडिंग या असली पैसे का कोई विकल्प नहीं है।",
          )}
        </p>
        <Link to="/learn/volatility" className="text-link">
          {t("Understand volatility", "अस्थिरता समझें")}
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
