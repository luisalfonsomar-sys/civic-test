import { useEffect, useRef, useState } from "react";

/**
 * Live microphone volume, sampled into `barCount` buckets (0–1 each) via the Web Audio API,
 * updated on every animation frame while `active` is true. Runs alongside SpeechRecognition
 * (which handles the actual transcription) purely to drive a waveform that reacts to the
 * speaker's real voice instead of playing a canned animation — separate getUserMedia stream,
 * torn down whenever `active` goes false or the component unmounts.
 */
export function useMicLevels(active: boolean, barCount: number): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(barCount).fill(0));
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const smoothedRef = useRef<number[]>(Array(barCount).fill(0));

  useEffect(() => {
    if (!active) {
      smoothedRef.current = Array(barCount).fill(0);
      setLevels(Array(barCount).fill(0));
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const chunk = Math.max(1, Math.floor(data.length / barCount));

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const next: number[] = [];
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < chunk; j++) sum += data[i * chunk + j] ?? 0;
            const raw = Math.min(1, sum / chunk / 255);
            // Light exponential smoothing so bars settle rather than flicker frame to frame.
            const prev = smoothedRef.current[i];
            const smoothed = prev * 0.5 + raw * 0.5;
            smoothedRef.current[i] = smoothed;
            next.push(smoothed);
          }
          setLevels([...next]);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic access denied/unavailable for the visualizer — the bars just stay flat; the actual
        // speech recognition flow (with its own separate permission prompt) is unaffected.
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current = null;
      audioCtxRef.current = null;
    };
  }, [active, barCount]);

  return levels;
}
