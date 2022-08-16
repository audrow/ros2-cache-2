import test from 'ava'
import simpleGit from 'simple-git'
import tempFs from 'temp-fs'
import {git} from '../dist/main.js'

test.before(async (t) => {
  const {path: path_} = tempFs.mkdirSync({
    recursive: true,
    track: true,
  })
  t.context.path = path_.toString()
  const repo = 'https://github.com/ros2/common_interfaces'
  await simpleGit().clone(repo, t.context.path)
})

test.after.always(async () => {
  tempFs.clearSync()
})

test('has branch', async (t) => {
  t.plan(3)

  const path = t.context.path

  t.true(await git.hasBranch(path, RegExp('galactic')))
  t.true(await git.hasBranch(path, RegExp('master')))
  t.false(await git.hasBranch(path, RegExp('not-a-branch')))
})

test('create a new branch', async (t) => {
  t.timeout(10000)

  const path = t.context.path

  const baseBranch = 'rolling'
  const newBranch = 'my-new-branch'

  const gitRepo = simpleGit(path)

  t.true(await git.hasBranch(path, RegExp(baseBranch)))
  const baseLog = await gitRepo.log(baseBranch)

  t.false(await git.hasBranch(path, RegExp(newBranch)))
  await git.checkoutBranch(path, newBranch, baseBranch)
  t.true(await git.hasBranch(path, RegExp(newBranch)))
  const newLog = await gitRepo.log(newBranch)

  t.assert(baseLog.latest.hash, newLog.latest.hash)
})
