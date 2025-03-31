const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const OPENAI_API_KEY = "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"; // Replace with your key
const GOOGLE_TTS_API_KEY = "AIzaSyCMHdA07nZuD8C5dujk5ArW4NvGzie3LiU"; // Replace with your key

// 🔹 Route to get OpenAI response with better handling
app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.text;

        // 🔹 Step 1: Request AI Response with a Higher Max Token Limit
        const openaiResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                max_tokens: 50, // Set slightly higher to avoid premature cuts
                temperature: 0.7, // Control randomness
                messages: [
                    { role: "system", content: "You are a helpful AI that helps diagnose the user's illness by asking relevant questions." },
                    { role: "user", content: userMessage }
                ],
                stop: ["\n\n"], // Ensures OpenAI stops naturally at a full response
            },
            { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" } }
        );

        let aiText = openaiResponse.data.choices[0].message.content;

        // 🔹 Step 2: Trim Excess Text (if response exceeds a reasonable length)
        const maxLength = 500; // Adjust this based on how long you want responses
        if (aiText.length > maxLength) {
            aiText = aiText.substring(0, maxLength).trim();
        }

        res.json({ response: aiText });

    } catch (error) {
        console.error("❌ Error getting OpenAI response:", error);
        res.status(500).json({ error: "Failed to get AI response" });
    }
});

// 🔹 Route to get Google TTS API Key
app.get("/tts-key", (req, res) => {
    res.json({ apiKey: GOOGLE_TTS_API_KEY });
});

// 🔹 Route to get Google TTS Audio URL
app.post("/tts", async (req, res) => {
    try {
        const textToSpeak = req.body.text;
        
        const ttsResponse = await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                input: { text: textToSpeak },
                voice: { languageCode: "en-GB", name: "en-GB-Standard-A" },
                audioConfig: { audioEncoding: "MP3" }
            }
        );

        const audioContent = ttsResponse.data.audioContent;
        res.json({ audio: `data:audio/mp3;base64,${audioContent}` });

    } catch (error) {
        console.error("Error getting Google TTS:", error);
        res.status(500).json({ error: "Failed to get TTS audio" });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


