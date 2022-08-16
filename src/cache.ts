import axios from 'axios'
import * as fs from 'fs'
import clone from 'git-clone/promise'
import {join} from 'path'
import simpleGit from 'simple-git'
import {getRepos} from './repos-file'

export function makeCacheDir({
  path,
  isForceRefresh = false,
}: {
  path: string
  isForceRefresh?: boolean
}) {
  if (fs.existsSync(path) && isForceRefresh) {
    fs.rmSync(path, {recursive: true})
  }
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }
}

export async function pullGitRepo({
  url,
  destinationPath,
  version,
}: {
  url: string
  destinationPath: string
  version: string
}) {
  let message: string
  if (!fs.existsSync(destinationPath)) {
    try {
      await clone(url, destinationPath, {checkout: version})
      message = `Cloned ${url} with version ${version}`
    } catch (e) {
      console.error(`Could not clone the repo: ${url}`)
      throw e
    }
  } else {
    const git = simpleGit(destinationPath)
    try {
      await git.checkout(version)
    } catch (e) {
      console.error(`Could not checkout the version: ${version}`)
      throw e
    }
    try {
      await git.pull()
      message = `Pulled ${url} with version ${version}`
    } catch (e) {
      console.error(`Could not pull the branch: ${version}`)
      throw e
    }
  }
  return message
}

export async function downloadFile({path, url}: {url: string; path: string}) {
  const reposText = (await axios.get(url)).data
  fs.writeFileSync(path, reposText)
  return path
}

async function main() {
  const branch = 'humble'
  const cacheDir = '.cache'
  makeCacheDir({path: cacheDir})

  const reposYamlPath = join(cacheDir, `ros2.repos.${branch}.yaml`)
  const url = `https://raw.githubusercontent.com/ros2/ros2/${branch}/ros2.repos`
  await downloadFile({url, path: reposYamlPath})
  const repos = getRepos(reposYamlPath)

  const someRepos = repos.slice(0, 5)
  for (const repo of someRepos) {
    const repoPath = join(cacheDir, branch, repo.org, repo.name)
    await pullGitRepo({
      url: repo.url,
      destinationPath: repoPath,
      version: repo.version,
    })
  }
  console.log(repos.slice(0, 5))
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
