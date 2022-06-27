import endent from 'endent'
import {existsSync} from 'fs'
import {downloadFile, makeCacheDir, pullGitRepo} from './cache'
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

export default async function makeRos2BranchesConsistent({
  newBranch,
  reposBranch,
  reposYamlUrl,
  rosDistroDirectory,
  rosDistroYamlUrl,
  reposToExclude,
  cacheDir = '.cache',
  isDryRun = true,
  isForceRefresh = false,
}: {
  newBranch: string
  reposYamlUrl?: string
  reposBranch: string
  rosDistroYamlUrl?: string
  rosDistroDirectory: string
  reposToExclude: string[]
  cacheDir?: string
  isDryRun?: boolean
  isForceRefresh?: boolean
}) {
  makeCacheDir({path: cacheDir, isForceRefresh})

  // Setup repos data structure
  const reposYamlPath = join(cacheDir, `ros2.repos.${reposBranch}.yaml`)
  const outputReposYamlPath = join(
    cacheDir,
    `ros2.repos.${reposBranch}.output.yaml`,
  )
  if (!reposYamlUrl) {
    reposYamlUrl = `https://raw.githubusercontent.com/ros2/ros2/${reposBranch}/ros2.repos`
  }
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
  if (!rosDistroYamlUrl) {
    rosDistroYamlUrl = `https://raw.githubusercontent.com/ros/rosdistro/master/${rosDistroDirectory}/distribution.yaml`
  }
  await downloadFile({url: rosDistroYamlUrl, path: rosDistroYamlPath})
  const distribution = getDistributionFile(rosDistroYamlPath)

  const errors: string[] = []
  const reposSkipped: string[] = []
  for (const repo of repos) {
    if (reposToExclude.includes(`${repo.org}/${repo.name}`)) {
      console.log(
        `Excluded ${repo.org}/${repo.name} since it is on the exclude list`,
      )
      continue
    }

    console.log('\n')
    const oldBranch = await getDefaultBranch({org: repo.org, name: repo.name})
    if (oldBranch !== newBranch) {
      console.log(`Processing ${repo.org}/${repo.name}`)
      const repoPath = join(cacheDir, reposBranch, repo.org, repo.name)

      const pullMessage = await pullGitRepo({
        url: repo.url,
        destinationPath: repoPath,
        version: repo.version,
      })
      logSubItem(pullMessage)

      try {
        await pushMirrorWorkflow({
          oldBranch,
          newBranch,
          repoPath,
          isDryRun,
        })
      } catch (e) {
        const message = `Error changing default branch and retargetting PRs on ${
          repo.org
        }/${repo.name}: ${e instanceof Error ? e.message : e}`
        logSubItemError(message)
        errors.push(message)
      }

      try {
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
          logSubItem(
            `Could not update distribution.yaml, since ${repo.org}/${repo.name} is not in the distribution.yaml`,
          )
        }
      } catch (e: unknown) {
        const message = `Error changing default branch and retargetting PRs on ${
          repo.org
        }/${repo.name}: ${e instanceof Error ? e.message : e}`
        logSubItemError(message)
        errors.push(message)
      }
    } else {
      console.log('\n')
      logSubItem(
        `Doing nothing - ${repo.org}/${repo.name} already has the default branch ${newBranch}`,
      )
      reposSkipped.push(`${repo.org}/${repo.name}`)
      // TODO: Remove this duplication
      repo.version = newBranch
      try {
        setDistributionVersion(distribution, repo.name, newBranch)
      } catch (e) {
        logSubItem(
          `Could not update distribution.yaml, since ${repo.org}/${repo.name} is not in the distribution.yaml`,
        )
      }
    }
  }
  // Update ROS2.repos.yaml
  const newReposFile = toReposFile(repos)
  fs.writeFileSync(outputReposYamlPath, newReposFile)

  // Update distribution.yaml
  const newDistributionFile = toDistributionFile(distribution)
  fs.writeFileSync(outputRosDistroYamlPath, newDistributionFile)

  if (errors.length > 0) {
    console.log(`Finished with errors:`)
    errors.forEach(logSubItem)
  } else {
    console.log('Done! - No errors')
  }
  if (reposSkipped.length > 0) {
    console.log(`Skipped repos:`)
    reposSkipped.forEach(logSubItem)
  }
}

function logSubItem(message: string) {
  console.log(` - ${message}`)
}

function logSubItemError(message: string) {
  logSubItem(`ERROR: ${message}`)
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
    const migrationWorkflowFileContent =
      endent`
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
    ` + '\n'
    message = await createCommitAndPushFile({
      repoPath: repoPath,
      filePath: migrationWorkflowFilePath,
      fileContent: migrationWorkflowFileContent,
      commitMessage: `Mirror ${newBranch} to ${oldBranch}`,
      isDryRun,
    })
  }
  logSubItem(message)
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
    let isError = false
    await createNewBranch({
      org: repoOrg,
      name: repoName,
      baseBranch: oldBranch,
      newBranchName: newBranch,
    })
    try {
      await setDefaultBranch({org: repoOrg, name: repoName, branch: newBranch})
    } catch (e) {
      logSubItem(
        `Error changing default branch on ${repoOrg}/${repoName}: ${
          e instanceof Error ? e.message : e
        }`,
      )
      isError = true
    }
    try {
      await retargetPrs({
        org: repoOrg,
        name: repoName,
        fromBranch: oldBranch,
        toBranch: newBranch,
      })
    } catch (e) {
      logSubItem(
        `Error retargeting PRs on ${repoOrg}/${repoName}: ${
          e instanceof Error ? e.message : e
        }`,
      )
      isError = true
    }
    if (!isError) {
      message = `Updated ${repoOrg}/${repoName} default branch from ${oldBranch} to ${newBranch} and retargetted PRs`
    } else {
      message = `Errors updating ${repoOrg}/${repoName} default branch from ${oldBranch} to ${newBranch}`
    }
  } else {
    message = `Would create a new branch ${newBranch} from ${oldBranch} and retarget PRs`
  }
  logSubItem(message)
}
