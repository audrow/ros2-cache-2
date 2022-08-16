import test from 'ava'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {reposFile} from '../dist/main.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const REPOS_YAML_PATH = join(__dirname, '__test_data__', 'ros2.repos')

test('works in both directions', (t) => {
  const unprocessedRepos = reposFile.loadRepos_(REPOS_YAML_PATH)
  const processedRepos = reposFile.processRepos(unprocessedRepos)
  const convertedProcessedRepos = reposFile.reposToReposFile(processedRepos)
  t.deepEqual(convertedProcessedRepos, unprocessedRepos)
})

test('processes in one step or two', (t) => {
  const unprocessedRepos = reposFile.loadRepos_(REPOS_YAML_PATH)
  const processedRepos = reposFile.processRepos(unprocessedRepos)
  const processedRepos2 = reposFile.loadRepos(REPOS_YAML_PATH)
  t.deepEqual(processedRepos2, processedRepos)
})

test('gets a repo if it exists', (t) => {
  t.snapshot(reposFile.getRepo(reposFile.loadRepos(REPOS_YAML_PATH), 'rclcpp'))
  t.falsy(reposFile.getRepo(reposFile.loadRepos(REPOS_YAML_PATH), 'not-a-repo'))
})

test('sets data on a repo', (t) => {
  const repos = reposFile.loadRepos(REPOS_YAML_PATH)
  const oldOrg = reposFile.getRepo(repos, 'rclcpp').org
  t.is(oldOrg, 'ros2')
  const oldVersion = reposFile.getRepo(repos, 'rclcpp').version
  t.is(oldVersion, 'master')

  const newVersion = 'ultra-ros'
  const newOrg = 'ultra-org'
  const newRepos = reposFile.setRepo(repos, 'rclcpp', {
    version: newVersion,
    org: newOrg,
  })

  t.is(reposFile.getRepo(repos, 'rclcpp').org, oldOrg)
  t.is(reposFile.getRepo(repos, 'rclcpp').version, oldVersion)

  t.is(reposFile.getRepo(newRepos, 'rclcpp').org, newOrg)
  t.is(reposFile.getRepo(newRepos, 'rclcpp').version, newVersion)

  t.snapshot(reposFile.getRepo(newRepos, 'rclcpp'))
})

test('sets the version of an repo', (t) => {
  const repos = reposFile.loadRepos(REPOS_YAML_PATH)
  const oldVersion = reposFile.getRepo(repos, 'rclcpp').version
  t.is(oldVersion, 'master')
  const newVersion = 'ultra-ros'
  const newRepos = reposFile.setRepoVersion(repos, 'rclcpp', newVersion)
  t.is(reposFile.getRepo(repos, 'rclcpp').version, oldVersion)
  t.is(reposFile.getRepo(newRepos, 'rclcpp').version, newVersion)
})

test('throws an error when setting non-existent repo', (t) => {
  const repos = reposFile.loadRepos(REPOS_YAML_PATH)
  t.throws(() => {
    reposFile.setRepo(repos, 'not-a-repo', {
      version: 'ultra-ros',
    })
  })
  t.throws(() => {
    reposFile.setRepoVersion(repos, 'not-a-repo', 'ultra-ros')
  })
})
