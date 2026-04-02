export const PR_QUERY = `
query GetPullRequest($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      number
      title
      state
      isDraft
      createdAt
      updatedAt
      mergedAt
      author { login }
      headRefOid
      commits(last: 1) {
        nodes {
          commit {
            statusCheckRollup {
              state
            }
          }
        }
      }
      reviews(first: 100) {
        nodes {
          author { login }
          state
          submittedAt
          commit { oid }
          body
        }
      }
      comments(last: 1) {
        nodes {
          author { login }
          body
          createdAt
        }
      }
    }
  }
}
`;
