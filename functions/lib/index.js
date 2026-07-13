"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = void 0;
const dotenv = require("dotenv");
dotenv.config();
const functions = require("firebase-functions");
console.log("====================================");
console.log("OPENAI =", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
console.log("CLAUDE =", process.env.CLAUDE_API_KEY ? "Loaded" : "Missing");
console.log("GEMINI =", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
console.log("====================================");
exports.generateAIResponse = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const { model, systemPrompt, userText } = data;
    if (!userText) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a userText property.");
    }
    try {
        // -------------------------------------------------------------
        // CHATGPT (OpenAI)
        // -------------------------------------------------------------
        if (model === "chatgpt") {
            const apiKey = process.env.OPENAI_API_KEY || ((_a = functions.config().openai) === null || _a === void 0 ? void 0 : _a.key);
            if (!apiKey)
                throw new functions.https.HttpsError("failed-precondition", "Missing OpenAI API Key.");
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt || "" },
                        { role: "user", content: userText }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7,
                })
            });
            if (!response.ok) {
                if (response.status === 401)
                    throw new functions.https.HttpsError("unauthenticated", "Invalid OpenAI API Key.");
                if (response.status === 429)
                    throw new functions.https.HttpsError("resource-exhausted", "Rate limited or out of OpenAI credits.");
                throw new functions.https.HttpsError("unknown", `OpenAI API returned status ${response.status}`);
            }
            const result = await response.json();
            return { text: ((_d = (_c = (_b = result.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || "No response." };
        }
        // -------------------------------------------------------------
        // CLAUDE (Anthropic)
        // -------------------------------------------------------------
        else if (model === "claude") {
            const apiKey = process.env.CLAUDE_API_KEY || ((_e = functions.config().claude) === null || _e === void 0 ? void 0 : _e.key);
            if (!apiKey)
                throw new functions.https.HttpsError("failed-precondition", "Missing Claude API Key.");
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
                })
            });
            if (!response.ok) {
                if (response.status === 401)
                    throw new functions.https.HttpsError("unauthenticated", "Invalid Claude API Key.");
                if (response.status === 403 || response.status === 400) {
                    const errBody = await response.json().catch(() => ({}));
                    if ((_g = (_f = errBody === null || errBody === void 0 ? void 0 : errBody.error) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.includes("credit balance is too low")) {
                        throw new functions.https.HttpsError("resource-exhausted", "Claude credits are exhausted.");
                    }
                }
                throw new functions.https.HttpsError("unknown", `Claude API returned status ${response.status}`);
            }
            const result = await response.json();
            return { text: ((_j = (_h = result.content) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.text) || "No response." };
        }
        // -------------------------------------------------------------
        // GEMINI (Google)
        // -------------------------------------------------------------
        else if (model === "gemini") {
            const apiKey = process.env.GEMINI_API_KEY || ((_k = functions.config().gemini) === null || _k === void 0 ? void 0 : _k.key);
            if (!apiKey)
                throw new functions.https.HttpsError("failed-precondition", "Missing Gemini API Key.");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt || "" }] },
                    contents: [{ role: "user", parts: [{ text: userText }] }],
                    generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
                })
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403)
                    throw new functions.https.HttpsError("unauthenticated", "Invalid Gemini API Key.");
                if (response.status === 429)
                    throw new functions.https.HttpsError("resource-exhausted", "Rate limited on Gemini API.");
                throw new functions.https.HttpsError("unknown", `Gemini API returned status ${response.status}`);
            }
            const result = await response.json();
            return { text: ((_q = (_p = (_o = (_m = (_l = result.candidates) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.content) === null || _o === void 0 ? void 0 : _o.parts) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.text) || "No response." };
        }
        throw new functions.https.HttpsError("invalid-argument", "Unsupported model requested.");
    }
    catch (error) {
        // Re-throw standardized Firebase HttpsErrors
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", (error === null || error === void 0 ? void 0 : error.message) || "Internal server error");
    }
});
//# sourceMappingURL=index.js.map
