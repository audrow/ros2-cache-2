import fs from 'fs'
import gitClone from 'git-clone'
import {join} from 'path'
import simpleGit from 'simple-git'

function makeCacheDir({
  path,
  forceRefresh = true,
}: {
  path: string
  forceRefresh?: boolean
}) {
  if (fs.existsSync(path) && forceRefresh) {
    console.log(`Deleting the cache directory: ${path}`)
    fs.rmSync(path, {recursive: true})
  }
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }
}

async function getUpdatedRepo({
  url,
  branch,
  baseDirectory,
}: {
  url: string
  baseDirectory: string
  branch: string
}) {
  if (!url.includes('github.com')) {
    throw new Error(`The repo must be a Github url: ${url}`)
  }

  const [org, repo] = url.split('/').slice(-2)
  if (!org || !repo) {
    throw new Error(
      `Could not find the organization and repo from the Github url: ${url}`,
    )
  }

  const path = join(baseDirectory, org, repo)
  if (!fs.existsSync(path)) {
    try {
      gitClone(url, path, {checkout: branch})
    } catch (e) {
      console.error(`Could not clone the repo: ${url}`)
      throw e
    }
  } else {
    const git = simpleGit(path)
    try {
      await git.checkout(branch)
    } catch (e) {
      console.error(`Could not checkout the branch: ${branch}`)
      throw e
    }
    try {
      await git.pull()
    } catch (e) {
      console.error(`Could not pull the branch: ${branch}`)
      throw e
    }
  }
  return path
}

async function main() {
  const cacheDir = './.cache'
  makeCacheDir({path: cacheDir})
  const path = join(cacheDir, 'unmodified-repos')
  await getUpdatedRepo({
    url: 'https://github.com/audrow/rclcpp',
    baseDirectory: path,
    branch: 'master',
  })
}

main()
