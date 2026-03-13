import type { GitHubClient } from "@/services/github/types";
import { GraphQLClient } from "@/services/github/graphql-client";
import { getConfig } from "@/services/storage";

export async function createClient(): Promise<GitHubClient> {
  const config = await getConfig();
  if (!config.pat) {
    throw new Error("GitHub token required");
  }
  return new GraphQLClient(config.pat);
}
