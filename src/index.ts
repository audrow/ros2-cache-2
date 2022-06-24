import makeRos2BranchesConsistent from './make-ros2-branches-consistent'

async function main() {
  const newBranch = 'rolling'
  const reposBranch = 'master'
  const rosDistroDirectory = 'rolling'

  const reposToExclude = [
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

  const isDryRun = true
  const isForceRefresh = false

  await makeRos2BranchesConsistent({
    newBranch,
    reposBranch,
    rosDistroDirectory,
    reposToExclude,
    isDryRun,
    isForceRefresh,
  })
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
