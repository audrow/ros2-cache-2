import fs from 'fs'
import yaml from 'js-yaml'

import type Repo from './__types__/Repo'
import type ReposFile from './__types__/ReposFile'

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

export function excludeSelectRepos(
  repos: Repo[],
  reposToExclude: string[],
): Repo[] {
  const outputRepos: Repo[] = JSON.parse(JSON.stringify(repos))
  reposToExclude.forEach((r) => {
    if (r.split('/').length !== 2) {
      throw Error(
        `Repo to exclude is not well formed. Must be 'org/name': ${r}`,
      )
    }
  })
  return outputRepos.filter((r) => {
    const repoString = `${r.org}/${r.name}`
    return !reposToExclude.includes(repoString)
  })
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

export function mergeReposFiles(
  primary: Repo[],
  secondary: Repo[],
  reposToMerge: string[],
): Repo[] {
  const outputRepos = JSON.parse(JSON.stringify(primary))
  for (const repos of reposToMerge) {
    const [org, name] = repos.split('/')
    const secondaryRepo = secondary.find(
      (r) => r.org === org && r.name === name,
    )
    if (secondaryRepo) {
      outputRepos.push(secondaryRepo)
    }
  }
  return outputRepos
}
