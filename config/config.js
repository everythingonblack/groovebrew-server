require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    // ssl: process.env.DB_SSL === 'true',
    ssl: false,
    dialectOptions: {
      ssl: {
        // require: process.env.DB_SSL_REQUIRE === 'true',
        // rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      
        require: false,
        rejectUnauthorized: false
      }
    },
    define: {
      freezeTableName: true
    }
  },
  test: {
    username: "your_test_username",
    password: "your_test_password",
    database: "database_test",
    host: "127.0.0.1",
    port: 3306,
    dialect: "mysql"
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    ssl: process.env.DB_SSL === 'true',
    dialectOptions: {
      ssl: {
        require: process.env.DB_SSL_REQUIRE === 'true',
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      }
    }
  }
};
