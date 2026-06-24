import { IconBrandGithub, IconBookmark } from "@tabler/icons-react";
import Hero from "./components/Hero.tsx";
import BentoFeatures from "./components/BentoFeatures.tsx";
import Playground from "./components/Playground.tsx";

export default function App() {
  const scrollToWorkspace = () => {
    const workspaceElement = document.getElementById("workspace");
    if (workspaceElement) {
      workspaceElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Fixed noise overlay */}
      <div className="noise-overlay" />

      {/* Floating navigation bar */}
      <nav className="fixed top-0 left-0 right-0 h-16 glass-panel border-b border-white/5 z-40 flex items-center justify-between px-6 md:px-12 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToWorkspace}>
          <IconBookmark className="text-emerald-400" size={20} />
          <span className="font-bold text-white tracking-tight text-lg">bkmrk</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              scrollToWorkspace();
            }}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Playground
          </a>
          <a
            href="https://github.com/aminzibayi/bookmark-parser"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <IconBrandGithub size={14} />
            <span>GitHub</span>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-16 flex flex-col gap-4">
        {/* Hero Section */}
        <Hero onLaunchClick={scrollToWorkspace} />

        {/* Bento Grid */}
        <BentoFeatures />

        {/* Interactive Workspace */}
        <Playground />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-neutral-900 bg-[#050505] text-center text-xs text-neutral-500 relative z-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>&copy; {new Date().getFullYear()} bkmrk. Released under the MIT License.</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-600">
            <span>Zero dependencies</span>
            <span>&bull;</span>
            <span>Secure local parsing</span>
            <span>&bull;</span>
            <span>Open source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
