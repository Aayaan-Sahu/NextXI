/**
 * Every word on the landing page, in English and Hindi.
 *
 * One dictionary, one type: a section's component takes its slice as a prop
 * and never reaches for a string of its own, so the two languages can't drift
 * apart in what they say — only in how they say it. The Hindi is written, not
 * machine-translated, in the register Indian cricket actually speaks: English
 * cricket terms transliterated (बैट, कोच, ट्रायल, स्काउट), numbers in Latin
 * digits, product and people's names untouched.
 *
 * The demo report and HUD inside the pinned hero are translated too, so the
 * Hindi page reads as one piece. Note what that implies: the product itself
 * still reports in English today, so the Hindi demo is a preview of a report
 * the pipeline doesn't write yet. Names, unit symbols (°, s, fps), file
 * extensions and proper nouns (ECB, U19, AI) stay as they are.
 */

import type { LandingLang } from "@/lib/landing-lang";
import { DRILL, SUBTITLE, WEAKEST, WEAKEST_SHORT } from "./report-variants/report-data";

export type { LandingLang };

type Step = { kicker: string; title: string; body: string };
type Gate = { kicker: string; title: string; body: string };
type Stage = { title: string; body: string };
type Callout = { label: string; value: string };
type Tile = { name: string; note: string };

export type LandingCopy = {
  meta: { title: string; description: string };
  nav: { signIn: string; createAccount: string };
  toggle: { label: string; en: string; hi: string };
  hero: {
    /** Tagline in two parts: the lead, then the gold-accented close. */
    taglineLead: string;
    taglineAccent: string;
    scroll: string;
  };
  /** The pinned analysis video: its headline overlay, then everything the
      HUD writes over the footage and everything on the report card. */
  video: { heading: string; footage: string };
  hud: {
    callouts: { elbow: Callout; swing: Callout; head: Callout };
    subject: { name: string; credit: string };
    readouts: { elbow: string; stride: string; batTip: string; phase: string };
    /** Keyed by the event labels in hero-drive-track.ts. */
    phases: Record<string, string>;
    units: { m: string; mph: string };
  };
  report: {
    kicker: string;
    subtitle: string;
    ofHundred: string;
    verdicts: { great: string; good: string; solid: string; keep: string };
    /** `{n}` is the points difference. */
    pill: { same: string; up: string; down: string };
    scoresKicker: string;
    tiles: [Tile, Tile, Tile];
    fixKicker: string;
    fixTitle: string;
    weakest: string;
    weakestShort: string;
    drillLabel: string;
    drill: string;
    approved: string;
    quote: string;
    chart: { kicker: string; ago: string; today: string };
  };
  steps: {
    kicker: string;
    heading: string;
    items: [Step, Step, Step];
    guide: string;
    /** Labels inside the step illustrations. */
    animations: { file: string; connect: string; connected: string };
  };
  wall: {
    kicker: string;
    heading: string;
    intro: string;
    featuredKicker: string;
    placeholders: [Stage, Stage, Stage];
    footnote: string;
    /** The skeleton figure's two measurement annotations. */
    figure: { elbow: string; stride: string };
  };
  more: {
    kicker: string;
    heading: string;
    items: [Stage, Stage, Stage, Stage];
  };
  trust: {
    kicker: string;
    heading: string;
    gates: [Gate, Gate, Gate];
  };
  cta: {
    heading: string;
    body: string;
    button: string;
    waitlistPrompt: string;
  };
  waitlist: {
    emailLabel: string;
    placeholder: string;
    join: string;
    joining: string;
    adding: string;
    invalid: string;
    noSpam: string;
    joinedTitle: string;
    joinedBody: string;
  };
  footer: {
    tagline: string;
    signIn: string;
    createAccount: string;
    safeguarding: string;
    tutorials: string;
    privacy: string;
    terms: string;
    contact: string;
    built: string;
  };
};

const en: LandingCopy = {
  meta: {
    title: "NextXI — AI-backed scouting for young cricketers",
    description:
      "Film your bowling or batting on a phone and build a profile scouts can check — measured technique and real footage, ready for the people who pick teams.",
  },
  nav: { signIn: "Sign in", createAccount: "Create account" },
  toggle: { label: "Language", en: "EN", hi: "हिंदी" },
  hero: {
    taglineLead: "Cricket talent,",
    taglineAccent: "seen properly",
    scroll: "Scroll",
  },
  video: {
    heading: "AI-backed scouting for young cricketers",
    footage: "Footage · Aryaman Varma · Professional cricketer",
  },
  hud: {
    callouts: {
      elbow: { label: "Front elbow", value: "118°" },
      swing: { label: "Swing path", value: "4.1 cm off" },
      head: { label: "Head travel", value: "11 cm" },
    },
    subject: { name: "Aryaman Varma", credit: "Wisden Schools Cricketer ’25 · England U19" },
    readouts: { elbow: "Elbow", stride: "Stride", batTip: "Bat tip", phase: "Phase" },
    phases: {
      stance: "stance",
      backlift: "backlift",
      trigger: "trigger",
      downswing: "downswing",
      impact: "impact",
      "follow-through": "follow-through",
      recovery: "recovery",
    },
    units: { m: "m", mph: "mph" },
  },
  report: {
    kicker: "Coaching report",
    subtitle: SUBTITLE,
    ofHundred: "of 100",
    verdicts: {
      great: "Great session",
      good: "Good session",
      solid: "Solid session",
      keep: "Keep building",
    },
    pill: {
      same: "About the same as last time",
      up: "▲ {n} on last session",
      down: "▼ {n} on last session",
    },
    scoresKicker: "Your 3 scores",
    tiles: [
      { name: "Front elbow", note: "Very good. Elbow stays high — almost elite." },
      { name: "Bat swing", note: "Needs work. Bat comes down 4.1 cm off straight — costs you most." },
      { name: "Head movement", note: "Big improvement. Head 3 cm steadier than usual." },
    ],
    fixKicker: "Fix this one thing",
    fixTitle: "Your bat swing",
    weakest: WEAKEST,
    weakestShort: WEAKEST_SHORT,
    drillLabel: "Your drill · ",
    drill: DRILL,
    approved: "Approved by an ECB Level 3 coach",
    quote: "Genuinely repeatable technique. Lock in the one thing above and the rest holds.",
    chart: { kicker: "Last 6 sessions", ago: "6 weeks ago", today: "today" },
  },
  steps: {
    kicker: "How it works",
    heading: "From the nets to the scout's desk",
    items: [
      {
        kicker: "01 · Upload",
        title: "Players upload videos",
        body: "Film a clip from the nets. Watch the short guide so the report can actually see your action.",
      },
      {
        kicker: "02 · Analyze",
        title: "AI builds your coaching report",
        body: "Our AI tracks your head, bat and feet through every ball, and turns the movement into real measurements — stride, head travel, swing path — in a report you can read on the bus home.",
      },
      {
        kicker: "03 · Connect",
        title: "Coaches & scouts find you",
        body: "Verified coaches and scouts watch your videos, read our AI report, and reach out. No talent goes undiscovered.",
      },
    ],
    guide: "Watch the recording guide",
    animations: { file: "over-14.mp4", connect: "Connect", connected: "Connected ✓" },
  },
  wall: {
    kicker: "Noticed through NextXI",
    heading: "The wall",
    intro:
      "Players who get a trial, a coach, or a call-up through this platform can land here — when they and their guardian want that story told. Every story is real. There's room for yours.",
    featuredKicker: "Noticed",
    placeholders: [
      { title: "The first story", body: "Lands here" },
      { title: "More stories", body: "On their way" },
      { title: "Your name", body: "Could be here" },
    ],
    footnote:
      "Nothing on this wall is ever invented. Every story is a real player, shared with their guardian's permission — first name and initial only.",
    figure: { elbow: "Elbow 128°", stride: "Stride 92 cm" },
  },
  more: {
    kicker: "One platform",
    heading: "End-to-end provider",
    items: [
      {
        title: "Sessions",
        body: "Track sessions, goals, and match stats across the season.",
      },
      {
        title: "AI report",
        body: "Every upload becomes a numbers-first coaching report — real measurements, not scores. When the footage can't be measured honestly, the report says so.",
      },
      {
        title: "Coach connections",
        body: "Coaches send connection requests to promising players and build their roster. Players can also request to connect with coaches.",
      },
      {
        title: "Get found",
        body: "Coaches and scouts search the player pool, watch your footage, and read your numbers. Interest comes to you — trials, sessions, a place in a squad.",
      },
    ],
  },
  trust: {
    kicker: "Built safe for youth cricket",
    heading: "The adults stay in the loop",
    gates: [
      {
        kicker: "Under 18",
        title: "Guardians see everything",
        body: "For players under the age of 18, parents/guardians get their own account linked to their child's. They see every report and every message.",
      },
      {
        kicker: "Coaches",
        title: "Verified before contact",
        body: "Every coach is checked and approved by us before they can contact any player.",
      },
      {
        kicker: "Footage",
        title: "Your videos, your call",
        body: "Videos stay private unless the player decides otherwise.",
      },
    ],
  },
  cta: {
    heading: "Ready to get seen.",
    body: "Create a player account. A couple of minutes, then you're on the card. Coaches and parents join from there.",
    button: "Create account",
    waitlistPrompt:
      "Not ready for an account yet? Leave your email and we'll write when there's news.",
  },
  waitlist: {
    emailLabel: "Email address",
    placeholder: "you@email.com",
    join: "Join the waitlist",
    joining: "Joining…",
    adding: "Adding you to the list…",
    invalid: "That email doesn't look right. Try again?",
    noSpam: "We'll send one email. No spam.",
    joinedTitle: "You're on the list.",
    joinedBody: "We'll email when there's news — no spam.",
  },
  footer: {
    tagline: "Cricket talent, seen properly.",
    signIn: "Sign in",
    createAccount: "Create account",
    safeguarding: "Safeguarding",
    tutorials: "Tutorials",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    built: "Built for young players, their guardians, and the coaches who find them.",
  },
};

const hi: LandingCopy = {
  meta: {
    title: "NextXI — युवा क्रिकेटरों के लिए AI-समर्थित स्काउटिंग",
    description:
      "अपनी बॉलिंग या बैटिंग फ़ोन पर शूट करें और ऐसी प्रोफ़ाइल बनाएँ जिसे स्काउट परख सकें — मापी हुई तकनीक और असली फ़ुटेज, टीम चुनने वालों के लिए तैयार।",
  },
  nav: { signIn: "साइन इन", createAccount: "अकाउंट बनाएँ" },
  toggle: { label: "भाषा", en: "EN", hi: "हिंदी" },
  hero: {
    taglineLead: "क्रिकेट टैलेंट,",
    taglineAccent: "सही नज़रों में",
    scroll: "स्क्रॉल करें",
  },
  video: {
    heading: "युवा क्रिकेटरों के लिए AI-समर्थित स्काउटिंग",
    footage: "फ़ुटेज · Aryaman Varma · पेशेवर क्रिकेटर",
  },
  hud: {
    callouts: {
      elbow: { label: "अगली कोहनी", value: "118°" },
      swing: { label: "स्विंग पाथ", value: "4.1 सेमी दूर" },
      head: { label: "सिर की हलचल", value: "11 सेमी" },
    },
    subject: { name: "Aryaman Varma", credit: "विज़डन स्कूल्स क्रिकेटर ’25 · इंग्लैंड U19" },
    readouts: { elbow: "कोहनी", stride: "स्ट्राइड", batTip: "बैट टिप", phase: "फ़ेज़" },
    phases: {
      stance: "स्टांस",
      backlift: "बैकलिफ़्ट",
      trigger: "ट्रिगर",
      downswing: "डाउनस्विंग",
      impact: "इम्पैक्ट",
      "follow-through": "फ़ॉलो-थ्रू",
      recovery: "रिकवरी",
    },
    units: { m: "मी", mph: "मील/घं" },
  },
  report: {
    kicker: "कोचिंग रिपोर्ट",
    subtitle: "Aryaman Varma · फ्रंट-फ़ुट ड्राइव · 12 गेंदें · 240 fps",
    ofHundred: "100 में से",
    verdicts: {
      great: "शानदार सेशन",
      good: "अच्छा सेशन",
      solid: "ठोस सेशन",
      keep: "लगे रहें",
    },
    pill: {
      same: "पिछली बार जैसा ही",
      up: "▲ पिछले सेशन से {n} ऊपर",
      down: "▼ पिछले सेशन से {n} नीचे",
    },
    scoresKicker: "आपके 3 स्कोर",
    tiles: [
      { name: "अगली कोहनी", note: "बहुत अच्छा। कोहनी ऊँची रहती है — लगभग एलीट।" },
      {
        name: "बैट स्विंग",
        note: "सुधार चाहिए। बैट सीधी रेखा से 4.1 सेमी हटकर आता है — सबसे ज़्यादा नुकसान यहीं।",
      },
      { name: "सिर की हलचल", note: "बड़ा सुधार। सिर पहले से 3 सेमी ज़्यादा स्थिर।" },
    ],
    fixKicker: "यह एक चीज़ ठीक करें",
    fixTitle: "आपका बैट स्विंग",
    weakest:
      "स्विंग पाथ डेविएशन। आख़िरी चार गेंदों पर यह आपके सामान्य 2.6–3.8 सेमी के मुक़ाबले 4.1 सेमी तक खुल जाता है, क्योंकि अगली कोहनी गिरती है — थकान में आपकी तकनीक यहीं ढीली पड़ती है।",
    weakestShort:
      "आख़िरी चार गेंदों पर स्विंग पाथ 4.1 सेमी तक खुल जाता है — थकते ही अगली कोहनी गिरती है।",
    drillLabel: "आपकी ड्रिल · ",
    drill:
      "3 × 10 फ्रंट-फ़ुट ड्राइव, पिछली एड़ी के नीचे एक कोन दबाकर; जिस पल कोहनी गिरे, सेट वहीं रोक दें — आप आख़िरी चार गेंदों की ट्रेनिंग कर रहे हैं, पहली आठ की नहीं।",
    approved: "ECB लेवल 3 कोच द्वारा स्वीकृत",
    quote: "सचमुच दोहराने लायक तकनीक। ऊपर वाली एक चीज़ पक्की कर लें, बाक़ी सब टिका रहेगा।",
    chart: { kicker: "पिछले 6 सेशन", ago: "6 हफ़्ते पहले", today: "आज" },
  },
  steps: {
    kicker: "यह कैसे काम करता है",
    heading: "नेट्स से स्काउट की टेबल तक",
    items: [
      {
        kicker: "01 · अपलोड",
        title: "खिलाड़ी वीडियो अपलोड करते हैं",
        body: "नेट्स में एक क्लिप शूट करें। छोटी-सी गाइड देख लें, ताकि रिपोर्ट आपका एक्शन ठीक से देख सके।",
      },
      {
        kicker: "02 · विश्लेषण",
        title: "AI आपकी कोचिंग रिपोर्ट बनाता है",
        body: "हमारा AI हर गेंद पर आपके सिर, बैट और पैरों को ट्रैक करता है, और उस मूवमेंट को असली मापों में बदलता है — स्ट्राइड, सिर की हलचल, स्विंग पाथ — एक ऐसी रिपोर्ट में जो आप घर लौटते हुए बस में पढ़ सकें।",
      },
      {
        kicker: "03 · कनेक्ट",
        title: "कोच और स्काउट आपको ढूँढते हैं",
        body: "वेरिफ़ाइड कोच और स्काउट आपके वीडियो देखते हैं, हमारी AI रिपोर्ट पढ़ते हैं, और आपसे संपर्क करते हैं। कोई टैलेंट अनदेखा नहीं रहता।",
      },
    ],
    guide: "रिकॉर्डिंग गाइड देखें",
    animations: { file: "ओवर-14.mp4", connect: "कनेक्ट", connected: "कनेक्टेड ✓" },
  },
  wall: {
    kicker: "NextXI के ज़रिए नज़र में आए",
    heading: "द वॉल",
    intro:
      "जिन खिलाड़ियों को इस प्लेटफ़ॉर्म के ज़रिए ट्रायल, कोच या कॉल-अप मिलता है, वे यहाँ आ सकते हैं — जब वे और उनके अभिभावक चाहें कि यह कहानी बताई जाए। हर कहानी सच्ची है। आपके लिए भी जगह है।",
    featuredKicker: "नज़र में आए",
    placeholders: [
      { title: "पहली कहानी", body: "यहाँ आएगी" },
      { title: "और कहानियाँ", body: "रास्ते में हैं" },
      { title: "आपका नाम", body: "यहाँ हो सकता है" },
    ],
    footnote:
      "इस वॉल पर कुछ भी गढ़ा हुआ नहीं है। हर कहानी एक असली खिलाड़ी की है, उनके अभिभावक की अनुमति से साझा की गई — सिर्फ़ पहला नाम और इनिशियल।",
    figure: { elbow: "कोहनी 128°", stride: "स्ट्राइड 92 सेमी" },
  },
  more: {
    kicker: "एक ही प्लेटफ़ॉर्म",
    heading: "शुरू से आख़िर तक",
    items: [
      {
        title: "सेशन",
        body: "पूरे सीज़न के सेशन, लक्ष्य और मैच के आँकड़े ट्रैक करें।",
      },
      {
        title: "AI रिपोर्ट",
        body: "हर अपलोड एक नंबरों पर टिकी कोचिंग रिपोर्ट बनता है — असली माप, स्कोर नहीं। जब फ़ुटेज को ईमानदारी से मापा न जा सके, रिपोर्ट साफ़ कह देती है।",
      },
      {
        title: "कोच से कनेक्शन",
        body: "कोच होनहार खिलाड़ियों को कनेक्शन रिक्वेस्ट भेजते हैं और अपनी टीम बनाते हैं। खिलाड़ी भी कोच से जुड़ने की रिक्वेस्ट भेज सकते हैं।",
      },
      {
        title: "नज़र में आएँ",
        body: "कोच और स्काउट खिलाड़ियों के पूल में खोजते हैं, आपकी फ़ुटेज देखते हैं, और आपके नंबर पढ़ते हैं। मौके ख़ुद आपके पास आते हैं — ट्रायल, सेशन, स्क्वाड में जगह।",
      },
    ],
  },
  trust: {
    kicker: "युवा क्रिकेट के लिए सुरक्षित बनाया गया",
    heading: "बड़े हमेशा जानकारी में रहते हैं",
    gates: [
      {
        kicker: "18 से कम",
        title: "अभिभावक सब कुछ देखते हैं",
        body: "18 साल से कम उम्र के खिलाड़ियों के माता-पिता/अभिभावकों को अपना अलग अकाउंट मिलता है, जो बच्चे के अकाउंट से जुड़ा होता है। वे हर रिपोर्ट और हर मैसेज देखते हैं।",
      },
      {
        kicker: "कोच",
        title: "संपर्क से पहले वेरिफ़ाइड",
        body: "हर कोच को किसी भी खिलाड़ी से संपर्क करने से पहले हम जाँचते और मंज़ूरी देते हैं।",
      },
      {
        kicker: "फ़ुटेज",
        title: "आपके वीडियो, आपका फ़ैसला",
        body: "वीडियो प्राइवेट रहते हैं, जब तक खिलाड़ी ख़ुद कुछ और न तय करे।",
      },
    ],
  },
  cta: {
    heading: "नज़र में आने के लिए तैयार।",
    body: "प्लेयर अकाउंट बनाएँ। बस दो मिनट, और आप लिस्ट में हैं। कोच और माता-पिता वहीं से जुड़ते हैं।",
    button: "अकाउंट बनाएँ",
    waitlistPrompt: "अभी अकाउंट नहीं बनाना? अपना ईमेल छोड़ जाएँ, कोई ख़बर होगी तो हम लिखेंगे।",
  },
  waitlist: {
    emailLabel: "ईमेल पता",
    placeholder: "aap@email.com",
    join: "वेटलिस्ट में जुड़ें",
    joining: "जुड़ रहे हैं…",
    adding: "आपको लिस्ट में जोड़ रहे हैं…",
    invalid: "यह ईमेल सही नहीं लग रहा। फिर से कोशिश करें?",
    noSpam: "हम एक ही ईमेल भेजेंगे। कोई स्पैम नहीं।",
    joinedTitle: "आप लिस्ट में हैं।",
    joinedBody: "कोई ख़बर होगी तो ईमेल करेंगे — कोई स्पैम नहीं।",
  },
  footer: {
    tagline: "क्रिकेट टैलेंट, सही नज़रों में।",
    signIn: "साइन इन",
    createAccount: "अकाउंट बनाएँ",
    safeguarding: "सुरक्षा",
    tutorials: "ट्यूटोरियल",
    privacy: "प्राइवेसी",
    terms: "शर्तें",
    contact: "संपर्क",
    built: "युवा खिलाड़ियों, उनके अभिभावकों, और उन्हें ढूँढने वाले कोचों के लिए बनाया गया।",
  },
};

const COPY: Record<LandingLang, LandingCopy> = { en, hi };

export function getLandingCopy(lang: LandingLang): LandingCopy {
  return COPY[lang];
}
