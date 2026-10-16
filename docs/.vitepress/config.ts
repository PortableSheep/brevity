import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Brevity Node",
  description: "A small TypeScript framework for APIs and server-rendered apps.",
  appearance: "dark",
  base: process.env.PAGES_BASE_PATH ? `${process.env.PAGES_BASE_PATH.replace(/\/$/, "")}/` : "/",
  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/PortableSheep/brevity" }],
    editLink: {
      pattern: "https://github.com/PortableSheep/brevity/edit/main/docs/:path",
    },
    nav: [
      { text: "Get started", link: "/guide/getting-started" },
      { text: "Recipes", link: "/recipes/" },
      { text: "API", link: "/api/core" },
      { text: "Deploy", link: "/guide/deployment" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Learn",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Build a notebook", link: "/guide/tutorial" },
            { text: "How Brevity fits together", link: "/guide/architecture" },
          ],
        },
        {
          text: "Build",
          items: [
            { text: "HTML views", link: "/guide/views" },
            { text: "HTML helpers", link: "/guide/web" },
            { text: "Browser islands", link: "/guide/islands" },
            { text: "Plugins", link: "/guide/plugins" },
            { text: "Debugging", link: "/guide/debugging" },
            { text: "Deployment", link: "/guide/deployment" },
          ],
        },
        {
          text: "Project",
          collapsed: true,
          items: [
            { text: "Before you go live", link: "/guide/production-readiness" },
            { text: "Size and performance", link: "/guide/evaluating" },
            { text: "Support and upgrades", link: "/guide/support" },
            { text: "Roadmap", link: "/guide/roadmap" },
          ],
        },
      ],
      "/recipes/": [
        { text: "Recipes", link: "/recipes/" },
        { text: "Drizzle + SQLite", link: "/recipes/drizzle" },
        { text: "Prisma", link: "/recipes/prisma" },
        { text: "Supabase sign-in", link: "/recipes/supabase" },
        { text: "Svelte island", link: "/recipes/svelte" },
        { text: "HTTP tests", link: "/recipes/testing" },
        { text: "Playwright E2E", link: "/recipes/playwright" },
        { text: "Controller decorators", link: "/recipes/decorators" },
        { text: "Domain errors", link: "/recipes/errors" },
        { text: "HEAD routes", link: "/recipes/head" },
        { text: "Health and shutdown", link: "/recipes/operations" },
      ],
      "/api/": [
        { text: "Core", link: "/api/core" },
        { text: "Web helpers", link: "/api/web" },
        { text: "Plugins", link: "/api/plugins" },
      ],
    },
    search: { provider: "local" },
    footer: { message: "Small core. Build your way." },
  },
});
