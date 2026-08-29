import { useState, useCallback } from "react";
import { AiService, AiAskRequest, AiAskMessage } from "../services/ai.service";

type AiState = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

export function useAi() {
  const [state, setState] = useState<AiState>("IDLE");
  const [messages, setMessages] = useState<AiAskMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (req: AiAskRequest) => {
    setState("LOADING");
    setError(null);

    const userMessage: AiAskMessage = { role: "user", content: req.question };
    const history = messages.slice(-8);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const res = await AiService.askQuestion({
        ...req,
        history,
      });
      const assistantMessage: AiAskMessage = { role: "assistant", content: res.answer };
      setMessages([...nextMessages, assistantMessage]);
      setState("SUCCESS");
    } catch (err: any) {
      setError(err.message || "Failed to get AI response");
      setState("ERROR");
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setState("IDLE");
  }, []);

  const reset = useCallback(() => {
    setState("IDLE");
    setMessages([]);
    setError(null);
  }, []);

  return { state, messages, error, askQuestion, clearChat, reset };
}
