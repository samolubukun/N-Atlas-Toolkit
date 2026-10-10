import axios from "axios";
import { ChatMessage } from "../interfaces/chat-message.interface";

export default (messages: ChatMessage[]) => {
  const apiUrl = process.env.NATLAS_API_URL || process.env.API_URL || "http://localhost:8000/v1/chat/completions";
  const apiKey = process.env.NATLAS_API_KEY || process.env.API_KEY || "natlas-local";
  const model = process.env.NATLAS_MODEL || process.env.MODEL || "NCAIR1/N-ATLaS";

  // System instruction enforcing authentic Wazobia (Yoruba, Hausa, Igbo) & English
  const systemPrompt = {
    role: "system",
    content: "You are an intelligent multilingual assistant powered by N-ATLaS. You fluently understand and respond in Yorùbá, Hausa, Igbo, and English. Always match the language the user speaks. Do not use broken or slang Nigerian Pidgin.",
  };

  const finalMessages = messages[0]?.role === "system" ? messages : [systemPrompt, ...messages];

  return axios.post(
    apiUrl,
    {
      model,
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    },
  );
};
