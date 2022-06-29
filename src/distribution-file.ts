import {readFileSync} from 'fs'
import yaml from 'js-yaml'
import type DistributionFile from './__types__/DistributionFile'

export function getDistributionFile(distributionYamlPath: string) {
  const rawFile = readFileSync(distributionYamlPath, 'utf8')
  const distribution = yaml.load(rawFile) as DistributionFile
  const header = rawFile.match(/((?:.|\n)*---)\n/)
  if (header) {
    distribution.header = header[1]
  }
  return distribution
}

export function getFromDistribution(
  distribution: DistributionFile,
  repo: string,
) {
  return distribution.repositories[repo]
}

export function setDistributionVersion(
  distribution: DistributionFile,
  repo: string,
  version: string,
  isSkipRelease = true,
) {
  if (distribution.repositories[repo] === undefined) {
    throw new Error(`Repo ${repo} does not exist`)
  }
  const dist = getFromDistribution(distribution, repo)
  if (dist.doc) {
    dist.doc.version = version
  }
  if (dist.release && !isSkipRelease) {
    dist.release.version = version
  }
  if (dist.source) {
    dist.source.version = version
  }
}

export function toDistributionFile(distribution: DistributionFile) {
  const {header, ...contents} = distribution
  let output = yaml.dump(contents, {noArrayIndent: true, lineWidth: -1})
  output = header + '\n' + output
  return output
}
