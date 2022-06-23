import axios from 'axios'
import fs from 'fs'
import clone from 'git-clone/promise'
import yaml from 'js-yaml'
import {join} from 'path'
import simpleGit from 'simple-git'

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

type ReposFile = {
  repositories: {
    [key: string]: {
      type: string
      url: string
      version: string
    }
  }
}

type Repo = {
  name: string
  org: string
  url: string
  version: string
}

export async function downloadFile({path, url}: {url: string; path: string}) {
  const reposText = (await axios.get(url)).data
  fs.writeFileSync(path, reposText)
  return path
}

export function getRepos(path: string, reposToExclude?: string[]): Repo[] {
  const reposText = fs.readFileSync(path, 'utf8')
  const reposYaml = yaml.load(reposText) as ReposFile

  const allRepos = Object.entries(reposYaml.repositories).map(
    ([key, {type, url, version}]) => {
      if (type !== 'git') {
        throw new Error(`The repo type must be git: ${key}: ${type}`)
      }
      const [org, name] = url
        .replace(/\.git$/, '')
        .split('/')
        .slice(-2)
      if (!org || !name) {
        throw new Error(
          `Could not find the organization and repo from the Github url: ${url}`,
        )
      }
      return {name, org, url, version}
    },
  )
  if (reposToExclude && reposToExclude.length > 0) {
    return excludeSelectRepos(allRepos, reposToExclude)
  } else {
    return allRepos
  }
}

function excludeSelectRepos(repos: Repo[], reposToExclude: string[]): Repo[] {
  reposToExclude.forEach((r) => {
    if (r.split('/').length !== 2) {
      throw Error(
        `Repo to exclude is not well formed. Must be 'org/name': ${r}`,
      )
    }
  })
  return repos.filter((r) => {
    const repoString = `${r.org}/${r.name}`
    return !reposToExclude.includes(repoString)
  })
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
