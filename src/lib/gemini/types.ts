export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro";

export type SajuInput = {
  name: string;
  birth_date: string;
  birth_time: string | null;
  gender: "male" | "female";
};

export type GeminiError = {
  message: string;
  code?: string;
};
