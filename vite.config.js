import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (name) => fileURLToPath(new URL(`./src/pages/${name}.html`, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: page('login'),
        register: page('register'),
        forgotPassword: page('forgot-password'),
        resetPassword: page('reset-password'),
        dashboard: page('dashboard'),
        applications: page('applications'),
        customers: page('customers'),
        projects: page('projects'),
        documents: page('documents'),
        admin: page('admin'),
        programs: page('programs'),
      },
    },
  },
});
