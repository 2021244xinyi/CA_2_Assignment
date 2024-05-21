const express = require("express");
const bodyParser = require("body-parser");
require("ejs");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const User = require("./models/user");
const flash = require("connect-flash");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
app = express();

// Connecting to MongoDB
const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
  }
};
connectToDB();

const store = new MongoDBStore({
  mongoUrl: process.env.MONGO_URI,
  collection: "sessions",
});

store.on("error", function (error) {
  console.log("Session store error:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const LocalStrategy = require("passport-local").Strategy;
passport.use(new LocalStrategy(User.authenticate()));

app.use("/", require("./routes"));

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
