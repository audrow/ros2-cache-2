# README

This script seeks to be useful in making the ROS 2 branch names more consistent.
At the time of writing, the ROS 2 repositories have several default branch names, such as `rolling`, `master`, `main`, `rolling-devel`, and even `crystal-devel` or `dashing-devel`.
The goal of this script is to clean things up so that all branches used by Rolling are called `rolling`.
This will have a couple of major advantages:

- Less confusing to new contributors (and the Open Robotics team)
- Easier to automate operations across the ROS 2 repositories

## Details

This script does the following. Note that all configuration is in `src/index.ts`. Also, this script doesn't have to change all of the default branches to `rolling`, you could use any other branch name in the configuration.

- Find the list of repositories to apply the change to from a `ros2.repos` file
- For each repository
  - Find the current default branch on the repository
  - Commits and pushes a GitHub action to automatically sync between ‘rolling’ and the old default branch
  - Creates a `rolling` branch and sets the Rolling branch as the default branch for the repository
  - Retarget all PRs for the old default branch to the new `rolling` branch
- Updates `ros2.repos` and `rolling/distribution.yaml` files locally for all repos that had a new branch created

Note that this script handles the following special cases:

- Specific repositories can be excluded
- The `rolling` branch will not be created if it exists, nor will PRs be retargeted
- The Github workflow will not be created if the workflow file already exists in the repository
- Repos in the `ros2.repos` file but not in the `rolling/distribution.yaml` won't cause any problems
- Reports the repositories that had errors creating a branch and pushing, often due to permission errors
