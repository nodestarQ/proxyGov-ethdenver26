import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	envDir: '..',
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api': 'http://localhost:3002',
			'/socket.io': {
				target: 'http://localhost:3002',
				ws: true
			}
		}
	}
});
