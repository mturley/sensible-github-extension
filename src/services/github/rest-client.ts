import type { PRData, ReviewEntry, CommentPreview, GitHubClient } from "@/services/github/types";
import { truncateToLines } from "@/utils/relative-time";

const BASE_URL = "https://api.github.com";

interface RestPR {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  merged: boolean;
  user: { login: string };
  head: { sha: string };
  created_at: string;
  updated_at: string;
}

interface RestReview {
  user: { login: string } | null;
  state: string;
  submitted_at: string;
  commit_id: string;
  body: string;
}

interface RestCheckRun {
  status: string;
  conclusion: string | null;
}

interface RestComment {
  user: { login: string } | null;
  body: string;
  created_at: string;
}

export class RestClient implements GitHubClient {
  async fetchPR(owner: string, repo: string, number: number): Promise<PRData> {
    const [pr, reviews, checks, comments] = await Promise.all([
      this.fetchJSON<RestPR>(`${BASE_URL}/repos/${owner}/${repo}/pulls/${number}`),
      this.fetchJSON<RestReview[]>(`${BASE_URL}/repos/${owner}/${repo}/pulls/${number}/reviews`),
      this.fetchCheckStatus(owner, repo),
      this.fetchJSON<RestComment[]>(`${BASE_URL}/repos/${owner}/${repo}/issues/${number}/comments`),
    ]);

    const headSha = pr.head.sha;
    const state = pr.merged ? "merged" : pr.state;

    const reviewEntries: ReviewEntry[] = reviews
      .filter((r) => r.user != null)
      .map((r) => ({
        reviewer: r.user!.login,
        state: r.state as ReviewEntry["state"],
        submittedAt: r.submitted_at,
        commitSha: r.commit_id,
        isStale: r.commit_id !== headSha,
      }));

    let latestComment: CommentPreview | null = null;

    const lastComment = comments.filter((c) => c.user != null).at(-1);
    const lastReview = reviews.filter((r) => r.user != null && r.body).at(-1);

    if (lastComment && lastReview) {
      if (new Date(lastComment.created_at) >= new Date(lastReview.submitted_at)) {
        latestComment = makeCommentPreview(lastComment, "comment");
      } else {
        latestComment = makeReviewPreview(lastReview);
      }
    } else if (lastComment) {
      latestComment = makeCommentPreview(lastComment, "comment");
    } else if (lastReview?.body) {
      latestComment = makeReviewPreview(lastReview);
    }

    return {
      owner,
      repo,
      number,
      title: pr.title,
      author: pr.user.login,
      state,
      isDraft: pr.draft,
      headSha,
      ciStatus: checks,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      reviews: reviewEntries,
      latestComment,
      fetchedAt: Date.now(),
    };
  }

  private async fetchCheckStatus(
    owner: string,
    repo: string
  ): Promise<PRData["ciStatus"]> {
    try {
      const result = await this.fetchJSON<{ check_runs: RestCheckRun[] }>(
        `${BASE_URL}/repos/${owner}/${repo}/commits/HEAD/check-runs`
      );
      const runs = result.check_runs;
      if (runs.length === 0) return "none";
      if (runs.some((r) => r.conclusion === "failure")) return "failure";
      if (runs.every((r) => r.conclusion === "success")) return "success";
      return "pending";
    } catch {
      return "none";
    }
  }

  private async fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
  }
}

function makeCommentPreview(
  comment: RestComment,
  type: CommentPreview["type"]
): CommentPreview {
  return {
    author: comment.user!.login,
    body: comment.body,
    bodyPreview: truncateToLines(comment.body, 3),
    createdAt: comment.created_at,
    type,
  };
}

function makeReviewPreview(review: RestReview): CommentPreview {
  return {
    author: review.user!.login,
    body: review.body,
    bodyPreview: truncateToLines(review.body, 3),
    createdAt: review.submitted_at,
    type: "review",
  };
}
