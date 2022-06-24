import fs from 'fs'
import {join} from 'path'
import {
  getRepos,
  mergeReposFiles,
  splitGithubUrl,
  toReposFile,
} from '../repos-file'

const PATH_TO_REPOS_FILE = join(
  __dirname,
  '__test_files__',
  'ros2.repos.master.yaml',
)
const REPOS_FILE_TEXT = fs.readFileSync(PATH_TO_REPOS_FILE, 'utf8')
const REPOS_TO_EXCLUDE = [
  'eProsima/Fast-CDR',
  'eProsima/Fast-DDS',
  'eProsima/foonathan_memory_vendor',
  'eclipse-cyclonedds/cyclonedds',
  'eclipse-iceoryx/iceoryx',
  'osrf/osrf_pycommon',
  'osrf/osrf_testing_tools_cpp',
  'ros-tracing/ros2_tracing',
  'ros/urdfdom',
  'ros/urdfdom_headers',
  'ros2/rosbag2',
]

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

test('repos files should be merged to include excluded repos', () => {
  const newBranch = 'some-new-branch-name'
  const oldBranch = 'some-old-branch-name'
  const primary = getRepos(PATH_TO_REPOS_FILE, REPOS_TO_EXCLUDE)
  primary.forEach((r) => {
    r.version = newBranch
  })
  const secondary = getRepos(PATH_TO_REPOS_FILE)
  secondary.forEach((r) => {
    r.version = oldBranch
  })
  const output = mergeReposFiles(primary, secondary, REPOS_TO_EXCLUDE)

  let reposWithOldBranch = 0
  let reposWithNewBranch = 0
  output.forEach((r) => {
    const excludeKey = `${r.org}/${r.name}`
    if (REPOS_TO_EXCLUDE.includes(excludeKey)) {
      expect(r.version).toBe(oldBranch)
      reposWithOldBranch++
    } else {
      expect(r.version).toBe(newBranch)
      reposWithNewBranch++
    }
  })
  expect(reposWithOldBranch).toBe(REPOS_TO_EXCLUDE.length)
  expect(reposWithNewBranch).toBe(primary.length)
  expect(output.length).toBe(primary.length + REPOS_TO_EXCLUDE.length)
})
