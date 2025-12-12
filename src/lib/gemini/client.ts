import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { generateSajuPrompt } from "./prompt";
import type { GeminiModel, SajuInput } from "./types";

export const generateSajuAnalysis = async (
  input: SajuInput,
  model: GeminiModel
): Promise<string | null> => {
  try {
    const prompt = generateSajuPrompt(input);

    const { text } = await generateText({
      model: google(model),
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error("Gemini API error", error);
    return null;
  }
};
