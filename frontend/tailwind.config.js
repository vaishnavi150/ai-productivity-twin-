/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#080B14',
          900: '#0D1117',
          800: '#131920',
          700: '#1A2333',
          600: '#1F2D42',
        },
        neon: {
          cyan: '#00D4FF',
          green: '#00FF94',
          amber: '#FFB800',
          red: '#FF4444',
          purple: '#A855F7',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)' },
          to: { boxShadow: '0 0 25px rgba(0, 212, 255, 0.7)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
