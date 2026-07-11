import * as dotenv from "dotenv";
dotenv.config();

import * as functions from "firebase-functions";

console.log("====================================");
console.log("OPENAI =", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
console.log("CLAUDE =", process.env.CLAUDE_API_KEY ? "Loaded" : "Missing");
console.log("GEMINI =", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
console.log("====================================");

export const generateAIResponse = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    const { model, systemPrompt, userText } = data;

    if (!userText) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a userText property.",
      );
    }

    try {
      // -------------------------------------------------------------
      // CHATGPT (OpenAI)
      // -------------------------------------------------------------
      if (model === "chatgpt") {
        const apiKey =
          process.env.OPENAI_API_KEY || functions.config().openai?.key;
        if (!apiKey)
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Missing OpenAI API Key.",
          );

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt || "" },
                { role: "user", content: userText },
              ],
              max_tokens: 1500,
              temperature: 0.7,
            }),
          },
        );

        if (!response.ok) {
          if (response.status === 401)
            throw new functions.https.HttpsError(
              "unauthenticated",
              "Invalid OpenAI API Key.",
            );
          if (response.status === 429)
            throw new functions.https.HttpsError(
              "resource-exhausted",
              "Rate limited or out of OpenAI credits.",
            );
          throw new functions.https.HttpsError(
            "unknown",
            `OpenAI API returned status ${response.status}`,
          );
        }
        const result = await response.json();
        return {
          text: result.choices?.[0]?.message?.content || "No response.",
        };
      }

      // -------------------------------------------------------------
      // CLAUDE (Anthropic)
      // -------------------------------------------------------------
      else if (model === "claude") {
        const apiKey =
          process.env.CLAUDE_API_KEY || functions.config().claude?.key;
        if (!apiKey)
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Missing Claude API Key.",
          );

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1500,
            system: systemPrompt || "",
            messages: [{ role: "user", content: userText }],
          }),
        });

        if (!response.ok) {
          if (response.status === 401)
            throw new functions.https.HttpsError(
              "unauthenticated",
              "Invalid Claude API Key.",
            );
          if (response.status === 403 || response.status === 400) {
            const errBody = await response.json().catch(() => ({}));
            if (
              errBody?.error?.message?.includes("credit balance is too low")
            ) {
              throw new functions.https.HttpsError(
                "resource-exhausted",
                "Claude credits are exhausted.",
              );
            }
          }
          throw new functions.https.HttpsError(
            "unknown",
            `Claude API returned status ${response.status}`,
          );
        }
        const result = await response.json();
        return { text: result.content?.[0]?.text || "No response." };
      }

      // -------------------------------------------------------------
      // GEMINI (Google)
      // -------------------------------------------------------------
      else if (model === "gemini") {
        const apiKey =
          process.env.GEMINI_API_KEY || functions.config().gemini?.key;
        if (!apiKey)
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Missing Gemini API Key.",
          );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt || "" }] },
              contents: [{ role: "user", parts: [{ text: userText }] }],
              generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
            }),
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403)
            throw new functions.https.HttpsError(
              "unauthenticated",
              "Invalid Gemini API Key.",
            );
          if (response.status === 429)
            throw new functions.https.HttpsError(
              "resource-exhausted",
              "Rate limited on Gemini API.",
            );
          throw new functions.https.HttpsError(
            "unknown",
            `Gemini API returned status ${response.status}`,
          );
        }
        const result = await response.json();
        return {
          text:
            result.candidates?.[0]?.content?.parts?.[0]?.text || "No response.",
        };
      }

      throw new functions.https.HttpsError(
        "invalid-argument",
        "Unsupported model requested.",
      );
    } catch (error: any) {
      // Re-throw standardized Firebase HttpsErrors
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error?.message || "Internal server error",
      );
    }
  },
);
