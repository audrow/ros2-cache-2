type ReposFile = {
  repositories: {
    [key: string]: {
      type: string
      url: string
      version: string
    }
  }
}

export default ReposFile
