require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Serve static files (HTML, JS, CSS, GLB files, etc.)
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// ✅ Serve the index.html file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Chatbot API Route
app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.text;
        const openaiResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o",
                max_tokens: 100,
                temperature: 0.7,
                messages: [
                    { role: "system", content: "You are a helpful AI assistant." },
                    { role: "user", content: userMessage }
                ],
            },
            { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" } }
        );

        res.json({ response: openaiResponse.data.choices[0].message.content });

    } catch (error) {
        console.error("Error getting OpenAI response:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to get AI response", details: error.message });
    }
});

// ✅ Google TTS API Route
app.get("/tts-key", (req, res) => {
    res.json({ apiKey: GOOGLE_TTS_API_KEY });
});



// 🔥 **Warm-Up Google TTS API Connection on Server Start**
const preloadGoogleTTS = async () => {
    try {
        console.log("🔄 Preloading Google TTS connection...");

        // Send a dummy text to the correct endpoint used by TalkingHead
        await axios.post(
            `https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                input: { text: "Hello, I am ready!" },
                voice: { languageCode: "en-GB", name: "en-GB-Standard-A" },
                audioConfig: { audioEncoding: "MP3" }
            }
        );

        console.log("✅ Google TTS connection warmed up!");
    } catch (error) {
        console.error("⚠️ Google TTS preload failed:", error.response ? error.response.data : error.message);
    }
};

// 🚀 Start the Server & Warm Up TTS
const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    await preloadGoogleTTS();
});
