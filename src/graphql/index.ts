import { scalarType } from 'nexus'

export const FileScalar = scalarType({
  name: 'File',
})

export * from './types/proposals'
export * from './types/query'
