import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Sensible GitHub",
    description:
      "Surface human PR comments, and see PR status and reviews inline on any website",
    permissions: ["activeTab", "storage"],
    host_permissions: ["https://api.github.com/*"],
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    browser_specific_settings: {
      gecko: {
        id: "sensible-github@mturley",
      },
    },
  },
});
