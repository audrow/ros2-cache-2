import 'dotenv/config'
import {Octokit} from 'octokit'

const githubAccessToken = process.env.GITHUB_TOKEN
const octokit = new Octokit({auth: githubAccessToken})

async function getDefaultBranch({owner, repo}: {owner: string; repo: string}) {
  return (
    await octokit.rest.repos.get({
      owner,
      repo,
    })
  ).data.default_branch
}

async function setDefaultBranch({
  owner,
  repo,
  branch,
}: {
  owner: string
  repo: string
  branch: string
}) {
  await octokit.rest.repos.update({
    owner,
    repo,
    default_branch: branch,
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
  const sha1 = (
    await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    })
  ).data.object.sha

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha: sha1,
  })
}

async function retargetPrs({
  owner,
  repo,
  fromBranch,
  toBranch,
}: {
  owner: string
  repo: string
  fromBranch: string
  toBranch: string
}) {
  const prs = await getPrNumbersTargetingABranch({
    owner,
    repo,
    branch: fromBranch,
  })
  await changePrTargetsToBranch({owner, repo, branch: toBranch, prs})
}

async function getPrNumbersTargetingABranch({
  owner,
  repo,
  branch,
}: {
  owner: string
  repo: string
  branch: string
}) {
  const prs = (
    await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
      base: branch,
    })
  ).data.map((pr) => pr.number)

  return prs
}

async function changePrTargetsToBranch({
  owner,
  repo,
  branch,
  prs,
}: {
  owner: string
  repo: string
  branch: string
  prs: number[]
}) {
  for (const pr of prs) {
    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: pr,
      base: branch,
    })
  }
}

async function main() {
  const owner = 'audrow'
  const repo = 'rclcpp'
  const newBranch = 'rolling'

  const oldBranch = await getDefaultBranch({owner, repo})
  await createNewBranch({
    owner,
    repo,
    baseBranch: oldBranch,
    newBranchName: newBranch,
  })
  await setDefaultBranch({owner, repo, branch: newBranch})
  await retargetPrs({owner, repo, fromBranch: oldBranch, toBranch: newBranch})
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
