const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const routes = require("./routes/api");

const app = express();
const port = process.env.PORT || 5000;
app.set("trust proxy", 1);
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "3mb" }));

const mongoUri = process.env.MONGO_DB_URI;

if (!mongoUri) {
  throw new Error("MONGO_DB_URI is missing. Check your .env file.");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing. Check your .env file.");
}

app.use(
  session({
    name: "foodlink.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 60 * 60 * 2
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    message: "Food Link API is running",
    status: "success"
  });
});

app.use("/api", routes);

const frontendPath = path.join(__dirname, "client", "dist");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

async function startServer() {
  try {
    await mongoose.connect(mongoUri);

    console.log("Database connected successfully");

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
  }
}

startServer();
