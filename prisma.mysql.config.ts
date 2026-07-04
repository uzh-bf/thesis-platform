const config = {
  schema: 'prisma/schema.mysql.prisma',
  migrations: {
    path: 'prisma/migrations_mysql_archive',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
}

export default config
