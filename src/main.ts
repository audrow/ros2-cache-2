export * as git from './git'
export * as reposFile from './repos-file'
export {DistributionYamlFile, ProcessedRepos, ReposFile}
// export * as reposFile from './repos-file'

import type DistributionYamlFile from './__types__/DistributionYamlFile'
import type ProcessedRepos from './__types__/ProcessedRepos'
import type ReposFile from './__types__/ReposFile'

const PKG_VERSION = 'PKG_VERSION'
export const version = PKG_VERSION

export function ping() {
  return 'pong'
}
