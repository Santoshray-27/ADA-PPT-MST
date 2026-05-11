import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ============== TYPES ==============
interface Edge { u: string; v: string; weight: number }
interface GraphNode { id: string; x: number; y: number }
interface Step { text: string; type: 'consider' | 'add' | 'skip' | 'done'; edge?: Edge }

// ============== DATA ==============
// Graph dimensions - using viewBox 0 0 500 350 for consistent scaling
const GRAPH_WIDTH = 500;
const GRAPH_HEIGHT = 350;
const NODE_RADIUS = 24;

// Node positions - centers of nodes in the SVG coordinate system
const nodes: GraphNode[] = [
  { id: 'A', x: 100, y: 80 },   // Top left
  { id: 'B', x: 400, y: 80 },   // Top right
  { id: 'C', x: 400, y: 270 },  // Bottom right
  { id: 'D', x: 100, y: 270 },  // Bottom left
];

const edges: Edge[] = [
  { u: 'A', v: 'B', weight: 1 },  // Top edge
  { u: 'B', v: 'C', weight: 4 },  // Right edge
  { u: 'C', v: 'D', weight: 2 },  // Bottom edge
  { u: 'D', v: 'A', weight: 3 },  // Left edge
  { u: 'A', v: 'C', weight: 5 },  // Diagonal
];

const code = `// 1. Structure to hold edge data
STRUCTURE Edge:
    integer source
    integer destination
    integer weight

// 2. Sorting rule for edges
FUNCTION CompareEdges(edge A, edge B):
    RETURN A.weight < B.weight

// Main Algorithm
START MAIN:
    // Define the graph
    integer vertices = 4
    integer totalEdges = 5
    ARRAY parent[100]
    
    ARRAY edges = [
        Edge(0, 1, 1),
        Edge(0, 2, 3),
        Edge(1, 2, 2),
        Edge(1, 3, 4),
        Edge(2, 3, 5)
    ]

    // STEP 1: Initialize the Disjoint Set (each node is its own leader)
    FOR i FROM 0 TO vertices - 1:
        parent[i] = i

    // STEP 2: Sort edges by weight in ascending order
    SORT edges USING CompareEdges

    integer totalCost = 0
    PRINT "Edges included in the MST:"

    // STEP 3: Iterate through each edge starting from the lightest
    FOR i FROM 0 TO totalEdges - 1:
        
        // Find the absolute root (leader) of the source node
        integer root1 = edges[i].source
        WHILE parent[root1] IS NOT EQUAL TO root1:
            root1 = parent[root1]
            
        // Find the absolute root (leader) of the destination node
        integer root2 = edges[i].destination
        WHILE parent[root2] IS NOT EQUAL TO root2:
            root2 = parent[root2]

        // STEP 4: Check for cycles
        // If the roots are different, adding this edge won't create a cycle
        IF root1 IS NOT EQUAL TO root2 THEN
            
            // Connect the two sets (Union)
            parent[root1] = root2
            
            // Add weight to the total cost
            totalCost = totalCost + edges[i].weight
            
            // Print the selected edge
            PRINT edges[i].source + " - " + edges[i].destination + " (Cost: " + edges[i].weight + ")"
            
        END IF
        
    END FOR

    PRINT "Total Minimum Cost: " + totalCost

END MAIN`;

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'introduction', label: 'Introduction' },
  { id: 'greedy', label: 'Greedy Approach' },
  { id: 'comparison', label: 'Kruskal vs Prim' },
  { id: 'kruskal', label: "Kruskal's" },
  { id: 'prim', label: "Prim's" },
  { id: 'visualizer', label: 'Visualizer' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'complexity', label: 'Complexity' },
  { id: 'questions', label: 'Practice Questions' },
];

// ============== UNION FIND ==============
class UnionFind {
  parent: number[]; rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  unite(x: number, y: number): boolean {
    const rx = this.find(x), ry = this.find(y);
    if (rx === ry) return false;
    if (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry;
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx;
    else { this.parent[ry] = rx; this.rank[rx]++; }
    return true;
  }
}

// ============== THEME HOOK ==============
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('mst-theme');
      if (s === 'light' || s === 'dark') return s;
    }
    return 'dark';
  });
  useEffect(() => {
    const r = document.documentElement;
    r.classList.remove('light', 'dark');
    r.classList.add(theme);
    localStorage.setItem('mst-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}

function getCSSVar(n: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
}

// ============== STAGGER ANIMATION ==============
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ============== BACKGROUND EFFECTS ==============
function BackgroundEffects() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 400 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      
      const target = e.target as HTMLElement;
      const hovering = !!target.closest('button, a, .glass-card');
      if (hovering !== isHovering) setIsHovering(hovering);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovering, mouseX, mouseY]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      <motion.div
        className="absolute rounded-full blur-[100px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--accent-cyan), transparent 70%)',
          width: '600px',
          height: '600px',
          x: springX,
          y: springY,
          left: -300,
          top: -300,
          opacity: isHovering ? 0.15 : 0.08,
          scale: isHovering ? 1 : 0.66,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute rounded-full blur-[120px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--accent-purple), transparent 70%)',
          width: '500px',
          height: '500px',
          x: useTransform(springX, x => x * 0.5),
          y: useTransform(springY, y => y * 0.5 + 200),
          left: 0,
          top: 0,
          opacity: 0.05,
        }}
      />
    </div>
  );
}

// ============== MAIN APP ==============
export default function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { theme, toggle } = useTheme();
  const lenisRef = useRef<Lenis | null>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Track scroll top button visibility
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Intersection Observer for active section tracking
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => {
      lenis.destroy();
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el && lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: 0, duration: 1.5 });
    }
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundEffects />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <HeroBackground />
      </div>
      {/* Scroll Progress */}
      <motion.div 
        className="scroll-progress shadow-[0_0_15px_var(--accent-cyan)]" 
        style={{ 
          scaleX, 
          transformOrigin: "0%",
          background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))' 
        }} 
      />

      {/* Sidebar */}
      <Sidebar
        active={activeSection}
        onNavigate={scrollTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
      />

      {/* Mobile Menu Button */}
      <motion.button
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 left-4 z-40 lg:hidden p-3 rounded-2xl transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </motion.button>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            className="scroll-to-top"
            onClick={() => lenisRef.current?.scrollTo(0, { duration: 1.5 })}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64">
        <HeroSection onNavigate={scrollTo} />
        <IntroductionSection />
        <GreedySection />
        <ComparisonSection />
        <KruskalStepsSection />
        <PrimStepsSection />
        <VisualizerSection />
        <SimulatorSection />
        <ImplementationSection theme={theme} />
        <ComplexitySection />
        <QuestionsSection onNavigate={scrollTo} />
      </main>
    </div>
  );
}

// ============== SIDEBAR ==============
function Sidebar({ active, onNavigate, isOpen, onClose, theme, onToggleTheme }: {
  active: string; onNavigate: (id: string) => void; isOpen: boolean; onClose: () => void;
  theme: 'dark' | 'light'; onToggleTheme: () => void;
}) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
      <nav
        className={`fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          flex flex-col backdrop-blur-2xl`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base text-white"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            whileHover={{ rotate: 10, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            M
          </motion.div>
          <span className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>MST</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          {sections.map((s, i) => {
            const isActive = active === s.id;
            return (
              <motion.button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-all duration-200 group"
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active)' : undefined,
                  border: isActive ? '1px solid var(--sidebar-active-border)' : '1px solid transparent',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)'
                }}
              >
                <span
                  className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--sidebar-num-bg)',
                    color: isActive ? '#ffffff' : 'var(--sidebar-text)',
                    boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                    transition: 'none' // Disable transition to prevent gradient vs color desync
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14px] font-semibold tracking-tight">
                  {s.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Theme Toggle */}
        <div className="p-4 mt-auto" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={onToggleTheme}
            className="theme-toggle justify-between"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  className="text-base leading-none"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </motion.span>
              </div>
              <span className="text-xs font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className="w-8 h-4 rounded-full relative" style={{ background: 'var(--bg-hover)' }}>
              <motion.div
                animate={{ x: theme === 'dark' ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-3 h-3 rounded-full"
                style={{ background: 'var(--accent-cyan)' }}
              />
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}

// ============== SECTION WRAPPER ==============
function Section({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`section ${className}`}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

// ============== FLOATING PARTICLES ==============
function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `rgba(129, 140, 248, 0.4)`
          }}
          animate={{ y: [0, -800], opacity: [0, 0.5, 0.5, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// ============== HERO BACKGROUND ==============
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle Premium Gradient Orbs */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[140px] opacity-15 mix-blend-normal dark:mix-blend-screen"
        style={{ background: 'radial-gradient(circle, var(--accent-blue), transparent 70%)', top: '-20%', left: '-10%' }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-10 mix-blend-normal dark:mix-blend-screen"
        style={{ background: 'radial-gradient(circle, var(--accent-purple), transparent 70%)', bottom: '-10%', right: '-5%' }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Elegant Grid Overlay - Matching screenshot style */}
      <div
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(var(--accent-blue) 1px, transparent 1px), linear-gradient(90deg, var(--accent-blue) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
}

// ============== HERO ==============
const HeroSection = memo(function HeroSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-20">
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="text-center relative z-10 max-w-5xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase mb-12"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-accent)', color: 'var(--accent-cyan)' }}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          Interactive Learning Experience
        </motion.div>

        {/* Title - Redesigned to match screenshot */}
        <h1 className="mb-6 leading-[0.95] tracking-tighter relative z-20 font-black" style={{ fontSize: 'clamp(48px, 12vw, 160px)' }}>
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            style={{ 
              display: 'block', 
              color: 'var(--hero-title-1)', 
              marginBottom: '-0.05em'
            }}
          >
            Minimum
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            style={{ 
              display: 'inline-block',
              position: 'relative',
              padding: '0 0.15em',
              color: 'var(--hero-title-2)',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ 
              position: 'absolute', 
              inset: '0.15em 0', 
              backgroundColor: 'var(--hero-highlight)',
              zIndex: -1,
              borderRadius: '4px'
            }}></span>
            Spanning Tree
          </motion.span>
        </h1>

        {/* Subtitle */}
        <p className="text-body max-w-2xl mx-auto mb-16 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Master the art of finding optimal connections. Explore Kruskal's and Prim's
          algorithms through interactive visualizations and step-by-step explanations.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('introduction')}
            className="btn-primary min-w-[200px]"
          >
            Start Learning
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('visualizer')}
            className="btn-secondary min-w-[200px]"
          >
            Jump to Visualizer
          </motion.button>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 hidden lg:block"
        >
          <div className="w-6 h-10 rounded-full flex justify-center p-1.5" style={{ border: '2px solid var(--border-accent)' }}>
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1 h-2 rounded-full"
              style={{ background: 'var(--accent-cyan)' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
});

// ============== INTRODUCTION ==============
const IntroductionSection = memo(function IntroductionSection() {
  const apps = [
    { icon: '📡', title: 'Telecommunications', desc: 'Laying fiber-optic cables to connect cities at the lowest cost.' },
    { icon: '🛣️', title: 'Transportation', desc: 'Designing road networks using the least amount of asphalt.' },
    { icon: '⚡', title: 'Electrical Grids', desc: 'Wiring a neighborhood using the minimum length of copper wire.' },
  ];

  return (
    <Section id="introduction">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>01 — Foundations</span>
      </div>
      <h2 className="text-h1 mb-8">
        Introduction to <span style={{ color: 'var(--accent-cyan)' }}>MST</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-h3 mb-3">Spanning Tree</h3>
            <p className="text-body">
              A <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>Spanning Tree</span> is a subset of a graph that
              includes all vertices and is a tree (no cycles).
            </p>
          </div>
          <div className="glass-card p-6" style={{ borderColor: 'var(--border-accent)' }}>
            <h3 className="text-h3 mb-3">Minimum Spanning Tree</h3>
            <p className="text-body">
              Among all possible spanning trees, the one with the{' '}
              <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>minimum total edge weight</span> is the MST.
            </p>
          </div>
        </div>
        <div className="accent-card-cyan p-8 flex flex-col justify-center">
          <div className="text-center">
            <div className="text-h1 mb-3" style={{ color: 'var(--accent-cyan)' }}>V − 1</div>
            <p className="text-body">
              If there are <span className="font-bold" style={{ color: 'var(--text-primary)' }}>V</span> vertices, the MST will always
              contain exactly <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>V−1</span> edges.
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-h2 mb-6">Real-World Applications</h3>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid sm:grid-cols-3 gap-6"
      >
        {apps.map((app, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="glass-card p-6 group"
            whileHover={{ y: -4 }}
          >
            <div className="text-4xl mb-4">{app.icon}</div>
            <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{app.title}</h4>
            <p className="text-body" style={{ fontSize: '15px' }}>{app.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
});

// ============== GREEDY ==============
const GreedySection = memo(function GreedySection() {
  return (
    <Section id="greedy">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>02 — Strategy</span>
      </div>
      <h2 className="text-h1 mb-6">
        Why the <span style={{ color: 'var(--accent-cyan)' }}>Greedy Approach</span>?
      </h2>
      <p className="text-body mb-10 text-readable-wide">
        The Greedy design paradigm makes the locally optimal choice at each step without worrying
        about the future. MST is a textbook example of this working perfectly because of two key properties.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="accent-card-cyan p-6"
          whileHover={{ y: -4 }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(129,140,248,0.15)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--accent-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-h2 mb-3">Greedy Choice Property</h3>
          <p className="text-body">
            We simply pick the "cheapest" available edge that doesn't violate our rules — like forming a cycle.
            We don't look at the whole graph at once.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="accent-card-blue p-6"
          whileHover={{ y: -4 }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--accent-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-h2 mb-3">Optimal Substructure</h3>
          <p className="text-body">
            By making these locally greedy choices, we are mathematically guaranteed to reach the globally
            optimal solution — the minimum total weight spanning tree.
          </p>
        </motion.div>
      </div>

      <div className="glass-card p-8 text-center">
        <p className="text-xl italic" style={{ color: 'var(--text-secondary)' }}>
          "You don't need to analyze the whole graph at once — just keep picking the{' '}
          <span className="font-semibold not-italic" style={{ color: 'var(--accent-cyan)' }}>cheapest valid edge</span>."
        </p>
      </div>
    </Section>
  );
});

// ============== COMPARISON ==============
const ComparisonSection = memo(function ComparisonSection() {
  const rows = [
    { feature: 'Focus', kruskal: 'Edge-centric', prim: 'Vertex-centric' },
    { feature: 'Logic', kruskal: 'Grows MST by picking cheapest valid edges', prim: 'Grows MST by expanding from a connected cluster' },
    { feature: 'Data Structure', kruskal: 'Disjoint Set Union (Union-Find)', prim: 'Priority Queue / Min-Heap' },
    { feature: 'Best For', kruskal: 'Sparse Graphs (fewer edges)', prim: 'Dense Graphs (many edges)' },
    { feature: 'Starting Point', kruskal: 'No specific start needed', prim: 'Requires a starting vertex' },
  ];

  return (
    <Section id="comparison">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>03 — Comparison</span>
      </div>
      <h2 className="text-h1 mb-4">
        Kruskal's vs <span style={{ color: 'var(--accent-cyan)' }}>Prim's</span>
      </h2>
      <p className="text-body mb-10 text-readable-wide">
        Two different greedy strategies that yield the exact same minimum weight.
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
              <th className="text-left px-6 py-4 font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>Feature</th>
              <th className="text-left px-6 py-4 font-semibold text-base" style={{ color: 'var(--accent-cyan)' }}>Kruskal's</th>
              <th className="text-left px-6 py-4 font-semibold text-base" style={{ color: 'var(--accent-blue)' }}>Prim's</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors"
                style={{ borderTop: '1px solid var(--border-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-6 py-4 font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{row.feature}</td>
                <td className="px-6 py-4 text-base" style={{ color: 'var(--text-secondary)' }}>{row.kruskal}</td>
                <td className="px-6 py-4 text-base" style={{ color: 'var(--text-secondary)' }}>{row.prim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="glass-card p-5">
            <h4 className="font-bold text-base mb-3" style={{ color: 'var(--text-primary)' }}>{row.feature}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(129,140,248,0.08)' }}>
                <span className="text-sm font-semibold block mb-1" style={{ color: 'var(--accent-cyan)' }}>Kruskal's</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.kruskal}</span>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }}>
                <span className="text-sm font-semibold block mb-1" style={{ color: 'var(--accent-blue)' }}>Prim's</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.prim}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
});

// ============== KRUSKAL STEPS ==============
const KruskalStepsSection = memo(function KruskalStepsSection() {
  const steps = [
    { num: '01', title: 'Sort the Edges', desc: 'Sort all edges in the graph from lowest weight to highest weight.' },
    { num: '02', title: 'Pick the Smallest Edge', desc: 'Look at the cheapest edge available in your sorted list.' },
    { num: '03', title: 'Check for Cycles', desc: 'If adding this edge creates a cycle (both nodes already in same tree), discard it. Otherwise, add it.' },
    { num: '04', title: 'Repeat Until Complete', desc: 'Keep evaluating edges until your MST contains exactly V−1 edges.' },
  ];

  return (
    <Section id="kruskal">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>04 — Algorithm</span>
      </div>
      <h2 className="text-h1 mb-3">
        Kruskal's <span style={{ color: 'var(--accent-cyan)' }}>Algorithm</span>
      </h2>
      <p className="text-body mb-10 text-readable-wide">Edge-centric approach · Uses Disjoint Set Union for cycle detection</p>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-5 items-start"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.15), rgba(168,139,250,0.05))', border: '1px solid var(--border-accent)' }}>
              <span className="font-bold text-base" style={{ color: 'var(--accent-cyan)' }}>{step.num}</span>
            </div>
            <div className="glass-card p-5 flex-1">
              <h3 className="text-h3 mb-2">{step.title}</h3>
              <p className="text-body" style={{ fontSize: '15px' }}>{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
});

// ============== PRIM STEPS ==============
const PrimStepsSection = memo(function PrimStepsSection() {
  const steps = [
    { num: '01', title: 'Initialize', desc: 'Start with an empty MST and pick one arbitrary vertex to begin.' },
    { num: '02', title: 'Evaluate', desc: 'Look at all edges connecting your "visited" vertices to "unvisited" vertices.' },
    { num: '03', title: 'Expand', desc: 'Select the edge with the absolute lowest weight. Add that edge and the new vertex to your visited set.' },
    { num: '04', title: 'Repeat Until Complete', desc: 'Continue expanding the perimeter until all vertices are visited.' },
  ];

  return (
    <Section id="prim">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-blue)' }}>05 — Algorithm</span>
      </div>
      <h2 className="text-h1 mb-3">
        Prim's <span style={{ color: 'var(--accent-blue)' }}>Algorithm</span>
      </h2>
      <p className="text-body mb-10 text-readable-wide">Vertex-centric approach · Uses Priority Queue / Min-Heap</p>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-5 items-start"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.05))', border: '1px solid var(--border-accent-2)' }}>
              <span className="font-bold text-base" style={{ color: 'var(--accent-blue)' }}>{step.num}</span>
            </div>
            <div className="glass-card p-5 flex-1">
              <h3 className="text-h3 mb-2">{step.title}</h3>
              <p className="text-body" style={{ fontSize: '15px' }}>{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
});

// ============== VISUALIZER (FIXED ALIGNMENT) ==============
const VisualizerSection = memo(function VisualizerSection() {
  const [algorithm, setAlgorithm] = useState<'kruskal' | 'prim'>('kruskal');
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [mstEdges, setMstEdges] = useState<Edge[]>([]);
  const [consideringEdge, setConsideringEdge] = useState<Edge | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [speed, setSpeed] = useState(1200);
  const [skippedEdge, setSkippedEdge] = useState<Edge | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nodeMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  const generateKruskalSteps = useCallback((): Step[] => {
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const result: Step[] = [];
    const uf = new UnionFind(4);
    let count = 0;
    for (const edge of sorted) {
      if (count >= 3) break;
      const canAdd = uf.find(nodeMap[edge.u]) !== uf.find(nodeMap[edge.v]);
      result.push({ text: `Considering edge ${edge.u}—${edge.v} (weight ${edge.weight})`, type: 'consider', edge });
      if (canAdd) {
        uf.unite(nodeMap[edge.u], nodeMap[edge.v]);
        count++;
        result.push({ text: `✓ Added ${edge.u}—${edge.v} (weight ${edge.weight}) to MST`, type: 'add', edge });
      }
      else {
        result.push({ text: `✗ Skipped ${edge.u}—${edge.v} — would create a cycle`, type: 'skip', edge });
      }
    }
    result.push({ text: '🎉 MST complete! Total weight = 6', type: 'done' });
    return result;
  }, []);

  const generatePrimSteps = useCallback((): Step[] => {
    const result: Step[] = [];
    const visited = new Set(['A']);
    const mst: Edge[] = [];
    let cost = 0;
    const getAdj = (v: string) => edges.filter(e => e.u === v || e.v === v);
    for (let i = 0; i < 3; i++) {
      const candidates: Edge[] = [];
      for (const v of visited) {
        for (const e of getAdj(v)) {
          const other = e.u === v ? e.v : e.u;
          if (!visited.has(other)) candidates.push(e);
        }
      }
      candidates.sort((a, b) => a.weight - b.weight);
      const chosen = candidates[0];
      const newNode = visited.has(chosen.u) ? chosen.v : chosen.u;
      for (const c of candidates) {
        if (c === chosen) continue;
        result.push({ text: `Evaluating edge ${c.u}—${c.v} (weight ${c.weight})`, type: 'consider', edge: c });
      }
      result.push({ text: `Considering edge ${chosen.u}—${chosen.v} (weight ${chosen.weight})`, type: 'consider', edge: chosen });
      visited.add(newNode);
      mst.push(chosen);
      cost += chosen.weight;
      result.push({ text: `✓ Added ${chosen.u}—${chosen.v} (weight ${chosen.weight}) · Visited: {${[...visited].join(', ')}}`, type: 'add', edge: chosen });
    }
    result.push({ text: '🎉 MST complete! Total weight = 6', type: 'done' });
    return result;
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setIsRunning(false);
    setMstEdges([]);
    setConsideringEdge(null);
    setTotalCost(0);
    setSkippedEdge(null);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSteps(algorithm === 'kruskal' ? generateKruskalSteps() : generatePrimSteps());
  }, [algorithm, generateKruskalSteps, generatePrimSteps]);

  useEffect(() => { reset(); }, [algorithm]);
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const nextStep = useCallback(() => {
    if (currentStep >= steps.length - 1) return;
    const nextIdx = currentStep + 1;
    const step = steps[nextIdx];
    setCurrentStep(nextIdx);
    if (step.type === 'consider') { setConsideringEdge(step.edge || null); setSkippedEdge(null); }
    else if (step.type === 'add' && step.edge) {
      setMstEdges(p => [...p, step.edge!]);
      setTotalCost(p => p + step.edge!.weight);
      setConsideringEdge(null);
      setSkippedEdge(null);
    }
    else if (step.type === 'skip') { setConsideringEdge(null); setSkippedEdge(step.edge || null); }
    else { setConsideringEdge(null); setSkippedEdge(null); }
  }, [currentStep, steps]);

  const runAll = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    reset();
    const allSteps = algorithm === 'kruskal' ? generateKruskalSteps() : generatePrimSteps();
    setSteps(allSteps);
    let idx = 0;
    const mstAcc: Edge[] = [];
    let costAcc = 0;
    intervalRef.current = setInterval(() => {
      if (idx >= allSteps.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsRunning(false);
        return;
      }
      const step = allSteps[idx];
      setCurrentStep(idx);
      if (step.type === 'consider') { setConsideringEdge(step.edge || null); setSkippedEdge(null); }
      else if (step.type === 'add' && step.edge) {
        mstAcc.push(step.edge);
        costAcc += step.edge.weight;
        setMstEdges([...mstAcc]);
        setTotalCost(costAcc);
        setConsideringEdge(null);
        setSkippedEdge(null);
      }
      else if (step.type === 'skip') { setConsideringEdge(null); setSkippedEdge(step.edge || null); }
      else { setConsideringEdge(null); setSkippedEdge(null); }
      idx++;
    }, speed);
  }, [isRunning, algorithm, reset, generateKruskalSteps, generatePrimSteps, speed]);

  // Calculate SVG line coordinates - connect node centers directly
  const getEdgeCoords = (u: string, v: string) => {
    const n1 = nodes.find(n => n.id === u)!;
    const n2 = nodes.find(n => n.id === v)!;
    return { x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y };
  };

  const isEdgeInMst = (u: string, v: string) => mstEdges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  const isEdgeConsidering = (u: string, v: string) => consideringEdge && ((consideringEdge.u === u && consideringEdge.v === v) || (consideringEdge.u === v && consideringEdge.v === u));
  const isEdgeSkipped = (u: string, v: string) => skippedEdge && ((skippedEdge.u === u && skippedEdge.v === v) || (skippedEdge.u === v && skippedEdge.v === u));

  const getEdgeColor = (u: string, v: string) => {
    if (isEdgeInMst(u, v)) return getCSSVar('--graph-edge-mst');
    if (isEdgeConsidering(u, v)) return getCSSVar('--graph-edge-consider');
    if (isEdgeSkipped(u, v)) return getCSSVar('--graph-edge-skip');
    return getCSSVar('--graph-edge-dim');
  };

  const getEdgeWidth = (u: string, v: string) => {
    if (isEdgeInMst(u, v)) return 4;
    if (isEdgeConsidering(u, v) || isEdgeSkipped(u, v)) return 3;
    return 2;
  };

  const getEdgeOpacity = (u: string, v: string) => {
    if (isEdgeConsidering(u, v) || isEdgeSkipped(u, v)) return 1;
    if (isEdgeInMst(u, v)) return 1;
    return 0.5;
  };

  // Check if MST is complete (has V-1 edges)
  const isMstComplete = mstEdges.length === 3;

  return (
    <Section id="visualizer" className="!min-h-0">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>06 — Interactive</span>
      </div>
      <h2 className="text-h1 mb-3">
        Step-by-Step <span style={{ color: 'var(--accent-cyan)' }}>Visualizer</span>
      </h2>
      <p className="text-body mb-8 text-readable-wide">
        Watch Kruskal's and Prim's algorithms find the MST on our example graph.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex rounded-xl p-1 glass-card !shadow-none">
          {(['kruskal', 'prim'] as const).map(algo => (
            <button
              key={algo}
              onClick={() => setAlgorithm(algo)}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: algorithm === algo ?
                  (algo === 'kruskal' ? 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(168,139,250,0.1))' : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))') :
                  'transparent',
                color: algorithm === algo ? (algo === 'kruskal' ? 'var(--accent-cyan)' : 'var(--accent-blue)') : 'var(--text-muted)',
                border: algorithm === algo ? `1px solid ${algo === 'kruskal' ? 'var(--border-accent)' : 'var(--border-accent-2)'}` : '1px solid transparent'
              }}
            >
              {algo === 'kruskal' ? "Kruskal's" : "Prim's"}
            </button>
          ))}
        </div>

        <button onClick={nextStep} disabled={currentStep >= steps.length - 1 || isRunning}
          className="btn-secondary px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">Next Step →</button>
        <button onClick={runAll} disabled={isRunning}
          className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {isRunning ? '⏳ Running...' : '▶ Run'}
        </button>
        <button onClick={reset} className="btn-secondary px-5 py-2.5 text-sm">↺ Reset</button>

        {/* Speed Control */}
        <div className="flex items-center gap-2 ml-2">
          <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="speed-select">
            <option value={2400}>0.5×</option>
            <option value={1200}>1×</option>
            <option value={600}>2×</option>
            <option value={300}>4×</option>
          </select>
        </div>

        {/* Cost Display */}
        <div className="ml-auto glass-card !shadow-none px-5 py-2.5 flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Cost:</span>
          <motion.span className="font-bold text-xl" style={{ color: 'var(--accent-cyan)' }}
            key={totalCost}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}>
            {totalCost}
          </motion.span>
        </div>
      </div>

      {/* Graph + Steps */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Graph Container - FIXED ALIGNMENT */}
        <div className="lg:col-span-3 graph-container" style={{ minHeight: '300px', height: 'auto', aspectRatio: '500/350' }}>
          <svg
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
            className="w-full h-full"
            style={{ display: 'block' }}
          >
            {/* SVG Filters for Glow */}
            <defs>
              <filter id="glowMST" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glowConsider" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Gradient for final MST line */}
              <linearGradient id="mstGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Edges - Draw lines between node centers with animation */}
            {edges.map(edge => {
              const coords = getEdgeCoords(edge.u, edge.v);
              const color = getEdgeColor(edge.u, edge.v);
              const width = getEdgeWidth(edge.u, edge.v);
              const opacity = getEdgeOpacity(edge.u, edge.v);
              const isMst = isEdgeInMst(edge.u, edge.v);
              const isActive = isEdgeConsidering(edge.u, edge.v) || isEdgeSkipped(edge.u, edge.v);

              return (
                <g key={`${edge.u}-${edge.v}`}>
                  {/* Background line (dimmed) */}
                  <line
                    x1={coords.x1}
                    y1={coords.y1}
                    x2={coords.x2}
                    y2={coords.y2}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    opacity={isMst ? 0.3 : opacity}
                    className="transition-all duration-500"
                  />
                  {/* Animated line for MST edges - draws when added */}
                  {isMst && (
                    <motion.line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke="url(#mstGradient)"
                      strokeWidth={width + 1}
                      strokeLinecap="round"
                      filter="url(#glowMST)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  )}
                  {/* Active/Considering edge highlight */}
                  {isActive && (
                    <line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke={color}
                      strokeWidth={width + 1}
                      strokeLinecap="round"
                      filter="url(#glowConsider)"
                      opacity={1}
                      className="transition-all duration-300"
                    />
                  )}
                </g>
              );
            })}

            {/* Final MST Path - shows complete MST outline when done */}
            {isMstComplete && (
              <g className="mst-complete-overlay">
                {/* Draw connecting path through all MST edges */}
                {mstEdges.map((edge, idx) => {
                  const coords = getEdgeCoords(edge.u, edge.v);
                  return (
                    <line
                      key={`mst-final-${idx}`}
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke="#22d3ee"
                      strokeWidth={6}
                      strokeLinecap="round"
                      opacity={0.4}
                      className="mst-glow-line"
                      style={{
                        animation: 'pulseGlow 2s ease-in-out infinite',
                        animationDelay: `${idx * 0.2}s`,
                      }}
                    />
                  );
                })}
                {/* Central celebration pulse */}
                <circle
                  cx={250}
                  cy={175}
                  r="0"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={3}
                  opacity={0.8}
                  style={{
                    animation: 'expandRing 1.5s ease-out forwards',
                  }}
                />
              </g>
            )}

            {/* Weight Labels */}
            {edges.map(edge => {
              const coords = getEdgeCoords(edge.u, edge.v);
              const mx = (coords.x1 + coords.x2) / 2;
              const my = (coords.y1 + coords.y2) / 2;
              const color = getEdgeColor(edge.u, edge.v);
              const isActive = isEdgeInMst(edge.u, edge.v) || isEdgeConsidering(edge.u, edge.v) || isEdgeSkipped(edge.u, edge.v);
              return (
                <g key={`label-${edge.u}-${edge.v}`}>
                  <rect
                    x={mx - 14} y={my - 12} width={28} height={24} rx={6}
                    fill="var(--graph-label-bg)"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={isActive ? 1 : 0.8}
                  />
                  <text
                    x={mx} y={my + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={color}
                    fontSize="12" fontWeight="bold"
                    fontFamily="var(--font-mono)"
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isStartNode = algorithm === 'prim' && node.id === 'A' && currentStep >= 0;
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x} cy={node.y} r={NODE_RADIUS}
                    fill="var(--graph-node-fill)"
                    stroke={isStartNode ? 'var(--accent-blue)' : 'var(--graph-node-stroke)'}
                    strokeWidth={3}
                    filter="url(#glowMST)"
                    className="transition-all duration-300"
                  />
                  <text
                    x={node.x} y={node.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill="var(--graph-node-text)"
                    fontSize="18" fontWeight="bold"
                    fontFamily="var(--font-heading)"
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: 'var(--graph-edge-dim)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Not in MST</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: 'var(--graph-edge-consider)' }} />
              <span className="text-sm" style={{ color: 'var(--accent-amber)' }}>Considering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: 'var(--graph-edge-skip)' }} />
              <span className="text-sm" style={{ color: 'var(--accent-red)' }}>Skipped</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: 'var(--graph-edge-mst)' }} />
              <span className="text-sm" style={{ color: 'var(--accent-green)' }}>In MST</span>
            </div>
          </div>
        </div>

        {/* Steps Panel */}
        <div className="lg:col-span-2 glass-card p-5 flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h3">Steps</h3>
            <span className="text-sm rounded-lg px-3 py-1 font-mono" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
              {Math.max(0, currentStep + 1)} / {steps.length}
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {steps.map((step, i) => {
              const isActive = i === currentStep;
              const isPast = i < currentStep;
              const activeColors = {
                add: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', text: 'var(--accent-green)' },
                skip: { bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)', text: 'var(--accent-red)' },
                consider: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', text: 'var(--accent-amber)' },
                done: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', text: 'var(--accent-green)' },
              };
              const c = activeColors[step.type] ?? activeColors.consider;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="p-3 rounded-xl transition-all duration-300"
                  style={{
                    background: isActive ? c.bg : isPast ? 'var(--bg-muted)' : 'transparent',
                    border: `1px solid ${isActive ? c.border : 'transparent'}`,
                    opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`step-number ${isActive ? 'step-number-active' : isPast ? 'step-number-past' : 'step-number-future'}`}>
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed" style={{
                      color: isActive ? c.text : isPast ? 'var(--text-secondary)' : 'var(--text-dimmed)'
                    }}>
                      {step.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* MST Edges */}
          {mstEdges.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
              <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>MST Edges</h4>
              <div className="flex flex-wrap gap-2">
                {mstEdges.map((e, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                    className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold"
                    style={{
                      background: 'rgba(52,211,153,0.1)',
                      border: '1px solid rgba(52,211,153,0.25)',
                      color: 'var(--accent-green)'
                    }}
                  >
                    {e.u}—{e.v} ({e.weight})
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
});

// ============== SIMULATOR ==============
const SimulatorSection = memo(function SimulatorSection() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<'addNode' | 'addEdge'>('addNode');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mstEdges, setMstEdges] = useState<Edge[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'addNode') {
      setSelectedNode(null);
      return;
    }
    const svg = e.currentTarget;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = Math.round(transformedPoint.x);
    const y = Math.round(transformedPoint.y);

    const id = String.fromCharCode(65 + nodes.length); // A, B, C...
    if (nodes.length >= 26) return; // Limit to Z
    setNodes([...nodes, { id, x, y }]);
    setMstEdges([]);
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (mode !== 'addEdge') return;

    if (!selectedNode) {
      setSelectedNode(id);
    } else {
      if (selectedNode !== id) {
        // Check if edge exists
        const exists = edges.find(ed => (ed.u === selectedNode && ed.v === id) || (ed.u === id && ed.v === selectedNode));
        if (!exists) {
          const n1 = nodes.find(n => n.id === selectedNode)!;
          const n2 = nodes.find(n => n.id === id)!;
          const dist = Math.round(Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2)) / 10);

          const weightInput = window.prompt(`Enter weight for edge ${selectedNode}—${id}:`, dist.toString());
          if (weightInput !== null) {
            const weight = parseInt(weightInput, 10);
            if (!isNaN(weight)) {
              setEdges([...edges, { u: selectedNode, v: id, weight }]);
              setMstEdges([]);
            }
          }
        }
      }
      setSelectedNode(null);
    }
  };

  const solveGraph = () => {
    if (nodes.length === 0 || edges.length === 0) return;
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const nodeMap = nodes.reduce((acc, n, i) => { acc[n.id] = i; return acc; }, {} as Record<string, number>);
    const uf = new UnionFind(nodes.length);
    const mst: Edge[] = [];
    let cost = 0;
    for (const edge of sorted) {
      if (uf.find(nodeMap[edge.u]) !== uf.find(nodeMap[edge.v])) {
        uf.unite(nodeMap[edge.u], nodeMap[edge.v]);
        mst.push(edge);
        cost += edge.weight;
      }
    }
    setMstEdges(mst);
    setTotalCost(cost);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setMstEdges([]);
    setSelectedNode(null);
    setTotalCost(0);
  };

  const isEdgeInMst = (u: string, v: string) => mstEdges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));

  return (
    <Section id="simulator">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-purple)' }}>07 — Sandbox</span>
      </div>
      <h2 className="text-h1 mb-3">
        Custom <span style={{ color: 'var(--accent-purple)' }}>Simulator</span>
      </h2>
      <p className="text-body mb-8 text-readable-wide">
        Create your own network! Click to add nodes, or connect them to form edges (you can choose your own weight or use the auto-calculated distance). Then let the algorithm solve it.
      </p>

      <div className="glass-card p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 graph-container relative min-h-[400px] border border-[var(--graph-border)] rounded-xl overflow-hidden cursor-crosshair">
          <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" onClick={handleSvgClick} className="w-full h-full block">
            {edges.map((e, i) => {
              const n1 = nodes.find(n => n.id === e.u)!;
              const n2 = nodes.find(n => n.id === e.v)!;
              const isMst = isEdgeInMst(e.u, e.v);
              const cx = (n1.x + n2.x) / 2;
              const cy = (n1.y + n2.y) / 2;
              return (
                <g key={i}>
                  <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
                    stroke={isMst ? "var(--graph-edge-mst)" : "var(--graph-edge-dim)"}
                    strokeWidth={isMst ? 4 : 2}
                    opacity={mstEdges.length > 0 && !isMst ? 0.3 : 1}
                  />
                  <rect x={cx - 10} y={cy - 10} width={20} height={20} rx={4} fill="var(--graph-label-bg)" opacity={mstEdges.length > 0 && !isMst ? 0.5 : 1} />
                  <text x={cx} y={cy + 4} fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle" opacity={mstEdges.length > 0 && !isMst ? 0.5 : 1}>{e.weight}</text>
                </g>
              );
            })}

            {nodes.map(n => {
              const isSelected = selectedNode === n.id;
              return (
                <g key={n.id} onClick={(e) => handleNodeClick(e, n.id)} className={mode === 'addEdge' ? 'cursor-pointer' : ''}>
                  <circle cx={n.x} cy={n.y} r={16}
                    fill="var(--graph-node-fill)"
                    stroke={isSelected ? "var(--accent-purple)" : "var(--graph-node-stroke)"}
                    strokeWidth={isSelected ? 4 : 2}
                  />
                  <text x={n.x} y={n.y + 4} fill="var(--graph-node-text)" fontSize="12" textAnchor="middle" fontWeight="bold">{n.id}</text>
                </g>
              );
            })}
          </svg>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
              <span className="text-body text-lg">Click anywhere to add a node</span>
            </div>
          )}
        </div>

        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <div className="glass-card p-4 !bg-[var(--bg-muted)] border border-[var(--border-primary)] rounded-xl flex flex-col gap-3">
            <h3 className="font-bold text-[15px] mb-1">Tools</h3>
            <button
              onClick={() => setMode('addNode')}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${mode === 'addNode' ? 'bg-[var(--accent-purple)] text-white' : 'bg-transparent border border-[var(--border-accent-2)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
            >
              + Add Nodes
            </button>
            <button
              onClick={() => { setMode('addEdge'); setSelectedNode(null); }}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${mode === 'addEdge' ? 'bg-[var(--accent-purple)] text-white' : 'bg-transparent border border-[var(--border-accent-2)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
            >
              🔗 Connect Edges
            </button>
            {mode === 'addEdge' && (
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-tight">
                {selectedNode ? `Select second node to connect with ${selectedNode}` : 'Select first node to connect'}
              </p>
            )}
          </div>

          <button onClick={solveGraph} disabled={nodes.length < 2 || edges.length === 0} className="btn-primary w-full py-3 disabled:opacity-50">
            ✨ Solve MST
          </button>
          <button onClick={clearAll} className="btn-secondary w-full py-3">
            🗑️ Clear Graph
          </button>

          {mstEdges.length > 0 && (
            <div className="mt-auto glass-card p-4 rounded-xl text-center shadow-[0_0_20px_rgba(109,40,217,0.3)] border border-[var(--border-accent-2)]">
              <p className="text-sm text-[var(--text-muted)] mb-1 font-bold">MST Total Cost</p>
              <p className="text-4xl font-extrabold text-[var(--accent-purple)]">{totalCost}</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
});

// ============== IMPLEMENTATION ==============
const ImplementationSection = memo(function ImplementationSection({ theme }: { theme: string }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'dryrun'>('code');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Section id="implementation">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>08 — Code</span>
      </div>
      <h2 className="text-h1 mb-4">Implementation</h2>
      <p className="text-body mb-8 text-readable-wide">
        Kruskal's Algorithm in C++ using a simple struct-based approach with an array for cycle detection.
      </p>

      {/* Toggles */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('code')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'code' ? 'bg-[var(--accent-blue)] text-white shadow-lg' : 'glass-card text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          💻 Source Code
        </button>
        <button
          onClick={() => setActiveTab('dryrun')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dryrun' ? 'bg-[var(--accent-purple)] text-white shadow-lg' : 'glass-card text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          📝 Dry Run
        </button>
      </div>

      <div className="code-block transition-all duration-300">
        {activeTab === 'code' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="code-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
                </div>
                <span className="text-sm font-mono ml-2" style={{ color: 'var(--text-muted)' }}>kruskal_mst.cpp</span>
              </div>
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2" style={{ color: 'var(--accent-green)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      Copied!
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      Copy Code
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                language="cpp"
                style={theme === 'light' ? oneLight : vscDarkPlus}
                customStyle={{ margin: 0, padding: '20px 24px', background: 'transparent', fontSize: '14px', lineHeight: '1.75', fontFamily: 'var(--font-mono)' }}
                showLineNumbers
                lineNumberStyle={{ color: 'var(--text-dimmed)', paddingRight: '16px', fontSize: '12px' }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </motion.div>
        )}

        {activeTab === 'dryrun' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 md:p-8 text-[var(--text-primary)]">
            <h3 className="text-2xl font-bold mb-6 text-[var(--accent-purple)]">Dry Run Walkthrough</h3>

            <div className="mb-8 p-5 rounded-xl border border-[var(--border-accent-2)] bg-[var(--bg-muted)]">
              <h4 className="font-bold text-lg mb-3">📌 Initial Setup (Before the Loop)</h4>
              <ul className="list-disc ml-5 space-y-1 text-sm md:text-base">
                <li><strong className="text-[var(--accent-cyan)]">vertices:</strong> 4 (Nodes: 0, 1, 2, 3)</li>
                <li><strong className="text-[var(--accent-cyan)]">totalEdges:</strong> 5</li>
                <li><strong className="text-[var(--accent-cyan)]">totalCost:</strong> 0</li>
                <li><strong className="text-[var(--accent-cyan)]">parent Array:</strong> Har node apna khud ka leader hai. <br /><code className="bg-black/10 px-2 py-0.5 rounded ml-2">parent = [0, 1, 2, 3]</code></li>
              </ul>
            </div>

            <div className="mb-8 p-5 rounded-xl border border-[var(--border-accent-2)] bg-[var(--bg-muted)]">
              <h4 className="font-bold text-lg mb-3">🔢 Sorted edges Array (Step 2 ke baad):</h4>
              <div className="flex flex-wrap gap-3">
                {['{0, 1, 1}', '{1, 2, 2}', '{0, 2, 3}', '{1, 3, 4}', '{2, 3, 5}'].map(e => (
                  <span key={e} className="font-mono bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-3 py-1 rounded-lg border border-[var(--accent-blue)]/20">{e}</span>
                ))}
              </div>
            </div>

            <h4 className="font-bold text-xl mb-4 border-b border-[var(--border-primary)] pb-2">⚙️ The for Loop Execution (Step 3 & 4)</h4>

            <div className="space-y-6">
              <div className="p-5 glass-card !bg-opacity-50 rounded-xl">
                <h5 className="font-bold text-[var(--accent-green)] text-lg">1. Iteration 1 (i = 0): Edge {'{0, 1, 1}'}</h5>
                <p className="mt-2 text-sm md:text-base leading-relaxed">
                  <strong>Weight:</strong> 1.<br />
                  <strong>Find root1 (Source 0):</strong> parent[0] is 0. Loop stops. root1 = 0.<br />
                  <strong>Find root2 (Dest 1):</strong> parent[1] is 1. Loop stops. root2 = 1.<br />
                  <strong className="text-[var(--accent-green)]">Condition (root1 != root2):</strong> 0 != 1 (True! No cycle).<br />
                  <strong>Action:</strong> <br />
                  • parent[root1] = root2; → parent[0] = 1;<br />
                  • totalCost += 1; → totalCost = 1<br />
                  <strong>Print:</strong> 0 - 1 (Cost: 1)<br />
                  <span className="inline-block mt-2 font-mono text-sm bg-black/10 px-2 py-1 rounded">Current State: parent = [1, 1, 2, 3], totalCost = 1</span>
                </p>
              </div>

              <div className="p-5 glass-card !bg-opacity-50 rounded-xl">
                <h5 className="font-bold text-[var(--accent-green)] text-lg">2. Iteration 2 (i = 1): Edge {'{1, 2, 2}'}</h5>
                <p className="mt-2 text-sm md:text-base leading-relaxed">
                  <strong>Weight:</strong> 2.<br />
                  <strong>Find root1 (Source 1):</strong> parent[1] is 1. Loop stops. root1 = 1.<br />
                  <strong>Find root2 (Dest 2):</strong> parent[2] is 2. Loop stops. root2 = 2.<br />
                  <strong className="text-[var(--accent-green)]">Condition (root1 != root2):</strong> 1 != 2 (True! No cycle).<br />
                  <strong>Action:</strong> <br />
                  • parent[root1] = root2; → parent[1] = 2;<br />
                  • totalCost += 2; → totalCost = 3<br />
                  <strong>Print:</strong> 1 - 2 (Cost: 2)<br />
                  <span className="inline-block mt-2 font-mono text-sm bg-black/10 px-2 py-1 rounded">Current State: parent = [1, 2, 2, 3], totalCost = 3</span>
                </p>
              </div>

              <div className="p-5 glass-card !bg-opacity-50 rounded-xl border-l-4 !border-l-red-500">
                <h5 className="font-bold text-red-400 text-lg">3. Iteration 3 (i = 2): Edge {'{0, 2, 3}'}</h5>
                <p className="mt-2 text-sm md:text-base leading-relaxed">
                  <strong>Weight:</strong> 3.<br />
                  <strong>Find root1 (Source 0):</strong> parent[0] is 1. Next, parent[1] is 2. Next, parent[2] is 2. Loop stops. root1 = 2.<br />
                  <strong>Find root2 (Dest 2):</strong> parent[2] is 2. Loop stops. root2 = 2.<br />
                  <strong className="text-red-400">Condition (root1 != root2):</strong> 2 != 2 (False! Cycle detected).<br />
                  <strong>Action:</strong> Ignore this edge. Do nothing.<br />
                  <span className="inline-block mt-2 font-mono text-sm bg-black/10 px-2 py-1 rounded">Current State: parent = [1, 2, 2, 3], totalCost = 3</span>
                </p>
              </div>

              <div className="p-5 glass-card !bg-opacity-50 rounded-xl">
                <h5 className="font-bold text-[var(--accent-green)] text-lg">4. Iteration 4 (i = 3): Edge {'{1, 3, 4}'}</h5>
                <p className="mt-2 text-sm md:text-base leading-relaxed">
                  <strong>Weight:</strong> 4.<br />
                  <strong>Find root1 (Source 1):</strong> parent[1] is 2. Next, parent[2] is 2. Loop stops. root1 = 2.<br />
                  <strong>Find root2 (Dest 3):</strong> parent[3] is 3. Loop stops. root2 = 3.<br />
                  <strong className="text-[var(--accent-green)]">Condition (root1 != root2):</strong> 2 != 3 (True! No cycle).<br />
                  <strong>Action:</strong> <br />
                  • parent[root1] = root2; → parent[2] = 3;<br />
                  • totalCost += 4; → totalCost = 7<br />
                  <strong>Print:</strong> 1 - 3 (Cost: 4)<br />
                  <span className="inline-block mt-2 font-mono text-sm bg-black/10 px-2 py-1 rounded">Current State: parent = [1, 2, 3, 3], totalCost = 7</span>
                </p>
              </div>

              <div className="p-5 glass-card !bg-opacity-50 rounded-xl border-l-4 !border-l-red-500">
                <h5 className="font-bold text-red-400 text-lg">5. Iteration 5 (i = 4): Edge {'{2, 3, 5}'}</h5>
                <p className="mt-2 text-sm md:text-base leading-relaxed">
                  <strong>Weight:</strong> 5.<br />
                  <strong>Find root1 (Source 2):</strong> parent[2] is 3. Next, parent[3] is 3. Loop stops. root1 = 3.<br />
                  <strong>Find root2 (Dest 3):</strong> parent[3] is 3. Loop stops. root2 = 3.<br />
                  <strong className="text-red-400">Condition (root1 != root2):</strong> 3 != 3 (False! Cycle detected).<br />
                  <strong>Action:</strong> Ignore this edge. Do nothing.<br />
                  <span className="inline-block mt-2 font-mono text-sm bg-black/10 px-2 py-1 rounded">Current State: parent = [1, 2, 3, 3], totalCost = 7</span>
                </p>
              </div>
            </div>

            <div className="mt-10 p-6 rounded-xl bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-purple)]/20 border border-[var(--accent-purple)]/30 text-center">
              <h4 className="font-extrabold text-2xl text-[var(--text-primary)] mb-2">🏆 Final Output</h4>
              <p className="text-xl mb-1">Total Minimum Cost: <strong className="text-[var(--accent-cyan)] text-2xl">7</strong></p>
              <p className="text-[var(--text-muted)]">Included Edges: (0-1), (1-2), (1-3)</p>
            </div>
          </motion.div>
        )}
      </div>
    </Section>
  );
});

// ============== COMPLEXITY ==============
const ComplexitySection = memo(function ComplexitySection() {
  return (
    <Section id="complexity">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>09 — Analysis</span>
      </div>
      <h2 className="text-h1 mb-4">
        Time & Space <span style={{ color: 'var(--accent-cyan)' }}>Complexity</span>
      </h2>
      <motion.div
        className="glass-card overflow-hidden mb-10 mt-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-6 md:p-8 border-b border-[var(--border-primary)] bg-gradient-to-r from-[var(--bg-muted)] to-transparent">
          <h3 className="text-2xl font-extrabold mb-2 text-[var(--accent-purple)] flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Implementation Comparison
          </h3>
          <p className="text-base text-[var(--text-muted)]">A clear comparison between the Simple version and the Optimized version (Union-Find) of Cycle Detection.</p>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar hidden md:block">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b-2 border-[var(--border-primary)]">
                <th className="p-5 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-sm">Feature</th>
                <th className="p-5 font-bold uppercase tracking-wider text-[var(--accent-cyan)] text-sm">Simple Version</th>
                <th className="p-5 font-bold uppercase tracking-wider text-[var(--accent-purple)] text-sm">Optimized Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              <tr className="hover:bg-[var(--bg-hover)] transition-colors group">
                <td className="p-5 text-base font-semibold text-[var(--text-primary)]">Cycle Detection</td>
                <td className="p-5 text-base text-[var(--text-secondary)]">Basic while loop</td>
                <td className="p-5 text-base font-bold text-[var(--accent-purple)] group-hover:scale-105 transition-transform origin-left">DSU (Path Compression + Rank)</td>
              </tr>
              <tr className="hover:bg-[var(--bg-hover)] transition-colors group">
                <td className="p-5 text-base font-semibold text-[var(--text-primary)]">Worst Case Time</td>
                <td className="p-5 text-base"><code className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] px-2.5 py-1 rounded-md font-mono font-bold">O(E × V)</code></td>
                <td className="p-5 text-base"><code className="bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] px-2.5 py-1 rounded-md font-mono font-bold group-hover:scale-105 transition-transform inline-block">O(E log E)</code></td>
              </tr>
              <tr className="hover:bg-[var(--bg-hover)] transition-colors group">
                <td className="p-5 text-base font-semibold text-[var(--text-primary)]">Performance</td>
                <td className="p-5 text-base text-[var(--accent-red)]">Slow for large graphs</td>
                <td className="p-5 text-base font-bold text-[var(--accent-green)] group-hover:scale-105 transition-transform origin-left">Extremely fast ⚡</td>
              </tr>
              <tr className="hover:bg-[var(--bg-hover)] transition-colors group">
                <td className="p-5 text-base font-semibold text-[var(--text-primary)]">Space Used</td>
                <td className="p-5 text-base"><code className="bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded-md font-mono text-[var(--text-secondary)]">O(V + E)</code></td>
                <td className="p-5 text-base"><code className="bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded-md font-mono text-[var(--text-secondary)]">O(V + E)</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards for Complexity */}
        <div className="md:hidden divide-y divide-[var(--border-primary)]">
          {[
            { feature: 'Cycle Detection', simple: 'Basic while loop', optimized: 'DSU (Path + Rank)' },
            { feature: 'Worst Case Time', simple: 'O(E × V)', optimized: 'O(E log E)' },
            { feature: 'Performance', simple: 'Slow', optimized: 'Extremely fast ⚡' },
            { feature: 'Space Used', simple: 'O(V + E)', optimized: 'O(V + E)' }
          ].map((item, i) => (
            <div key={i} className="p-5">
              <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--text-dimmed)] mb-3">{item.feature}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold block mb-1 text-[var(--accent-cyan)]">Simple</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{item.simple}</span>
                </div>
                <div>
                  <span className="text-xs font-bold block mb-1 text-[var(--accent-purple)]">Optimized</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{item.optimized}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h3 className="text-h2 mb-4">Conclusion</h3>
        <p className="text-body mb-6 text-readable-wide">
          Greedy algorithms are highly efficient for solving the Minimum Spanning Tree problem.{' '}
          <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>Kruskal's</span> is generally easier to implement and works
          great for sparse graphs, while{' '}
          <span className="font-semibold" style={{ color: 'var(--accent-blue)' }}>Prim's</span> can be faster for very dense graphs when paired with a Fibonacci Heap.
        </p>
        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(168,139,250,0.04))', border: '1px solid var(--border-accent)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>💡 Pro Tip</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
            Both algorithms always produce the same total weight for a given graph. The choice depends on your graph's density and available data structures.
          </p>
        </div>
      </motion.div>
    </Section>
  );
});

// ============== QUESTIONS ==============
const QuestionsSection = memo(function QuestionsSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const toggleReveal = (index: number) => {
    setRevealed(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Section id="questions">
      <div className="mb-6">
        <span className="text-label" style={{ color: 'var(--accent-cyan)' }}>10 — Test Your Knowledge</span>
      </div>
      <h2 className="text-h1 mb-6">
        Practice <span className="hero-gradient-accent">Questions</span>
      </h2>
      <p className="text-body mb-10 text-readable-wide">
        Ready for a real challenge? Analyze these advanced networks and calculate the Minimum Spanning Tree. Tap "Reveal Answer" to check your logic.
      </p>

      <div className="space-y-8">
        {/* Question 1: Tougher 5-Node Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8"
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col">
              <h3 className="text-h3 mb-3">Question 1: The 5-Node Network</h3>
              <p className="text-body mb-6">
                Calculate the total weight of the Minimum Spanning Tree for the graph shown on the right. Be careful with cycle detection!
              </p>

              <div className="mt-auto">
                <button
                  onClick={() => toggleReveal(1)}
                  className="btn-secondary w-full md:w-auto"
                >
                  {revealed[1] ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                <AnimatePresence>
                  {revealed[1] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-primary)' }}>
                        <p className="font-bold text-[16px] mb-2" style={{ color: 'var(--accent-cyan)' }}>Answer: 11</p>
                        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          Using Kruskal's, we pick edges in this order:<br />
                          1. <b>B-C (1)</b><br />
                          2. <b>A-B (2)</b><br />
                          3. <b>D-E (3)</b><br />
                          4. <span className="line-through text-red-400 opacity-80">A-C (4)</span> is skipped (forms cycle A-B-C)<br />
                          5. <b>C-E (5)</b> completes the tree connecting all nodes.<br />
                          Edges C-D (6) and B-D (7) are ignored. Total = 1 + 2 + 3 + 5 = <b>11</b>.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="w-full md:w-64 shrink-0 flex justify-center items-center bg-[var(--graph-bg)] border border-[var(--graph-border)] rounded-xl p-6">
              {/* Tough 5-Node Graph SVG */}
              <svg width="100%" viewBox="0 0 200 200" className="max-w-[200px] overflow-visible">
                {/* Edges */}
                <line x1="100" y1="30" x2="40" y2="90" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="100" y1="30" x2="160" y2="90" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="40" y1="90" x2="160" y2="90" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="40" y1="90" x2="70" y2="160" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="160" y1="90" x2="130" y2="160" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="160" y1="90" x2="70" y2="160" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="70" y1="160" x2="130" y2="160" stroke="var(--graph-edge-dim)" strokeWidth="3" />

                {/* Weights */}
                <rect x="52" y="42" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="60" y="54" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">2</text>

                <rect x="132" y="42" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="140" y="54" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">4</text>

                <rect x="92" y="72" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="100" y="84" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">1</text>

                <rect x="37" y="117" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="45" y="129" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">7</text>

                <rect x="147" y="117" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="155" y="129" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">5</text>

                <rect x="107" y="112" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="115" y="124" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">6</text>

                <rect x="92" y="152" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="100" y="164" fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">3</text>

                {/* Nodes */}
                <circle cx="100" cy="30" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="40" cy="90" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="160" cy="90" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="70" cy="160" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="130" cy="160" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />

                {/* Labels */}
                <text x="100" y="34" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">A</text>
                <text x="40" y="94" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">B</text>
                <text x="160" y="94" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">C</text>
                <text x="70" y="164" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">D</text>
                <text x="130" y="164" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">E</text>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Question 2: Very Tough 6-Node Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8"
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col">
              <h3 className="text-h3 mb-3">Question 2: The Complex Grid</h3>
              <p className="text-body mb-6">
                This 6-node network contains numerous edges and intersecting paths. Carefully calculate the total weight of the final Minimum Spanning Tree.
              </p>

              <div className="mt-auto">
                <button
                  onClick={() => toggleReveal(2)}
                  className="btn-secondary w-full md:w-auto"
                >
                  {revealed[2] ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                <AnimatePresence>
                  {revealed[2] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-primary)' }}>
                        <p className="font-bold text-[16px] mb-2" style={{ color: 'var(--accent-purple)' }}>Answer: 15</p>
                        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          Edges selected in order:<br />
                          1. <b>A-D (2)</b> and <b>C-F (2)</b><br />
                          2. <b>A-B (3)</b><br />
                          3. <b>D-E (4)</b> and <b>C-E (4)</b><br />
                          At this point, all 6 nodes are connected! The algorithm stops here.<br />
                          The skipped edges are A-E(5), B-C(5), E-F(6), and B-E(7) as they all form cycles. Total = 2 + 2 + 3 + 4 + 4 = <b>15</b>.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="w-full md:w-64 shrink-0 flex justify-center items-center bg-[var(--graph-bg)] border border-[var(--graph-border)] rounded-xl p-6">
              {/* Complex 6-Node Graph SVG */}
              <svg width="100%" viewBox="0 0 240 180" className="max-w-[240px] overflow-visible">
                {/* Edges */}
                <line x1="40" y1="40" x2="120" y2="40" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="120" y1="40" x2="200" y2="40" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="40" y1="140" x2="120" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="120" y1="140" x2="200" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />

                <line x1="40" y1="40" x2="40" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="120" y1="40" x2="120" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="200" y1="40" x2="200" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />

                <line x1="40" y1="40" x2="120" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />
                <line x1="200" y1="40" x2="120" y2="140" stroke="var(--graph-edge-dim)" strokeWidth="3" />

                {/* Weights */}
                <rect x="72" y="22" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="80" y="34" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">3</text>

                <rect x="152" y="22" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="160" y="34" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">5</text>

                <rect x="72" y="142" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="80" y="154" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">4</text>

                <rect x="152" y="142" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="160" y="154" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">6</text>

                <rect x="22" y="82" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="30" y="94" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">2</text>

                <rect x="102" y="82" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="110" y="94" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">7</text>

                <rect x="202" y="82" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="210" y="94" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">2</text>

                <rect x="52" y="82" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="60" y="94" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">5</text>

                <rect x="172" y="82" width="16" height="16" rx="4" fill="var(--graph-label-bg)" />
                <text x="180" y="94" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">4</text>

                {/* Nodes */}
                <circle cx="40" cy="40" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="120" cy="40" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="200" cy="40" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="40" cy="140" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="120" cy="140" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />
                <circle cx="200" cy="140" r="14" fill="var(--graph-node-fill)" stroke="var(--graph-node-stroke)" strokeWidth="2" />

                {/* Labels */}
                <text x="40" y="44" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">A</text>
                <text x="120" y="44" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">B</text>
                <text x="200" y="44" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">C</text>
                <text x="40" y="144" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">D</text>
                <text x="120" y="144" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">E</text>
                <text x="200" y="144" fill="var(--graph-node-text)" fontSize="11" textAnchor="middle" fontWeight="bold">F</text>
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-20 text-center">
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('hero')}
            className="btn-primary"
          >
            ↑ Back to Top
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('visualizer')}
            className="btn-secondary"
          >
            🔄 Replay Visualizer
          </motion.button>
        </div>
        <div className="footer-divider mb-8" />
        <p className="text-sm" style={{ color: 'var(--text-dimmed)' }}>
        </p>
      </div>
    </Section>
  );
});
