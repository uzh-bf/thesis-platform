module.exports = {
  projects: {
    graphql: {
      schema: ['src/graphql/generated/schema.graphql'],
      documents: ['src/graphql/ops/**/*.{graphql}'],
    },
  },
}
