import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "listening" | "no-speech" | "denied" | "unsupported";

export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported =
    typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Impl = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Impl) {
      setStatus("unsupported");
      return;
    }

    const recognition = new Impl();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setTranscript("");
      setStatus("listening");
    };
    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("denied");
      } else if (event.error === "no-speech") {
        setStatus("no-speech");
      } else {
        setStatus("idle");
      }
    };
    recognition.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setStatus("idle");
  }, []);

  return { supported, status, transcript, start, stop, reset };
}
