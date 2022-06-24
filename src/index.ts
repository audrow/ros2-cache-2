import endent from 'endent'
import {existsSync} from 'fs'
import {downloadFile, makeCacheDir, pullGitRepo} from './cache'
import {REPOS_TO_EXCLUDE} from './config'
import {
  getDistributionFile,
  setDistributionVersion,
  toDistributionFile,
} from './distribution-file'
import {createCommitAndPushFile} from './file-system'
import {
  createNewBranch,
  getDefaultBranch,
  retargetPrs,
  setDefaultBranch,
} from './github'
import {getRepos, toReposFile} from './repos-file'

import fs from 'fs'
import {join} from 'path'

function log(message: string) {
  console.log(` - ${message}`)
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
    message = await createCommitAndPushFile({
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
  const cacheDir = '.cache'
  const newBranch = 'rolling'
  const reposBranch = 'master'
  const rosDistroDirectory = 'rolling'

  makeCacheDir({path: cacheDir, isForceRefresh})

  // Setup repos data structure
  const reposYamlPath = join(cacheDir, `ros2.repos.${reposBranch}.yaml`)
  const outputReposYamlPath = join(
    cacheDir,
    `ros2.repos.${reposBranch}.output.yaml`,
  )
  const reposYamlUrl = `https://raw.githubusercontent.com/ros2/ros2/${reposBranch}/ros2.repos`
  await downloadFile({url: reposYamlUrl, path: reposYamlPath})
  const repos = getRepos(reposYamlPath)

  // Setup distribution data structure
  const rosDistroYamlPath = join(
    cacheDir,
    `distribution.${rosDistroDirectory}.yaml`,
  )
  const outputRosDistroYamlPath = join(
    cacheDir,
    `distribution.${rosDistroDirectory}.output.yaml`,
  )
  const rosDistroYamlUrl = `https://raw.githubusercontent.com/ros/rosdistro/master/${rosDistroDirectory}/distribution.yaml`
  await downloadFile({url: rosDistroYamlUrl, path: rosDistroYamlPath})
  const distribution = getDistributionFile(rosDistroYamlPath)

  for (const repo of repos) {
    if (REPOS_TO_EXCLUDE.includes(`${repo.org}/${repo.name}`)) {
      console.log(
        `Skipping ${repo.org}/${repo.name} since it is on the exclude list`,
      )
      continue
    }

    const oldBranch = await getDefaultBranch({org: repo.org, name: repo.name})
    if (oldBranch !== newBranch) {
      console.log(`Processing ${repo.org}/${repo.name}`)
      const repoPath = join(cacheDir, reposBranch, repo.org, repo.name)

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

      repo.version = newBranch
      try {
        setDistributionVersion(distribution, repo.name, newBranch)
      } catch (e) {
        log(
          `Could not update distribution.yaml, since ${repo.org}/${repo.name} is not in the distribution.yaml`,
        )
      }
    } else {
      log(
        `Doing nothing - ${repo.org}/${repo.name} already has the default branch ${reposBranch}`,
      )
    }
  }
  // Update ROS2.repos.yaml
  const newReposFile = toReposFile(repos)
  fs.writeFileSync(outputReposYamlPath, newReposFile)

  // Update distribution.yaml
  const newDistributionFile = toDistributionFile(distribution)
  fs.writeFileSync(outputRosDistroYamlPath, newDistributionFile)
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
