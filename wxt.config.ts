import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "PR Info",
    description:
      "See GitHub PR status, reviews, and details inline on any website",
    permissions: ["activeTab", "storage"],
    host_permissions: ["https://api.github.com/*"],
  },
});
