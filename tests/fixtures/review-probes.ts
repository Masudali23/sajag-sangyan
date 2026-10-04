// Exact integration-review messages; retain spelling and punctuation to prevent
// narrowing regression tests to the implementation's preferred phrasing.
export const reviewProbes = [
  {
    name: "Hinglish guarantee",
    text: "Bhai 100% guaranteed return milega, abhi join karo VIP group, sirf 10 seats bache hain",
    status: "attention",
    ids: ["guarantee", "promotion"],
  },
  {
    name: "Target / upper circuit",
    text: "XYZ Ltd target 500 🚀 operator ne bola hai, kal upper circuit lagega. Buy now before it flies! Multibagger stock.",
    status: "attention",
    ids: ["tip", "insider"],
  },
  {
    name: "Insider tip",
    text: "Insider tip: big announcement coming tomorrow, accumulate this penny stock now",
    status: "attention",
    ids: ["insider"],
  },
  {
    name: "Minister trading app",
    text: "Finance Minister ne naya trading app launch kiya, ₹21,000 lagao aur ₹5 lakh kamao har mahine",
    status: "attention",
    ids: ["impersonation"],
  },
  {
    name: "Task registration fee",
    text: "Work from home! Like YouTube videos and earn ₹5000 daily. Pay ₹1000 registration fee on UPI scammer@ybl",
    status: "attention",
    ids: ["pay-to-earn"],
  },
  {
    name: "Pre-IPO / institutional account",
    text: "Pre-IPO shares at discount, guaranteed allotment, institutional account se. Limited slots.",
    status: "attention",
    ids: ["off-platform"],
  },
  {
    name: "Off-store app / deposit bonus",
    text: "Download our trading app from this link (not on Play Store): bit.ly/xyz123 and get 40% bonus on deposit",
    status: "attention",
    ids: ["off-platform", "pay-to-earn"],
  },
  {
    name: "Crypto doubling",
    text: "Bitcoin doubling scheme: send 0.1 BTC, get 0.2 BTC back in 24 hours",
    status: "attention",
    ids: ["outsized"],
  },
  {
    name: "Secrecy / 30% monthly",
    text: "Don't tell anyone about this secret strategy, only for our members. Fixed 30% monthly profit.",
    status: "attention",
    ids: ["secrecy", "periodic"],
  },
  {
    name: "Fixed 8% monthly",
    text: "Earn fixed 8% monthly returns on your investment, paid every month",
    status: "attention",
    ids: ["periodic"],
  },
  {
    name: "Social proof",
    text: "I turned ₹10,000 into ₹2 lakh in 3 months with this strategy. 1 lakh+ members trust us. See profit screenshots.",
    status: "context",
    ids: ["social-proof"],
  },
  {
    name: "Education + paid course",
    text: "Beware of anyone promising guaranteed returns. Our course teaches you how to spot scams — join our paid course for ₹4999.",
    status: "context",
    ids: ["promotion"],
    contentType: "mixed",
  },
  {
    name: "SIP correction",
    text: "SIP means investing a fixed amount regularly. Returns are not guaranteed and markets can fall.",
    status: "context",
    ids: [],
    contentType: "educational",
  },
  {
    name: "Hindi NAV correction",
    text: "म्यूचुअल फंड कैसे खरीदें: NAV का मतलब है एक यूनिट का मूल्य। कम NAV का मतलब सस्ता फंड नहीं होता।",
    status: "context",
    ids: [],
    contentType: "educational",
  },
  {
    name: "Market news",
    text: "Nifty fell 2% today due to global cues.",
    status: "context",
    ids: [],
  },
] as const;
