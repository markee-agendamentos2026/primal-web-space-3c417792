import { motion } from "framer-motion";

/**
 * Markee — entidade de IA.
 * Núcleo escuro com olhos vivos (ambos piscam em sincronia),
 * anel orbital "vivo" girando ao redor e halo cromático sutil.
 * Sem sorriso — presença mais misteriosa e futurista.
 * Respeita prefers-reduced-motion.
 */
export function MarkeeFace({ size = 200 }: { size?: number }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // timeline do piscar (sincronizado nos dois olhos)
  const blinkTimes = [0, 0.82, 0.86, 0.9, 0.94, 1];
  const blinkScale = [1, 1, 0.06, 1, 0.06, 1];
  const blinkOpacity = [1, 1, 0, 1, 0, 1];

  return (
    <motion.div
      aria-hidden
      style={{ width: size, height: size }}
      className="relative inline-block"
      animate={reduced ? undefined : { y: [0, -4, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* halo cromático difuso */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)",
          filter: "blur(26px)",
          opacity: 0.9,
        }}
      />

      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative"
      >
        <defs>
          {/* núcleo escuro com profundidade */}
          <radialGradient id="markee-core" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="oklch(0.32 0.08 280)" />
            <stop offset="55%" stopColor="oklch(0.18 0.06 275)" />
            <stop offset="100%" stopColor="oklch(0.10 0.04 275)" />
          </radialGradient>

          {/* gradiente do anel orbital */}
          <linearGradient id="markee-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--primary-glow)" stopOpacity="1" />
            <stop offset="65%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>

          {/* iris dos olhos */}
          <radialGradient id="markee-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary-glow)" />
            <stop offset="60%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="oklch(0.45 0.18 280)" />
          </radialGradient>

          <filter id="markee-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          <filter id="markee-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* anel orbital externo — vivo, girando */}
        <motion.g
          style={{ transformOrigin: "100px 100px" }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="url(#markee-ring)"
            strokeWidth="1.2"
            strokeDasharray="2 6"
            opacity="0.85"
          />
        </motion.g>

        {/* anel interno — gira ao contrário, mais lento */}
        <motion.g
          style={{ transformOrigin: "100px 100px" }}
          animate={reduced ? undefined : { rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.35"
            strokeWidth="0.6"
            strokeDasharray="1 3"
          />
          {/* nó orbital pulsante */}
          <motion.circle
            cx="186"
            cy="100"
            r="2.4"
            fill="var(--primary-glow)"
            filter="url(#markee-eye-glow)"
            animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.g>

        {/* arcos energéticos parciais */}
        <motion.g
          style={{ transformOrigin: "100px 100px" }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <path
            d="M 100 22 A 78 78 0 0 1 178 100"
            fill="none"
            stroke="var(--primary-glow)"
            strokeWidth="1.2"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />
          <path
            d="M 100 178 A 78 78 0 0 1 22 100"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            strokeLinecap="round"
          />
        </motion.g>

        {/* núcleo */}
        <circle cx="100" cy="100" r="72" fill="url(#markee-core)" />

        {/* sutil aro interno */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="64"
          fill="none"
          stroke="white"
          strokeOpacity="0.05"
          strokeWidth="0.6"
        />

        {/* reflexo top */}
        <ellipse
          cx="82"
          cy="68"
          rx="38"
          ry="14"
          fill="white"
          opacity="0.06"
          filter="url(#markee-soft)"
        />

        {/* OLHOS — ambos piscam em sincronia */}
        {[76, 124].map((cx) => (
          <g key={cx} transform={`translate(${cx} 102)`}>
            <motion.g
              initial={false}
              animate={
                reduced
                  ? { scaleY: 1, opacity: 1 }
                  : { scaleY: blinkScale, opacity: blinkOpacity }
              }
              transition={{
                duration: 4.6,
                times: blinkTimes,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "0px 0px" }}
            >
              {/* iris luminosa */}
              <circle
                r="8.5"
                fill="url(#markee-iris)"
                filter="url(#markee-eye-glow)"
              />
              {/* pupila */}
              <circle r="3.6" fill="#0a0a14" />
              {/* brilho */}
              <circle cx="-2.2" cy="-2.4" r="1.4" fill="white" opacity="0.9" />
            </motion.g>
            {/* pálpebra (linha) durante o piscar */}
            <motion.path
              d="M -9 0 Q 0 0 9 0"
              stroke="var(--primary-glow)"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              initial={false}
              animate={
                reduced
                  ? { opacity: 0 }
                  : { opacity: [0, 0, 0.9, 0, 0.9, 0] }
              }
              transition={{
                duration: 4.6,
                times: blinkTimes,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
