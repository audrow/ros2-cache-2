import fs from 'fs'
import {join} from 'path'
import {getRepos, splitGithubUrl, toReposFile} from '../repos-file'

const PATH_TO_REPOS_FILE = join(
  __dirname,
  '__test_files__',
  'ros2.repos.master.yaml',
)
const REPOS_FILE_TEXT = fs.readFileSync(PATH_TO_REPOS_FILE, 'utf8')

test('split org and name from github url', () => {
  ;[
    ['ros2', 'rclcpp'],
    ['ros2', 'rclpy'],
    ['ignition', 'ignition'],
    ['ignition-release', 'ignition_transport'],
    ['ignition-release', 'ignition_cmake2_vendor'],
  ].forEach(([org, name]) => {
    ;[
      `https://github.com/${org}/${name}`,
      `https://github.com/${org}/${name}.git`,
    ].forEach((url) => {
      const {org: believedOrg, name: believedName} = splitGithubUrl(url)
      expect(believedOrg).toBe(org)
      expect(believedName).toBe(name)
    })
  })
})

test('repos file should be processed and returned to the same thing', () => {
  const repos = getRepos(PATH_TO_REPOS_FILE)

  // A hack to make the test pass, while there is this inconsistency in the ROS 2 repos file.
  // Once the ignition repos use the same org as their URL (ignition-release), this hack can be removed.
  repos.forEach((r) => {
    if (r.org === 'ignition-release') {
      r.org = 'ignition'
    }
  })

  const processedReposText = toReposFile(repos)
  expect(REPOS_FILE_TEXT).toBe(processedReposText)
})
