// Strip trailing slashes and trailing /v1 so `${baseUrl}/v1/chat/completions` always forms the correct path
const rawUrl = (import.meta.env.VITE_NATLAS_API_URL || import.meta.env.NATLAS_API_URL || "").trim().replace(/\/+$/, "").replace(/\/v1$/, "");
const rawTtsUrl = (import.meta.env.VITE_WAZOBIA_TTS_API_URL || import.meta.env.WAZOBIA_TTS_API_URL || "").trim().replace(/\/+$/, "").replace(/\/v1$/, "");

// N-ATLaS Endpoints strictly loaded from environment variables (.env)
export const DEFAULT_ENDPOINTS = {
  llmUrl: rawUrl,
  asrUrl: rawUrl,
  ttsUrl: rawTtsUrl,
  apiKey: (import.meta.env.VITE_NATLAS_API_KEY || import.meta.env.NATLAS_API_KEY || "").trim(),
  ttsApiKey: (import.meta.env.VITE_WAZOBIA_TTS_API_KEY || import.meta.env.WAZOBIA_TTS_API_KEY || "none").trim(),
};

// Returns true when the playground has the minimum config to make API calls
export const isConfigured = () =>
  Boolean(DEFAULT_ENDPOINTS.llmUrl && DEFAULT_ENDPOINTS.apiKey);

// Wazobia Sovereign XTTS-v2 Speech Synthesis Models
export const TTS_MODELS = [
  {
    id: "samuelolubukun/xtts-v2-yoruba-openbible-conversational",
    name: "Yoruba XTTS",
    lang: "yo",
    hfUrl: "https://huggingface.co/samuelolubukun/xtts-v2-yoruba-openbible-conversational",
    description: "Natural conversational speech synthesis with authentic pacing and expressive Yoruba voice inflection.",
    badge: "Yoruba",
    sampleText: "Àjọṣepọ̀ àti ìrẹ́pọ̀ ló ń mú ìlọsíwájú wá. Nígbà tí a bá fi ọwọ́ kan ṣiṣẹ́, àṣeyọrí máa ń tètè dé fún gbogbo wa.",
  },
  {
    id: "samuelolubukun/xtts-v2-hausa-openbible-conversational",
    name: "Hausa XTTS",
    lang: "ha",
    hfUrl: "https://huggingface.co/samuelolubukun/xtts-v2-hausa-openbible-conversational",
    description: "Natural conversational speech synthesis with authentic pacing and expressive Hausa voice inflection.",
    badge: "Hausa",
    sampleText: "Hadin kai da zaman lafiya sune ginshikin ci gaba. Idan muna aiki tare da zuciya daya, komai zai tafi daidai.",
  },
  {
    id: "samuelolubukun/xtts-v2-igbo-openbible-conversational",
    name: "Igbo XTTS",
    lang: "ig",
    hfUrl: "https://huggingface.co/samuelolubukun/xtts-v2-igbo-openbible-conversational",
    description: "Natural conversational speech synthesis with authentic pacing and expressive Igbo voice inflection.",
    badge: "Igbo",
    sampleText: "Udo na ọganihu dị mma maka obodo anyị. Mgbe anyị na-enyere ibe anyị aka, ndụ na-aka mma.",
  },
];

// Voices for XTTS-v2
export const TTS_VOICES = [
  {
    id: "male_victor",
    name: "Victor (Male)",
    gender: "Male",
    tagline: "Nigerian male speaker reference timbre",
    accent: "Nigerian",
  },
  {
    id: "female_blessing",
    name: "Blessing (Female)",
    gender: "Female",
    tagline: "Nigerian female speaker reference timbre",
    accent: "Nigerian",
  },
];

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
  { id: "general", name: "General AI (Universal)", shortName: "General AI", code: "en", greeting: "Hello! I am N-ATLaS. How can I help you today?" },
  { id: "yoruba", name: "Yorùbá", shortName: "Yorùbá", code: "yo", greeting: "Ẹ n lẹ́ o! Kí ni mo lè ràn yín lọ́wọ́ pẹ̀lú lónìí?" },
  { id: "hausa", name: "Hausa", shortName: "Hausa", code: "ha", greeting: "Sannu! Me zan iya taimaka muku da shi a yau?" },
  { id: "igbo", name: "Igbo", shortName: "Igbo", code: "ig", greeting: "Nnọọ! Kedụ ihe m nwere ike inyere gị taa?" },
];

export const CULTURAL_CONTEXTS = [
  { id: "Yoruba", name: "Yoruba Cultural Respect", desc: "Traditional respect etiquette, honorifics, and proverbs" },
  { id: "Hausa-Fulani", name: "Hausa Community Tone", desc: "Hospitable, gentle, respectful community phrasing" },
  { id: "Igbo-Eastern", name: "Igbo Enterprise Tone", desc: "Sharp, enterprising, cordial business relationship framing" },
];
