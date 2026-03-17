import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	server: {
    watch: {
      ignored: ['**/.vercel/**'] // This pattern ignores all changes in the .vercel directory
    },
  },
	plugins: [sveltekit()],
})
