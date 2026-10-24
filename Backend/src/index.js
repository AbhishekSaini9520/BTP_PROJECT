const express = require('express')
const app = express();
require("dotenv").config();
const main = require('./config/db')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userAuth = require('./routes/userAuth')
const redisClient = require('./config/redis')
const problemRouter = require('./routes/problemCreator')
const submitRouter = require('./routes/submit')
const http = require("http");
const server = http.createServer(app);


app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:5173",
];

app.use(cors({
  origin: function (origin, callback) {

    // allow requests with no origin (server-server, Postman, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked CORS origin:", origin);
    return callback(null, false); // don't throw error
  },
  credentials: true
}));

app.use('/user', userAuth);
app.use('/problem', problemRouter);
app.use('/submission', submitRouter);

const InitalizeConnection = async () => {
  try {
    await main();
    console.log("DB Connected");
  }
  catch (err) {
    console.error("DB is not connected. Check MongoDB Atlas Network Access and DB_CONNECT_STRING.");
    console.error(err.message);
    return;
  }

  try {
    await redisClient.connect();
    console.log("Redis Connected");
  }
  catch (error) {
    console.log("Redis Connection Failed (Ignoring): ", error.message);
  }

  server.listen(process.env.PORT, () => {
    console.log("Listening at the port number: " + process.env.PORT)
  })
}

InitalizeConnection();
