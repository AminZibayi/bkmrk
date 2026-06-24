import { motion } from "motion/react";

interface HeroProps {
  onLaunchClick: () => void;
}

export default function Hero({ onLaunchClick }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-16 overflow-hidden">
      {/* Background glowing mesh */}
      <div className="absolute inset-0 oled-grid pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-6">
        {/* 1. Small uppercase badge */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-3 py-1 text-xs font-semibold tracking-wider text-emerald-400 uppercase border border-emerald-500/20 bg-emerald-950/20 rounded-full"
        >
          ZERO DEPENDENCIES
        </motion.span>

        {/* 2. Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight md:leading-none text-white max-w-3xl"
        >
          High-Performance Netscape
          <br />
          Bookmark Parser & Browser
        </motion.h1>

        {/* 3. Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-lg text-neutral-400 max-w-xl"
        >
          Drop your browser bookmark export. View, clean, filter, and convert it instantly right in
          the browser.
        </motion.p>

        {/* 4. Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 pt-4"
        >
          <button
            onClick={onLaunchClick}
            className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
          >
            Launch Parser
          </button>
          <a
            href="https://github.com/aminzibayi/bookmark-parser"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-all cursor-pointer"
          >
            View GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
