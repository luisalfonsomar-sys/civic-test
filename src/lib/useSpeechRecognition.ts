import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "listening" | "no-speech" | "denied" | "unsupported" | "error";

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

    // Abort whatever's currently running first — a double-tap (or any call to start() while a
    // previous instance is still winding down) would otherwise overwrite recognitionRef without
    // stopping the old instance, leaving it running with nothing able to stop() it, and its
    // events still writing into shared state alongside the new instance's.
    recognitionRef.current?.abort();

    const recognition = new Impl();
    recognition.lang = "en-US";
    // Keep listening across pauses instead of the browser auto-ending after a moment of
    // silence — recording should only stop when the user explicitly taps the mic again, not
    // whenever they pause mid-thought or stumble over a word.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Late events from an instance that's since been replaced (aborted-but-not-yet-settled, or
    // orphaned by a race) must not clobber state that now belongs to the current instance.
    const isCurrent = () => recognitionRef.current === recognition;

    recognition.onstart = () => {
      if (!isCurrent()) return;
      setTranscript("");
      setStatus("listening");
    };
    recognition.onresult = (event) => {
      if (!isCurrent()) return;
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined.trim());
    };
    recognition.onerror = (event) => {
      if (!isCurrent()) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("denied");
      } else if (event.error === "no-speech") {
        setStatus("no-speech");
      } else {
        // A genuine error (network drop, audio-capture failure, an aborted-by-the-browser
        // session) is NOT the same as the user finishing their answer — screens key auto-grading
        // off status === "idle", so this must land on a distinct status or a half-spoken,
        // mid-sentence transcript gets silently graded as the user's final answer.
        setStatus("error");
      }
    };
    recognition.onend = () => {
      if (!isCurrent()) return;
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
