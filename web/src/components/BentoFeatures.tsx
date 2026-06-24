import { useState, useEffect } from "react";
import { IconShieldLock, IconBolt, IconFilter } from "@tabler/icons-react";

export default function BentoFeatures() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative max-w-6xl mx-auto px-6 py-16">
      <div className="grid grid-cols-12 gap-6">
        {/* Cell 1: Pure Performance */}
        <div className="col-span-12 md:col-span-8 glass-panel glass-panel-hover rounded-2xl p-8 flex flex-col justify-between min-h-[300px] overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <IconBolt size={20} />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Pure Performance
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                RegExp State Machine Parser
              </h2>
              <p className="text-sm text-neutral-400 max-w-md">
                Streamlined synchronous scanner parses HTML exports exceeding 50MB in milliseconds.
                Avoids heavy DOM parsing.
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-extrabold text-emerald-400">92ms</span>
              <p className="text-xs text-neutral-500">to parse 50MB</p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center text-xs text-neutral-500 mb-2">
              <span>Simulated Stream Scan</span>
              <span>{progress}%</span>
            </div>
            {/* Animating progress bar with no background track, clean inline indicator */}
            <div className="h-1 relative w-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cell 2: Privacy First */}
        <div className="col-span-12 md:col-span-4 glass-panel glass-panel-hover rounded-2xl p-8 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <IconShieldLock size={20} />
              <span className="text-xs font-semibold tracking-wider uppercase">Privacy First</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">100% Client Side</h2>
            <p className="text-sm text-neutral-400">
              Your bookmarks never touch a server. All operations are computed securely in your
              browser sandbox.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center py-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Concentric rings */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-emerald-500/40" />
              <IconShieldLock className="text-emerald-400 z-10" size={28} />
            </div>
          </div>
        </div>

        {/* Cell 3: URL Sanitization */}
        <div className="col-span-12 glass-panel glass-panel-hover rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-h-[220px]">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <IconFilter size={20} />
              <span className="text-xs font-semibold tracking-wider uppercase">
                URL Sanitization
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Strip Tracker & Analytics Bloat</h2>
            <p className="text-sm text-neutral-400">
              Clean tracking parameters like utm_source, utm_medium, fbclid, and gclid from your
              URLs automatically. Re-export lightweight bookmarks.
            </p>
          </div>

          <div className="w-full md:w-auto flex-shrink-0 flex flex-col gap-2 bg-neutral-950/80 p-4 border border-neutral-900 rounded-xl max-w-sm">
            <div className="text-xs font-mono text-neutral-500 mb-1 border-b border-neutral-900 pb-2">
              URL Transformation Preview
            </div>
            <div className="text-xs font-mono text-red-400 break-all select-all">
              https://example.com/item?id=123&utm_source=twitter&fbclid=IwAR123
            </div>
            <div className="flex items-center justify-center my-1 text-neutral-600">↓</div>
            <div className="text-xs font-mono text-emerald-400 break-all select-all">
              https://example.com/item?id=123
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
