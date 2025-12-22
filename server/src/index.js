const { createServer } = require("http");
const { env } = require("./config/env");
const { connectDb } = require("./lib/db/connectDb");
const { init } = require("./config/init");
const { app } = require("./app");

require("dotenv").config();

connectDb();
init();

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
