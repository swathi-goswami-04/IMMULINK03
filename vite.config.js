import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Imports for PostCSS/Tailwind
// FIX: Using the dedicated @tailwindcss/postcss package to resolve the compatibility error.
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // Embed the PostCSS configuration directly here to bypass external file issues
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
})
