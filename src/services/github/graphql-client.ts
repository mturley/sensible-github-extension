import type { PRData, ReviewEntry, CommentPreview, GitHubClient } from "@/services/github/types";
import { PR_QUERY } from "@/services/github/queries";
import { truncateToLines } from "@/utils/relative-time";

const GRAPHQL_URL = "https://api.github.com/graphql";

interface GQLPullRequest {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  author: { login: string } | null;
  headRefOid: string;
  commits: {
    nodes: {
      commit: {
        statusCheckRollup: { state: string } | null;
      };
    }[];
  };
  reviews: {
    nodes: {
      author: { login: string } | null;
      state: string;
      submittedAt: string;
      commit: { oid: string } | null;
      body: string;
    }[];
  };
  comments: {
    nodes: {
      author: { login: string } | null;
      body: string;
      createdAt: string;
    }[];
  };
}

export class GraphQLClient implements GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetchPR(owner: string, repo: string, number: number): Promise<PRData> {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: PR_QUERY,
        variables: { owner, repo, number },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL error: ${response.status}`);
    }

    const json = (await response.json()) as {
      data?: { repository?: { pullRequest?: GQLPullRequest } };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(`GraphQL error: ${json.errors[0].message}`);
    }

    const pr = json.data?.repository?.pullRequest;
    if (!pr) {
      throw new Error(`PR not found: ${owner}/${repo}#${number}`);
    }

    return this.normalize(owner, repo, pr);
  }

  private normalize(owner: string, repo: string, pr: GQLPullRequest): PRData {
    const headSha = pr.headRefOid;
    const state = pr.state === "MERGED" ? "merged" : pr.state === "CLOSED" ? "closed" : "open";

    const reviews: ReviewEntry[] = pr.reviews.nodes
      .filter((r) => r.author != null)
      .map((r) => ({
        reviewer: r.author!.login,
        state: r.state as ReviewEntry["state"],
        submittedAt: r.submittedAt,
        commitSha: r.commit?.oid ?? null,
        isStale: r.commit?.oid != null && r.commit.oid !== headSha,
      }));

    const ciRollup = pr.commits.nodes[0]?.commit.statusCheckRollup?.state;
    let ciStatus: PRData["ciStatus"] = "none";
    if (ciRollup === "SUCCESS") ciStatus = "success";
    else if (ciRollup === "FAILURE" || ciRollup === "ERROR") ciStatus = "failure";
    else if (ciRollup === "PENDING" || ciRollup === "EXPECTED") ciStatus = "pending";

    let latestComment: CommentPreview | null = null;

    const lastComment = pr.comments.nodes.filter((c) => c.author != null).at(-1);
    const lastReview = pr.reviews.nodes.filter((r) => r.author != null && r.body).at(-1);

    if (lastComment && lastReview) {
      if (new Date(lastComment.createdAt) >= new Date(lastReview.submittedAt)) {
        latestComment = {
          author: lastComment.author!.login,
          body: lastComment.body,
          bodyPreview: truncateToLines(lastComment.body, 3),
          createdAt: lastComment.createdAt,
          type: "comment",
        };
      } else {
        latestComment = {
          author: lastReview.author!.login,
          body: lastReview.body,
          bodyPreview: truncateToLines(lastReview.body, 3),
          createdAt: lastReview.submittedAt,
          type: "review",
        };
      }
    } else if (lastComment) {
      latestComment = {
        author: lastComment.author!.login,
        body: lastComment.body,
        bodyPreview: truncateToLines(lastComment.body, 3),
        createdAt: lastComment.createdAt,
        type: "comment",
      };
    } else if (lastReview?.body) {
      latestComment = {
        author: lastReview.author!.login,
        body: lastReview.body,
        bodyPreview: truncateToLines(lastReview.body, 3),
        createdAt: lastReview.submittedAt,
        type: "review",
      };
    }

    return {
      owner,
      repo,
      number: pr.number,
      title: pr.title,
      author: pr.author?.login ?? "unknown",
      state,
      isDraft: pr.isDraft,
      headSha,
      ciStatus,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      reviews,
      latestComment,
      fetchedAt: Date.now(),
    };
  }
}
