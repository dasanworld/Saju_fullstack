import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
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
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error("Gemini API error", error);
    return null;
  }
};

export const streamSajuAnalysis = async (
  input: SajuInput,
  model: GeminiModel
) => {
  const prompt = generateSajuPrompt(input);

  const result = streamText({
    model: google(model),
    prompt,
    temperature: 0.7,
  });

  return result;
};
