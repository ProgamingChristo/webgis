import { useState, useCallback } from "react";
import { AiService, AiAskRequest, AiAskResponse } from "../services/ai.service";

type AiState = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

export function useAi() {
  const [state, setState] = useState<AiState>("IDLE");
  const [response, setResponse] = useState<AiAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (req: AiAskRequest) => {
    setState("LOADING");
    setError(null);
    setResponse(null);

    try {
      const res = await AiService.askQuestion(req);
      setResponse(res);
      setState("SUCCESS");
    } catch (err: any) {
      setError(err.message || "Failed to get AI response");
      setState("ERROR");
    }
  }, []);

  const reset = useCallback(() => {
    setState("IDLE");
    setResponse(null);
    setError(null);
  }, []);

  return { state, response, error, askQuestion, reset };
}
