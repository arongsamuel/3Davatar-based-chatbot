require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Serve static files (HTML, JS, CSS, GLB files, etc.)
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
// Initialize SQLite database with a file path
const db = new sqlite3.Database('./conversations.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, user_message TEXT, ai_response TEXT)");
});

// ✅ Serve the index.html file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Chatbot API Route
// 🔹 Route to get OpenAI response with better handling
app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.text;

        // 🔹 Step 1: Retrieve past conversations
        db.all("SELECT * FROM conversations", async (err, rows) => {
            if (err) {
                console.error("❌ Error fetching conversations:", err);
                res.status(500).json({ error: "Failed to fetch conversations" });
                return;
            }

            // 🔹 Step 2: Include relevant context in the new request
            const conversationHistory = rows.map(row => ({ role: "user", content: row.user_message })).concat(
                rows.map(row => ({ role: "assistant", content: row.ai_response }))
            );

            const messages = [
                {
                    role: "system",
                    content: `You are a medical triage assistant following the World Health Organization (WHO) triage guidelines. Your task is to efficiently and accurately assess the patient's condition with minimal follow-up questions, while being thorough, creative in identifying potential health issues, and empathetic in addressing the patient's concerns.
                
                    Start by asking the patient **one question at a time** to assess their symptoms:
                    
                    1. **Onset**: "When did your symptoms first start?"
                    - Wait for the patient's response. Based on their answer, proceed to the next question.
                    
                    2. **Severity**: "How would you rate the severity of your symptoms? Are they getting better or worse?"
                    - Wait for the response. Depending on the severity, ask more specific questions about their condition if needed.
                
                    3. **Location of symptoms** (if applicable): "Can you describe where you are feeling pain or discomfort?"
                    - Wait for the response. This helps in narrowing down possible conditions.
                
                    4. **Associated symptoms**: "Are you experiencing any other symptoms, such as dizziness, difficulty breathing, or a fever?"
                    - Wait for the response. Additional symptoms can help determine the urgency.
                
                    5. **Primary concern**: "What is your main concern right now, or what is troubling you the most about your condition?"
                    - Wait for the response. This helps you understand the patient's emotional state and prioritize your approach.
                
                    Once you have gathered all the relevant information, classify the urgency of the situation:
                
                    - **Emergency (RED)**: Immediate life-threatening condition. Advise the patient to call emergency services immediately.
                    - **Urgent (YELLOW)**: Condition that requires timely medical attention but is not life-threatening. Recommend seeing a healthcare provider soon.
                    - **Non-urgent (GREEN)**: Condition that can be managed with self-care or a scheduled consultation.
                
                    If the patient is classified as **RED**, immediately recommend they contact emergency services. For **YELLOW** or **GREEN**, you may ask up to **3 additional follow-up questions** to refine the recommendation if necessary.
                
                    Be **clear**, **concise**, and **efficient** in your responses. Avoid unnecessary steps while still providing a brief explanation of how you reached your conclusion. Be mindful of the patient's emotional state and offer reassurance when appropriate, especially if their symptoms are causing concern.
                
                    Use your creativity and medical reasoning to consider different possibilities when symptoms are unclear or don't align with a specific condition. Guide the patient toward more precise answers and ensure the most accurate recommendation possible.`
                  },
                ...conversationHistory,
                { role: "user", content: userMessage }
            ];

            // 🔹 Step 3: Request AI Response with a Higher Max Token Limit
            const openaiResponse = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o-mini",
                    max_tokens: 150, // Set slightly higher to avoid premature cuts
                    temperature: 0.7, // Control randomness
                    messages: messages,
                    stop: ["###", "<|endoftext|>"], // Ensures OpenAI stops naturally at a full response
                },
                { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" } }
            );

            let aiText = openaiResponse.data.choices[0].message.content;

            // 🔹 Step 4: Trim Excess Text (if response exceeds a reasonable length)
            const maxLength = 500; // Adjust this based on how long you want responses
            //if (aiText.length > maxLength) {
            //    aiText = aiText.substring(0, maxLength).trim();
            //}

            // 🔹 Step 5: Store conversation in the database
            db.run("INSERT INTO conversations (user_message, ai_response) VALUES (?, ?)", [userMessage, aiText]);

            res.json({ response: aiText });
        });

    } catch (error) {
        console.error("❌ Error getting OpenAI response:", error);
        res.status(500).json({ error: "Failed to get AI response" });
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
