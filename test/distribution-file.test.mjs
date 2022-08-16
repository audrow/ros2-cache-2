import test from 'ava'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {distributionFile as d} from '../dist/main.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DISTRIBUTION_YAML_PATH = join(
  __dirname,
  '__test_data__',
  'distribution.yaml',
)

test('should load the distribution file', (t) => {
  const dist = d.loadDistribution(DISTRIBUTION_YAML_PATH)
  t.snapshot(dist)
  d.getFromDistribution(dist, 'rclcpp')
})

test('should get a repo from the distribution file, if it exists', (t) => {
  const dist = d.loadDistribution(DISTRIBUTION_YAML_PATH)
  t.snapshot(d.getFromDistribution(dist, 'rclcpp'))
  t.snapshot(d.getFromDistribution(dist, 'not-a-repo'))
})

test('should set the version of a repo in the distribution file', (t) => {
  const dist = d.loadDistribution(DISTRIBUTION_YAML_PATH)
  const oldVersion = d.getFromDistribution(dist, 'rclcpp').doc.version
  t.is(oldVersion, 'master')
  const newVersion = 'ultra-ros'
  const newDist = d.setDistributionVersion(dist, 'rclcpp', newVersion)
  t.is(d.getFromDistribution(dist, 'rclcpp').doc.version, oldVersion)
  t.is(d.getFromDistribution(dist, 'rclcpp').source.version, oldVersion)
  t.is(d.getFromDistribution(newDist, 'rclcpp').doc.version, newVersion)
  t.is(d.getFromDistribution(newDist, 'rclcpp').source.version, newVersion)
})
