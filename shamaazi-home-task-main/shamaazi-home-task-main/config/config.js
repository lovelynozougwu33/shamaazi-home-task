/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();

const common = {
  dialect: 'postgres',
  logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
};

module.exports = {
  development: {
    ...common,
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shamaazi_dev',
  },
  test: {
    ...common,
    url: process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shamaazi_test',
  },
  production: {
    ...common,
    url: process.env.DATABASE_URL,
    dialectOptions: {
      ssl: process.env.DATABASE_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
  },
};
