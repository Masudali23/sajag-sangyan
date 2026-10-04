# Trains Sajag's on-device pattern model: a hashed character/word n-gram logistic regression
# that runs offline next to the rules (shared/pattern-model.ts mirrors the features exactly).
#
# Development data only: the project's own synthetic, labelled fixtures. Never reads a sealed
# set. Third-party public SMS rows are evaluation-only, never trained on.
#
#   python3 scripts/pattern-model-train.py
#
# Writes data/pattern-model.v1.json and tests/fixtures/pattern-model-parity.json and prints
# leave-one-source-out validation totals (no message text).
import hashlib, json, math, os, subprocess, unicodedata
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKETS = 1 << 18
KEEP = 20000
SCALE = 10000
THRESHOLD = 0.7  # Chosen by leave-one-source-out validation, before any sealed scoring.
C = 4.0
SPECIAL = set("₹%$@")


def fnv1a(text):
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def tokens(text):
    out, cur = [], []
    for ch in unicodedata.normalize("NFC", text).lower():
        cat = unicodedata.category(ch)
        if cat == "Nd":
            cur.append("0")
        elif cat[0] in "LMN":
            cur.append(ch)
        else:
            if cur:
                out.append("".join(cur))
                cur = []
            if ch in SPECIAL:
                out.append(ch)
    if cur:
        out.append("".join(cur))
    return out


# Approximate Devanagari/Bengali -> Latin "sound key" plus Latin spelling folds, so hi/hi-Latn
# and bn/bn-Latn share features. Tables and order must match shared/pattern-model.ts exactly.
DEV_CONS = dict(zip("कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह", "k kh g gh n ch chh j jh n t th d dh n t th d dh n p ph b bh m y r l v sh sh s h".split()))
DEV_VOW = dict(zip("अआइईउऊऋएऐओऔ", "a aa i ii u uu ri e ai o au".split()))
DEV_MATRA = dict(zip("ािीुूृेैोौ", "aa i ii u uu ri e ai o au".split()))
BN_CONS = dict(zip("কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ", "k kh g gh ng ch chh j jh n t th d dh n t th d dh n p ph b bh m j r l sh sh s h".split()))
BN_EXTRA = {"ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t"}
BN_VOW = dict(zip("অআইঈউঊঋএঐওঔ", "o a i i u u ri e oi o ou".split()))
BN_MATRA = dict(zip("ািীুূৃেৈোৌ", "a i i u u ri e oi o ou".split()))
SIGNS = {"ं": "n", "ँ": "n", "ः": "h", "্": "", "्": "", "़": "", "ং": "ng", "ঁ": "n", "ঃ": "h", "়": ""}
def translit(word):
    out = []; chars = list(word); i = 0
    while i < len(chars):
        ch = chars[i]
        if ch in DEV_CONS or ch in BN_CONS or ch in BN_EXTRA:
            out.append(DEV_CONS.get(ch) or BN_CONS.get(ch) or BN_EXTRA[ch])
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if nxt == "़": i += 1; nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if not (nxt in DEV_MATRA or nxt in BN_MATRA or nxt in ("्", "্")):
                out.append("a")  # inherent vowel (folded below)
        elif ch in DEV_VOW: out.append(DEV_VOW[ch])
        elif ch in BN_VOW: out.append(BN_VOW[ch])
        elif ch in DEV_MATRA: out.append(DEV_MATRA[ch])
        elif ch in BN_MATRA: out.append(BN_MATRA[ch])
        elif ch in SIGNS: out.append(SIGNS[ch])
        else: out.append(ch)
        i += 1
    return "".join(out)
FOLDS = [("chh", "c"), ("ch", "c"), ("sh", "s"), ("ph", "f"), ("bh", "b"), ("kh", "k"), ("gh", "g"), ("jh", "j"), ("th", "t"), ("dh", "d"), ("w", "v"), ("z", "j"), ("q", "k"), ("x", "ks"), ("y", "i"), ("o", "a"), ("ee", "i"), ("oo", "u"), ("aa", "a"), ("ii", "i"), ("uu", "u")]
def sound_key(word):
    w = translit(word)
    for a, b in FOLDS: w = w.replace(a, b)
    out = []
    for ch in w:
        if not out or out[-1] != ch: out.append(ch)
    w = "".join(out)
    return w[:-1] if len(w) > 3 and w.endswith("a") else w  # schwa / final-vowel deletion


def features(text):
    toks = tokens(text)
    keys = [sound_key(tok) for tok in toks]
    counts = {}

    def add(feature):
        index = fnv1a(feature) % BUCKETS
        counts[index] = counts.get(index, 0) + 1

    for i, tok in enumerate(toks):
        add("w|" + tok)
        if i + 1 < len(toks):
            add("b|" + tok + "|" + toks[i + 1])
        padded = list(" " + tok + " ")
        for n in range(2, 6):
            if n > len(padded):
                break
            for start in range(len(padded) - n + 1):
                add("c|" + "".join(padded[start:start + n]))
    for i, key in enumerate(keys):
        add("k|" + key)
        if i + 1 < len(keys):
            add("kb|" + key + "|" + keys[i + 1])
        padded = list(" " + key + " ")
        for n in (3, 4):
            for start in range(len(padded) - n + 1):
                add("s|" + "".join(padded[start:start + n]))
    return counts


def vector(text):
    values = {i: 1.0 + math.log(c) for i, c in features(text).items()}
    norm = math.sqrt(sum(v * v for v in values.values())) or 1.0
    return {i: v / norm for i, v in values.items()}


def load(name):
    with open(os.path.join(ROOT, "tests/fixtures", name), "rb") as f:
        raw = f.read()
    data = json.loads(raw)
    items = data if isinstance(data, list) else (
        data.get("items") or data.get("cases") or next(v for v in data.values() if isinstance(v, list)))
    return items, hashlib.sha256(raw).hexdigest()


def boolean_label(item):
    value = item.get("expectAttention", item.get("expectedAttention"))
    return value if isinstance(value, bool) else None


# (fixture, validation source group, label function, used for training)
FIXTURES = [
    ("cycle7-development.json", "cycle7-development", boolean_label, True),
    ("expanded-development-v2.json", "expanded-development", boolean_label, True),
    ("metamorphic-development-v2.json", "expanded-development",
     lambda i: {"attention": True, "benign": False}.get(i.get("group")), True),
    ("expanded-independent-holdout-v2.json", "expanded-independent", boolean_label, True),
    ("dev-cycle7-en.json", "dev-cycle7", boolean_label, True),
    ("dev-cycle7-hi.json", "dev-cycle7", boolean_label, True),
    ("dev-cycle7-bn.json", "dev-cycle7", boolean_label, True),
    ("message-review-en.json", "message-review", boolean_label, True),
    ("message-review-hi.json", "message-review", boolean_label, True),
    ("message-review-bn.json", "message-review", boolean_label, True),
    ("cycle8-development.json", "cycle8-development", boolean_label, True),
    ("rag-independent-holdout.json", "rag-independent",
     lambda i: i.get("riskIntent") == "strong-scam-signals" if i.get("riskIntent") else None, True),
    ("independent-review.json", "early-reviews",
     lambda i: None if i.get("scored") is False else True if i.get("group") == "scam"
     else False if (i.get("expected") or {}).get("maxFindings") == 0 else None, True),
    ("round-two.json", "early-reviews",
     lambda i: None if i.get("scored") is False else True if i.get("group") == "scam"
     else False if (i.get("expected") or {}).get("maxFindings") == 0 else None, True),
    ("dataset-development-v1.json", "public-sms",
     lambda i: {"observable-risk-cue": True, "no-attention-cue": False}.get((i.get("annotation") or {}).get("group")),
     False),
]

rows, fixture_hashes = [], {}
for name, group, label, train in FIXTURES:
    items, digest = load(name)
    fixture_hashes[name] = digest
    for index, item in enumerate(items):
        y = label(item)
        if y is None or not isinstance(item.get("text"), str):
            continue
        rows.append({"fixture": name, "id": str(item.get("id", index)), "group": group,
                     "language": str(item.get("language", "en")), "y": int(y), "train": train,
                     "text": item["text"]})

# Train on the masked text the app scores (phone numbers, emails, secrets removed on device).
masked = json.loads(subprocess.run(
    ["node", "scripts/pattern-model-inputs.ts", *[name for name, _, _, _ in FIXTURES]],
    cwd=ROOT, check=True, capture_output=True, text=True).stdout)
for r in rows:
    r["text"] = masked[f"{r['fixture']}#{r['id']}"]
vectors = [vector(r["text"]) for r in rows]


def matrix(indices):
    r, c, v = [], [], []
    for k, i in enumerate(indices):
        for col, value in vectors[i].items():
            r.append(k)
            c.append(col)
            v.append(value)
    return csr_matrix((v, (r, c)), shape=(len(indices), BUCKETS))


def fit(indices):
    model = LogisticRegression(C=C, max_iter=5000, class_weight="balanced")
    model.fit(matrix(indices), [rows[i]["y"] for i in indices])
    weights = model.coef_[0].copy()
    keep = np.argsort(-np.abs(weights), kind="stable")[:KEEP]
    pruned = np.zeros_like(weights)
    pruned[keep] = np.round(weights[keep] * SCALE) / SCALE
    return pruned, round(float(model.intercept_[0]) * SCALE) / SCALE


def probability(weights, bias, i):
    score = bias + sum(weights[col] * value for col, value in vectors[i].items())
    return 1.0 / (1.0 + math.exp(-score))


# Leave-one-source-out validation: each source group is scored by a model that never saw it.
groups = sorted({r["group"] for r in rows})
validation = {}
for group in groups:
    train = [i for i, r in enumerate(rows) if r["train"] and r["group"] != group]
    test = [i for i, r in enumerate(rows) if r["group"] == group]
    weights, bias = fit(train)
    flagged = [probability(weights, bias, i) >= THRESHOLD for i in test]
    risky = [rows[i]["y"] == 1 for i in test]
    validation[group] = {
        "total": len(test),
        "risky": sum(risky),
        "riskyFlagged": sum(f and y for f, y in zip(flagged, risky)),
        "harmless": len(test) - sum(risky),
        "harmlessFlagged": sum(f and not y for f, y in zip(flagged, risky)),
    }
    v = validation[group]
    print(f"held out {group:22s} n={v['total']:3d} risky flagged {v['riskyFlagged']}/{v['risky']} "
          f"harmless flagged {v['harmlessFlagged']}/{v['harmless']}")

train_indices = [i for i, r in enumerate(rows) if r["train"]]
weights, bias = fit(train_indices)
nonzero = sorted(int(i) for i in np.nonzero(weights)[0])
deltas, previous = [], 0
for index in nonzero:
    deltas.append(index - previous)
    previous = index
model = {
    "schemaVersion": 1,
    "name": "sajag-pattern-model-v1",
    "featureVersion": "nfc-lower-digit0-lmn-tokens|w1,b2,c2-5|soundkey k1,kb2,s3-4|fnv1a-utf8|mod2^18|sublinear-tf-l2",
    "buckets": BUCKETS,
    "scale": SCALE,
    "threshold": THRESHOLD,
    "bias": bias,
    "indexDeltas": deltas,
    "weights": [int(round(weights[i] * SCALE)) for i in nonzero],
    "training": {
        "scope": "Synthetic development fixtures written for this project; no sealed set, no user data, no third-party text.",
        "messages": len(train_indices),
        "risky": sum(rows[i]["y"] for i in train_indices),
        "fixtures": {name: fixture_hashes[name] for name, _, _, train in FIXTURES if train},
        "evaluationOnly": {name: fixture_hashes[name] for name, _, _, train in FIXTURES if not train},
        "leaveOneSourceOut": validation,
    },
}
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
with open(os.path.join(ROOT, "data/pattern-model.v1.json"), "w", encoding="utf-8") as f:
    json.dump(model, f, separators=(",", ":"))
    f.write("\n")

# Parity fixture: probabilities from the exported integer weights for a fixed spread of messages.
dense = np.zeros(BUCKETS)
for index, weight in zip(nonzero, model["weights"]):
    dense[index] = weight / SCALE
picks = [i for k, i in enumerate(range(len(rows))) if k % 23 == 0][:80]
parity = [{"fixture": rows[i]["fixture"], "id": rows[i]["id"],
           "probability": probability(dense, bias, i)} for i in picks]
with open(os.path.join(ROOT, "tests/fixtures/pattern-model-parity.json"), "w", encoding="utf-8") as f:
    json.dump({"schemaVersion": 1, "model": "sajag-pattern-model-v1", "cases": parity}, f, indent=1)
    f.write("\n")
size = os.path.getsize(os.path.join(ROOT, "data/pattern-model.v1.json"))
print(f"trained on {len(train_indices)} messages; kept {len(nonzero)} weights; model file {size} bytes; "
      f"parity cases {len(parity)}")
