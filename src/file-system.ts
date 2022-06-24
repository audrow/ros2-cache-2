import fs from 'fs'
import {dirname, resolve} from 'path'
import simpleGit from 'simple-git'

export async function createCommitAndPushFile({
  repoPath,
  filePath,
  fileContent,
  commitMessage,
  isDryRun,
}: {
  repoPath: string
  filePath: string
  fileContent: string
  commitMessage: string
  isDryRun: boolean
}) {
  const absoluteFilePath = resolve(filePath)

  fs.mkdirSync(dirname(absoluteFilePath), {recursive: true})
  fs.writeFileSync(absoluteFilePath, fileContent)

  const git = simpleGit(repoPath)
  await git.add(absoluteFilePath)
  await git.commit(commitMessage)
  try {
    if (!isDryRun) {
      await git.push()
      return `Pushed new commit: ${commitMessage}`
    } else {
      return `Would push new commit: ${commitMessage}`
    }
  } catch (e) {
    console.error(`Could not push the file: ${absoluteFilePath}`)
    throw e
  }
}
