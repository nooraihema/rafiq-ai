
import express from "express";
import { chatGemini } from "../ai/gemini";

export const aiRouter = express.Router();

aiRouter.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const reply = await chatGemini(history || [], "أنت نور، مساعد ودود.");
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "حصل خطأ أثناء الاتصال بالذكاء الاصطناعي." });
  }
});
