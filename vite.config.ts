import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), basicSsl()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	}
});
