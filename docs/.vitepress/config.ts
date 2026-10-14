import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Brevity Node",
  description: "Small core. Serious possibilities. A light TypeScript micro-framework.",
  appearance: "dark",
  base: process.env.PAGES_BASE_PATH ? `${process.env.PAGES_BASE_PATH.replace(/\/$/, "")}/` : "/",
  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/PortableSheep/brevity" }],
    editLink: {
      pattern: "https://github.com/PortableSheep/brevity/edit/main/docs/:path",
    },
    nav: [
      { text: "Learn", link: "/guide/tutorial" },
      { text: "Recipes", link: "/recipes/" },
      { text: "API", link: "/api/core" },
      { text: "Deploy", link: "/guide/deployment" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "Build a Notebook", link: "/guide/tutorial" },
        { text: "Architecture", link: "/guide/architecture" },
        { text: "Plugins", link: "/guide/plugins" },
        { text: "Debug Mode", link: "/guide/debugging" },
        { text: "Optional Web Layer", link: "/guide/web" },
        { text: "File Views", link: "/guide/views" },
        { text: "Native Islands", link: "/guide/islands" },
        { text: "Deployment", link: "/guide/deployment" },
        { text: "Comparisons & Benchmarks", link: "/guide/evaluating" },
        { text: "Roadmap", link: "/guide/roadmap" },
        { text: "Production Readiness", link: "/guide/production-readiness" },
      ],
      "/recipes/": [
        { text: "Recipe Index & Tested Versions", link: "/recipes/" },
        { text: "Drizzle + SQLite", link: "/recipes/drizzle" },
        { text: "Prisma", link: "/recipes/prisma" },
        { text: "Supabase Passwordless PKCE", link: "/recipes/supabase" },
        { text: "Svelte Island", link: "/recipes/svelte" },
        { text: "HTTP Tests with listen(0)", link: "/recipes/testing" },
        { text: "Playwright E2E", link: "/recipes/playwright" },
        { text: "Decorators or Plain Routes", link: "/recipes/decorators" },
        { text: "Domain Errors", link: "/recipes/errors" },
        { text: "Explicit HEAD Routes", link: "/recipes/head" },
        { text: "Health & Shutdown", link: "/recipes/operations" },
      ],
      "/api/": [
        { text: "Core", link: "/api/core" },
        { text: "Optional Web Layer", link: "/api/web" },
        { text: "Optional Plugins", link: "/api/plugins" },
      ],
    },
    search: { provider: "local" },
    footer: { message: "Explicit by design. Expert tools by choice." },
  },
});
