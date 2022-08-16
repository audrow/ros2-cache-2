export * as git from './git'

const PKG_VERSION = 'PKG_VERSION'
export const version = PKG_VERSION

export function ping() {
  return 'pong'
}
