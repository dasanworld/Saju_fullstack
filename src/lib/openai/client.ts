import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { generateSajuPrompt } from "../gemini/prompt";
import type { SajuInput } from "../gemini/types";

export type OpenAIModel = "gpt-4.1-mini";

export const streamOpenAIAnalysis = async (
  input: SajuInput,
  model: OpenAIModel = "gpt-4.1-mini"
) => {
  const prompt = generateSajuPrompt(input);

  const result = streamText({
    model: openai(model),
    prompt,
    temperature: 0.7,
  });

  return result;
};
