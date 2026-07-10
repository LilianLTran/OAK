/** OAK brand palette. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blossom: '#FFAEBA',      // Hồng Sáng
        lilac: '#CCABD6',        // Tím Lilac
        aqua: '#00C6E3',         // Xanh Cyan
        trust: '#0061BF',        // Xanh Dương Tin Cậy
        teal: '#016273',         // Xanh Teal Sâu
        lime: '#F2FB7A',         // Xanh Lime Ánh
        cream: '#FBF7F0',        // brand-board background
        plum: '#4A2545',         // deep wordmark plum
        'plum-soft': '#6E4467',
        gold: '#C6A15B',         // sparkle accent — luxury detailing
        'gold-soft': '#E8D6AC',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      letterSpacing: {
        wide2: '0.08em',
        wide3: '0.16em'
      },
      boxShadow: {
        soft: '0 4px 24px -6px rgba(74, 37, 69, 0.12)',
        luxe: '0 20px 60px -20px rgba(74, 37, 69, 0.35)',
        card: '0 2px 8px -2px rgba(74, 37, 69, 0.08), 0 12px 32px -12px rgba(74, 37, 69, 0.16)'
      },
      backgroundImage: {
        'gold-line': 'linear-gradient(90deg, transparent, #C6A15B, transparent)'
      }
    }
  },
  plugins: []
};
