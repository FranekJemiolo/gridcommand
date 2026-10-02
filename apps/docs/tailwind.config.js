/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui-theme/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tac: {
          bg: '#000000',
          surface: '#0a0e14',
          card: '#121820',
          border: '#1e2638',
          text: '#e6edf3',
          dim: '#8b949e',
          cyan: '#00f3ff',
          yellow: '#ffe600',
          green: '#00ff66',
          red: '#ff2200',
          orange: '#ff5500',
          olive: '#4b5320',
          blue: '#0077ff',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
