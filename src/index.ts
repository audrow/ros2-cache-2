import 'dotenv/config'
import {Octokit} from 'octokit'

const githubAccessToken = process.env.GITHUB_TOKEN
const octokit = new Octokit({auth: githubAccessToken})

async function newBranchFromDefaultBranch({
  owner,
  repo,
  newBranchName,
}: {
  owner: string
  repo: string
  newBranchName: string
}) {
  // GET DEFAULT BRANCH
  const defaultBranch = (
    await octokit.rest.repos.get({
      owner,
      repo,
    })
  ).data.default_branch
  console.log(defaultBranch)

  await createNewBranch({owner, repo, newBranchName, baseBranch: defaultBranch})

  // SET NEW BRANCH AS DEFAULT BRANCH
  await octokit.rest.repos.update({
    owner,
    repo,
    default_branch: newBranchName,
  })
}

async function createNewBranch({
  owner,
  repo,
  baseBranch,
  newBranchName,
}: {
  owner: string
  repo: string
  baseBranch: string
  newBranchName: string
}) {
  // GET SHA OF BASE BRANCH
  const sha1 = (
    await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    })
  ).data.object.sha
  console.log(sha1)

  // MAKE BRANCH FROM DEFAULT BRANCH
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha: sha1,
  })
}

async function main() {
  const owner = 'audrow'
  const repo = 'rclcpp'
  const newBranchName = 'my-new-branch4'

  await newBranchFromDefaultBranch({owner, repo, newBranchName})
}

main()
