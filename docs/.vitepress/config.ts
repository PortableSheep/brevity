import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Brevity Node",
  description: "A slim TypeScript microframework inspired by Brevity",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/core" },
      { text: "Sample App", link: "/sample-app" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "Architecture", link: "/guide/architecture" },
        { text: "Plugins", link: "/guide/plugins" },
        { text: "Debug Mode", link: "/guide/debugging" },
        { text: "Optional Web Layer", link: "/guide/web" },
        { text: "Evaluating Brevity", link: "/guide/evaluating" },
      ],
      "/api/": [{ text: "Core APIs", link: "/api/core" }],
    },
    socialLinks: [{ icon: "github", link: "https://example.com" }],
  },
});
