# MST Guide - Interactive Learning Experience

A modern, high-performance educational platform designed to help students and developers master **Minimum Spanning Tree (MST)** algorithms through interactive visualizations and deep-dive explanations.

![MST Guide Preview](https://via.placeholder.com/1200x600/0a0a1a/ffffff?text=MST+Guide+Interactive+Visualizer)

## 🚀 Key Features

- **Interactive Visualizers**: Real-time visualization of Kruskal's and Prim's algorithms on dynamic graphs.
- **Step-by-Step Learning**: Structured sections covering foundations, greedy strategies, and algorithm comparisons.
- **Premium UI/UX**: A modern SaaS-style design featuring glassmorphism, smooth animations (Framer Motion), and a custom Indigo-based design system.
- **Algorithm Deep-Dives**: Detailed breakdowns of both Kruskal's and Prim's logic with complexity analysis.
- **Code Implementations**: Ready-to-use C++ implementations for practical application.
- **Theme Support**: Fully integrated Dark and Light modes with a custom theme-aware sidebar.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/) (TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Icons/Graphics**: Custom SVG animations and Lucide-inspired components.

## 📂 Project Structure

```text
├── src/
│   ├── App.tsx          # Main application logic and section components
│   ├── index.css        # Global styles and custom Indigo design system
│   ├── main.tsx         # Application entry point
│   └── components/      # (Optional) Reusable UI components
├── public/              # Static assets
└── index.html           # HTML template
```

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## 🎨 Design Philosophy

The project follows a **Minimalist SaaS Aesthetic**:
- **Typography**: Uses *Plus Jakarta Sans* for headings and *Inter* for body text.
- **Color Palette**: Deep Indigo primary accents with slate grays for balance.
- **Shapes**: Consistent 24px border radii for a soft, modern feel.
- **Motion**: Purposeful micro-interactions to guide the user's focus during learning.

---

Built for educational excellence.
