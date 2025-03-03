/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./html/*'],
  theme: {
    extend: {
      colors: {
        offBlack: '#333',
        lightGrey: '#666',
        borderLight: '#e8e8e8',
        borderDark: '#c2c2c2',
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
