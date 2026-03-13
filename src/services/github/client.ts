import type { GitHubClient } from "@/services/github/types";
import { RestClient } from "@/services/github/rest-client";
import { GraphQLClient } from "@/services/github/graphql-client";
import { getConfig } from "@/services/storage";

export async function createClient(): Promise<GitHubClient> {
  const config = await getConfig();
  if (config.pat) {
    return new GraphQLClient(config.pat);
  }
  return new RestClient();
}
