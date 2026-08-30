/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF4FF',
          100: '#DAE6FF',
          200: '#BDD4FF',
          300: '#90B8FF',
          400: '#5C93FF',
          500: '#3B6EF5',
          600: '#2553DB',
          700: '#1E42B8',
          800: '#1E3796',
          900: '#1E3376',
        },
        sidebar: {
          bg: '#F8FAFC',
          hover: '#F1F5F9',
          active: '#EEF4FF',
          border: '#E2E8F0',
        },
        surface: {
          white: '#FFFFFF',
          light: '#F8FAFC',
          muted: '#F1F5F9',
          border: '#E2E8F0',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          inverse: '#FFFFFF',
        },
        status: {
          compliant: '#16A34A',
          'compliant-bg': '#F0FDF4',
          'non-compliant': '#DC2626',
          'non-compliant-bg': '#FEF2F2',
          review: '#F59E0B',
          'review-bg': '#FFFBEB',
          processing: '#3B82F6',
          'processing-bg': '#EFF6FF',
        },
        severity: {
          critical: '#DC2626',
          'critical-bg': '#FEF2F2',
          major: '#F59E0B',
          'major-bg': '#FFFBEB',
          minor: '#6366F1',
          'minor-bg': '#EEF2FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'sidebar': '1px 0 3px 0 rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'card': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'score-fill': 'scoreFill 1.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scoreFill: {
          '0%': { 'stroke-dashoffset': '283' },
          '100%': { 'stroke-dashoffset': 'var(--score-offset)' },
        },
      },
    },
  },
  plugins: [],
}
