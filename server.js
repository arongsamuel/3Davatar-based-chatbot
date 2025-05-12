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
// Initialize SQLite database with a file path


// ✅ Serve the index.html file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Chatbot API Route
// 🔹 Route to get OpenAI response with better handling
app.post("/chat", async (req, res) => {
    try {
      const { systemPrompt, sessionMemory } = req.body;

      // Use sessionMemory directly to build the messages array
      const messages = [
          { role: "system", content: `You are a medical triage assistant following the World Health Organization (WHO) triage guidelines. Your task is to efficiently and accurately assess the patient's condition with minimal follow-up questions, while being thorough, creative in identifying potential health issues, and empathetic in addressing the patient's concerns.
                
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
                
                    Use your creativity and medical reasoning to consider different possibilities when symptoms are unclear or don't align with a specific condition. Guide the patient toward more precise answers and ensure the most accurate recommendation possible.
                    
                    After the final classification, do no ask further questions. Instead, provide a summary of the conversation and the recommended course of action.` },
          ...sessionMemory
      ];

      // Request AI Response
      const openaiResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
              model: "gpt-4o-mini",
              max_tokens: 150,
              temperature: 0.7,
              messages: messages,
              stop: ["###", "<|endoftext|>"]
          },
          { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" } }
      );

      const aiText = openaiResponse.data.choices[0].message.content;

      res.json({ response: aiText });
  

    } catch (error) {
        console.error("❌ Error getting OpenAI response:", error);
        res.status(500).json({ error: "Failed to get AI response" });
    }
});

// ✅ Google TTS API Route
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

