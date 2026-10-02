/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        tac: {
          bg: '#0b0f0b',
          surface: '#141c14',
          card: '#1c261c',
          border: '#2e3d2e',
          'border-brown': '#453724',
          text: '#e8ede8',
          dim: '#9ba89b',
          green: '#4e9b4e',
          'green-bright': '#68d391',
          olive: '#3b5323',
          'olive-dark': '#233316',
          yellow: '#f5b700',
          amber: '#e09f3e',
          brown: '#8a6240',
          'brown-dark': '#4a3520',
          tan: '#c7a76c',
          khaki: '#b89b72',
          red: '#c5221f',
          alpha: '#4e9b4e',
          bravo: '#c7a76c',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
