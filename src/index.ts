import endent from 'endent'
import {existsSync} from 'fs'
import {downloadFile, getRepos, makeCacheDir, pullGitRepo} from './cache'
import {REPOS_TO_EXCLUDE} from './config'
import {createAddAndCommitFile} from './file-system'
import {
  createNewBranch,
  getDefaultBranch,
  retargetPrs,
  setDefaultBranch,
} from './github'

import {join} from 'path'

function log(message: string) {
  console.log(` * ${message}`)
}

async function pushMirrorWorkflow({
  oldBranch,
  newBranch,
  repoPath,
  isDryRun,
}: {
  oldBranch: string
  newBranch: string
  repoPath: string
  isDryRun: boolean
}) {
  let message: string
  const migrationWorkflowFilePath = join(
    repoPath,
    '.github',
    'workflows',
    `mirror-${newBranch}-to-${oldBranch}.yaml`,
  )
  if (existsSync(migrationWorkflowFilePath)) {
    message = `Doing nothing - Workflow file already exists: ${migrationWorkflowFilePath}`
  } else {
    const migrationWorkflowFileContent = endent`
      name: Mirror ${newBranch} to ${oldBranch}

      on:
        push:
          branches: [ ${newBranch} ]

      jobs:
        mirror-to-${oldBranch}:
          runs-on: ubuntu-latest
          steps:
          - uses: zofrex/mirror-branch@v1
            with:
              target-branch: ${oldBranch}
    `
    message = await createAddAndCommitFile({
      repoPath: repoPath,
      filePath: migrationWorkflowFilePath,
      fileContent: migrationWorkflowFileContent,
      commitMessage: `Mirror ${newBranch} to ${oldBranch}`,
      isDryRun,
    })
  }
  log(message)
}

async function changeDefaultBranchAndRetargetPrs({
  oldBranch,
  newBranch,
  repoOrg,
  repoName,
  isDryRun,
}: {
  oldBranch: string
  newBranch: string
  repoOrg: string
  repoName: string
  isDryRun: boolean
}) {
  let message: string
  if (!isDryRun) {
    await createNewBranch({
      org: repoOrg,
      name: repoName,
      baseBranch: oldBranch,
      newBranchName: newBranch,
    })
    await setDefaultBranch({org: repoOrg, name: repoName, branch: newBranch})
    await retargetPrs({
      org: repoOrg,
      name: repoName,
      fromBranch: oldBranch,
      toBranch: newBranch,
    })
    message = `Updated ${repoOrg}/${repoName} default branch from ${oldBranch} to ${newBranch} and retargetted PRs`
  } else {
    message = `Would create a new branch ${newBranch} from ${oldBranch} and retarget PRs`
  }
  log(message)
}

async function main() {
  const isDryRun = true
  const isForceRefresh = false
  const rosDistroBranch = 'master'
  const cacheDir = '.cache'
  const newBranch = 'rolling'

  makeCacheDir({path: cacheDir, isForceRefresh})

  const reposYamlPath = join(cacheDir, `ros2.repos.${rosDistroBranch}.yaml`)
  const url = `https://raw.githubusercontent.com/ros2/ros2/${rosDistroBranch}/ros2.repos`
  await downloadFile({url, path: reposYamlPath})
  const repos = getRepos(reposYamlPath, REPOS_TO_EXCLUDE)

  const someRepos = repos.slice(0, 5)
  for (const repo of someRepos) {
    console.log(`Processing ${repo.org}/${repo.name}`)
    const oldBranch = await getDefaultBranch({org: repo.org, name: repo.name})

    if (oldBranch !== newBranch) {
      const repoPath = join(cacheDir, rosDistroBranch, repo.org, repo.name)

      const pullMessage = await pullGitRepo({
        url: repo.url,
        destinationPath: repoPath,
        version: repo.version,
      })
      log(pullMessage)

      await pushMirrorWorkflow({
        oldBranch,
        newBranch,
        repoPath,
        isDryRun,
      })

      await changeDefaultBranchAndRetargetPrs({
        oldBranch,
        newBranch,
        repoOrg: repo.org,
        repoName: repo.name,
        isDryRun,
      })
    } else {
      log(
        `Doing nothing - ${repo.org}/${repo.name} already has the default branch ${rosDistroBranch}`,
      )
    }
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
