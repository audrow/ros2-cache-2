import fs from 'fs'
import {join} from 'path'
import {
  getDistributionFile,
  getFromDistribution,
  setDistributionVersion,
  toDistributionFile,
} from '../distribution-file'

const DISTRIBUTION_YAML_PATH = join(
  __dirname,
  '__test_files__',
  'distribution.rolling.yaml',
)
describe('distribution-file', () => {
  it('should load the distribution file', () => {
    const dist = getDistributionFile(DISTRIBUTION_YAML_PATH)
    expect(dist).toMatchSnapshot()
    getFromDistribution(dist, 'rclcpp')
  })

  it('should get a repo from the distribution file, if it exists', () => {
    const dist = getDistributionFile(DISTRIBUTION_YAML_PATH)
    expect(getFromDistribution(dist, 'rclcpp')).toMatchSnapshot()
    expect(getFromDistribution(dist, 'not-a-repo')).toBeUndefined()
  })

  it('should set the version of a repo in the distribution file', () => {
    const oldDist = getDistributionFile(DISTRIBUTION_YAML_PATH)
    const newDist = JSON.parse(JSON.stringify(oldDist))
    const oldVersion = getFromDistribution(oldDist, 'rclcpp').doc!.version
    expect(oldVersion).toBe('master')
    const newVersion = 'ultra-ros'
    setDistributionVersion(newDist, 'rclcpp', newVersion)
    expect(getFromDistribution(oldDist, 'rclcpp').doc!.version).toBe(oldVersion)
    expect(getFromDistribution(oldDist, 'rclcpp').source!.version).toBe(
      oldVersion,
    )
    expect(getFromDistribution(newDist, 'rclcpp').doc!.version).toBe(newVersion)
    expect(getFromDistribution(newDist, 'rclcpp').source!.version).toBe(
      newVersion,
    )
  })

  it('should output the same repos file as read in', () => {
    const rawFile = fs.readFileSync(DISTRIBUTION_YAML_PATH, 'utf8')

    const dist = getDistributionFile(DISTRIBUTION_YAML_PATH)
    const output = toDistributionFile(dist)
    expect(output).toBe(rawFile)
  })
})
