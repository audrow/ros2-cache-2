import axios from 'axios'
import fs from 'fs'
import gitClone from 'git-clone'
import yaml from 'js-yaml'
import {join} from 'path'
import simpleGit from 'simple-git'

function makeCacheDir({
  path,
  forceRefresh = false,
}: {
  path: string
  forceRefresh?: boolean
}) {
  if (fs.existsSync(path) && forceRefresh) {
    fs.rmSync(path, {recursive: true})
  }
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }
}

async function pullGitRepo({
  url,
  destinationPath,
  version,
}: {
  url: string
  destinationPath: string
  version: string
}) {
  if (!fs.existsSync(destinationPath)) {
    try {
      gitClone(url, destinationPath, {checkout: version})
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
    } catch (e) {
      console.error(`Could not pull the branch: ${version}`)
      throw e
    }
  }
  return destinationPath
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
  localPath?: string
}

async function pullReposYaml({
  branch,
  path,
}: {
  branch: 'master' | 'humble' | 'galactic' | 'foxy'
  path: string
}) {
  const url = `https://raw.githubusercontent.com/ros2/ros2/${branch}/ros2.repos`
  const reposText = (await axios.get(url)).data
  fs.writeFileSync(path, reposText)
  return path
}

function getRepos(path: string): Repo[] {
  const reposText = fs.readFileSync(path, 'utf8')
  const reposYaml = yaml.load(reposText) as ReposFile

  return Object.entries(reposYaml.repositories).map(
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
}

async function main() {
  const branch = 'humble'
  const cacheDir = '.cache'
  makeCacheDir({path: cacheDir})

  const reposYamlPath = join(cacheDir, `ros2.repos.${branch}.yaml`)
  await pullReposYaml({branch, path: reposYamlPath})
  const repos = getRepos(reposYamlPath)

  const someRepos = repos.slice(0, 5)
  for (const repo of someRepos) {
    const repoPath = join(cacheDir, branch, repo.org, repo.name)
    await pullGitRepo({
      url: repo.url,
      destinationPath: repoPath,
      version: repo.version,
    })
    repo.localPath = repoPath
  }
  console.log(repos.slice(0, 5))
}

main()
