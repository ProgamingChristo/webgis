import { useState, useCallback, useRef } from "react";
import {
  AiService,
  type AiAskMessage,
  type AiAskRequest,
  type AiAskResponse,
} from "../services/ai.service";

type AiState = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

export function useAi() {
  const generation = useRef(0);
  const [state, setState] = useState<AiState>("IDLE");
  const [messages, setMessages] = useState<AiAskMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiAskResponse["provider"] | null>(null);

  const askQuestion = useCallback(async (req: AiAskRequest, onResponse?: (response: AiAskResponse) => Promise<string | undefined>) => {
    const requestGeneration = ++generation.current;
    setState("LOADING");
    setError(null);
    setProvider(null);

    const userMessage: AiAskMessage = { role: "user", content: req.question };
    const history = messages.slice(-8);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const res = await AiService.askQuestion({
        ...req,
        history,
      });
      if (requestGeneration !== generation.current) return;
      const appliedAnswer = await onResponse?.(res);
      if (requestGeneration !== generation.current) return;
      const assistantMessage: AiAskMessage = { role: "assistant", content: appliedAnswer ?? res.answer };
      setMessages([...nextMessages, assistantMessage]);
      setProvider(res.provider);
      setState("SUCCESS");
      return res;
    } catch (err: unknown) {
      if (requestGeneration !== generation.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Asisten sedang tidak dapat digunakan. Coba lagi.",
      );
      setProvider(null);
      setState("ERROR");
      return null;
    }
  }, [messages]);

  const appendAssistantMessage = useCallback((content: string) => {
    setMessages((current) => [...current, { role: "assistant", content }]);
  }, []);

  const clearChat = useCallback(() => {
    generation.current++;
    setMessages([]);
    setError(null);
    setProvider(null);
    setState("IDLE");
  }, []);

  const reset = useCallback(() => {
    generation.current++;
    setState("IDLE");
    setMessages([]);
    setError(null);
    setProvider(null);
  }, []);

  return { state, messages, error, provider, askQuestion, appendAssistantMessage, clearChat, reset };
}
