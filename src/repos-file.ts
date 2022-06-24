import fs from 'fs'
import yaml from 'js-yaml'

import type Repo from './__types__/Repo'
import type ReposFile from './__types__/ReposFile'

export function getRepos(path: string): Repo[] {
  const reposText = fs.readFileSync(path, 'utf8')
  const reposYaml = yaml.load(reposText) as ReposFile

  const repos = Object.entries(reposYaml.repositories).map(
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
  return repos
}

export function splitGithubUrl(url: string) {
  const [org, name] = url
    .replace(/\.git$/, '')
    .split('/')
    .slice(-2)
  if (!org || !name) {
    throw new Error(
      `Could not find the organization and repo from the Github url: ${url}`,
    )
  }
  return {name, org}
}

export function toReposFile(repos: Repo[]) {
  const reposFile: ReposFile = {repositories: {}}
  for (const repo of repos) {
    reposFile.repositories[`${repo.org}/${repo.name}`] = {
      type: 'git',
      url: repo.url,
      version: repo.version,
    }
  }
  return yaml.dump(reposFile)
}
