/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          dark: "#4338CA",
          light: "#E0E7FF",
        },
        secondary: {
          DEFAULT: "#10B981",
          dark: "#059669",
          light: "#D1FAE5",
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'titul': '0 20px 50px rgba(0, 0, 0, 0.05)',
        'titul-hover': '0 30px 60px rgba(0, 0, 0, 0.08)',
        'btn-primary': '0 10px 20px rgba(79, 70, 229, 0.2)',
        'btn-secondary': '0 10px 20px rgba(16, 185, 129, 0.2)',
        'active-check': '0 5px 15px rgba(79, 70, 229, 0.3)',
      },
    },
  },
  plugins: [],
};
