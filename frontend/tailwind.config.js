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
          DEFAULT: '#E879A9',
          light: '#F5C6D6',
          dark: '#D4568A',
        },
        accent: '#FFB3C6',
        warm: {
          bg: '#FDF8F5',
          surface: '#FFFFFF',
          border: '#F0E8E4',
        },
        text1: '#2D2A32',
        text2: '#8A7F8A',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'xl-plus': '16px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10)',
      }
    },
  },
  plugins: [],
}
