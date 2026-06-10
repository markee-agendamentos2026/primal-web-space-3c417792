import { useEffect, useState } from "react";

/** Hook que digita um texto char a char. */
export function useTypewriter(text: string, speed = 28, startDelay = 350) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOut("");
    setDone(false);
    let i = 0;
    let cancelled = false;
    const start = setTimeout(() => {
      const tick = () => {
        if (cancelled) return;
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          setDone(true);
          return;
        }
        setTimeout(tick, speed);
      };
      tick();
    }, startDelay);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [text, speed, startDelay]);

  return { text: out, done };
}

/** Texto da "IA" com efeito de três pontinhos antes de começar a digitar. */
export function MarkeeTyping({
  text,
  speed = 26,
  thinkMs = 700,
  className = "",
}: {
  text: string;
  speed?: number;
  thinkMs?: number;
  className?: string;
}) {
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    setThinking(true);
    const t = setTimeout(() => setThinking(false), thinkMs);
    return () => clearTimeout(t);
  }, [text, thinkMs]);

  const { text: typed, done } = useTypewriter(
    thinking ? "" : text,
    speed,
    thinking ? 999999 : 0,
  );

  return (
    <div className={className} aria-live="polite">
      {thinking ? (
        <span className="inline-flex items-center text-primary">
          <span className="markee-dot" />
          <span className="markee-dot" />
          <span className="markee-dot" />
        </span>
      ) : (
        <span>
          {typed}
          {!done && <span className="opacity-60">▍</span>}
        </span>
      )}
    </div>
  );
}
