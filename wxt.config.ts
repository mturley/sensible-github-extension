import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "PR Info",
    description:
      "See GitHub PR status, reviews, and details inline on any website",
    permissions: ["activeTab", "storage"],
    host_permissions: ["https://api.github.com/*"],
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
  },
});
