import type { ReviewEntry } from "@/services/github/types";

export function computeStaleness(
  reviews: ReviewEntry[],
  headSha: string
): ReviewEntry[] {
  return reviews.map((review) => ({
    ...review,
    isStale: review.commitSha != null && review.commitSha !== headSha,
  }));
}

export function latestReviewPerReviewer(
  reviews: ReviewEntry[]
): ReviewEntry[] {
  const map = new Map<string, ReviewEntry>();
  for (const review of reviews) {
    const existing = map.get(review.reviewer);
    if (
      !existing ||
      (review.submittedAt &&
        existing.submittedAt &&
        new Date(review.submittedAt) > new Date(existing.submittedAt))
    ) {
      map.set(review.reviewer, review);
    }
  }
  return Array.from(map.values());
}
