import 'dotenv/config'
import {Octokit} from 'octokit'

const githubAccessToken = process.env.GITHUB_TOKEN
const octokit = new Octokit({auth: githubAccessToken})

export async function getDefaultBranch({
  org,
  name,
}: {
  org: string
  name: string
}) {
  return (
    await octokit.rest.repos.get({
      owner: org,
      repo: name,
    })
  ).data.default_branch
}

export async function setDefaultBranch({
  org,
  name,
  branch,
}: {
  org: string
  name: string
  branch: string
}) {
  await octokit.rest.repos.update({
    owner: org,
    repo: name,
    default_branch: branch,
  })
}

export async function createNewBranch({
  org,
  name,
  baseBranch,
  newBranchName,
}: {
  org: string
  name: string
  baseBranch: string
  newBranchName: string
}) {
  const sha1 = (
    await octokit.rest.git.getRef({
      owner: org,
      repo: name,
      ref: `heads/${baseBranch}`,
    })
  ).data.object.sha

  await octokit.rest.git.createRef({
    owner: org,
    repo: name,
    ref: `refs/heads/${newBranchName}`,
    sha: sha1,
  })
}

export async function retargetPrs({
  org,
  name,
  fromBranch,
  toBranch,
}: {
  org: string
  name: string
  fromBranch: string
  toBranch: string
}) {
  const prs = await getPrNumbersTargetingABranch({
    org,
    name,
    branch: fromBranch,
  })
  await changePrTargetsToBranch({org, name, branch: toBranch, prs})
}

async function getPrNumbersTargetingABranch({
  org,
  name,
  branch,
}: {
  org: string
  name: string
  branch: string
}) {
  const prs = (
    await octokit.rest.pulls.list({
      owner: org,
      repo: name,
      state: 'open',
      base: branch,
    })
  ).data.map((pr) => pr.number)

  return prs
}

async function changePrTargetsToBranch({
  org,
  name,
  branch,
  prs,
}: {
  org: string
  name: string
  branch: string
  prs: number[]
}) {
  for (const pr of prs) {
    await octokit.rest.pulls.update({
      owner: org,
      repo: name,
      pull_number: pr,
      base: branch,
    })
  }
}

async function main() {
  const org = 'audrow'
  const name = 'rclcpp'
  const newBranch = 'rolling'

  const oldBranch = await getDefaultBranch({org, name})
  await createNewBranch({
    org: org,
    name: name,
    baseBranch: oldBranch,
    newBranchName: newBranch,
  })
  await setDefaultBranch({org, name, branch: newBranch})
  await retargetPrs({org, name, fromBranch: oldBranch, toBranch: newBranch})
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
