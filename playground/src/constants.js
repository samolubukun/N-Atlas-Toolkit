// N-ATLaS Endpoints strictly loaded from environment variables (.env)
export const DEFAULT_ENDPOINTS = {
  llmUrl: import.meta.env.VITE_NATLAS_API_URL || import.meta.env.NATLAS_API_URL || "",
  asrUrl: import.meta.env.VITE_NATLAS_ASR_URL || import.meta.env.NATLAS_ASR_URL || "",
  apiKey: import.meta.env.VITE_NATLAS_API_KEY || import.meta.env.NATLAS_API_KEY || "",
};

// Returns true when the playground has the minimum config to make API calls
export const isConfigured = () =>
  Boolean(DEFAULT_ENDPOINTS.llmUrl && DEFAULT_ENDPOINTS.apiKey);



// 4 Pretrained Sovereign ASR Models
export const ASR_MODELS = [
  {
    id: "NCAIR1/Yoruba-ASR",
    name: "Yoruba ASR",
    lang: "yo",
    description: "Fine-tuned for Yoruba tones, diacritics, and regional accents.",
    badge: "Yorùbá",
    sampleText: "Báwo ni o ṣe wà? Ṣé àlàáfíà ni gbogbo nǹkan?",
  },
  {
    id: "NCAIR1/Hausa-ASR",
    name: "Hausa ASR",
    lang: "ha",
    description: "Optimized for Northern Nigerian Hausa dialects and conversational speech.",
    badge: "Hausa",
    sampleText: "Ina kwana, yaya aiki? Fata kowa yana lafiya.",
  },
  {
    id: "NCAIR1/Igbo-ASR",
    name: "Igbo ASR",
    lang: "ig",
    description: "Trained on standard and dialectal Igbo phonetics and idioms.",
    badge: "Asụsụ Igbo",
    sampleText: "Kedu ka ị mere? Anyị na-enwe olileanya na ihe niile dị mma.",
  },
  {
    id: "NCAIR1/NigerianAccentedEnglish",
    name: "Nigerian Accented English",
    lang: "en-ng",
    description: "Trained on authentic Nigerian English cadence, stress, and accent patterns.",
    badge: "Nigerian English",
    sampleText: "Good morning! How is everything going today? Hope there is no problem.",
  },
];

// LLM Language & Persona Switchers
export const LLM_LANGUAGES = [
  { id: "general", name: "General AI (Universal)", shortName: "General AI", code: "en", greeting: "Hello! I am N-ATLaS. How can I help you today with coding, reasoning, analysis, or general questions?" },
  { id: "english", name: "Nigerian English", shortName: "Nig. English", code: "en-NG", greeting: "Good day! How is everything with you today? What would you like us to work on?" },
  { id: "yoruba", name: "Yorùbá", shortName: "Yorùbá", code: "yo", greeting: "Ẹ n lẹ́ o! Kí ni mo lè ràn yín lọ́wọ́ pẹ̀lú lónìí?" },
  { id: "hausa", name: "Hausa", shortName: "Hausa", code: "ha", greeting: "Sannu! Me zan iya taimaka muku da shi a yau?" },
  { id: "igbo", name: "Igbo", shortName: "Igbo", code: "ig", greeting: "Nnọọ! Kedụ ihe m nwere ike inyere gị taa?" },
];


export const CULTURAL_CONTEXTS = [
  { id: "Yoruba", name: "Yoruba Cultural Respect", desc: "Traditional respect etiquette, honorifics, and proverbs" },
  { id: "Hausa-Fulani", name: "Hausa Community Tone", desc: "Hospitable, gentle, respectful community phrasing" },
  { id: "Igbo-Eastern", name: "Igbo Enterprise Tone", desc: "Sharp, enterprising, cordial business relationship framing" },
];
