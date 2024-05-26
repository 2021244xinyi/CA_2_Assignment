const express = require("express");
const bodyParser = require("body-parser");
require("ejs");
const http = require("http");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const Player = require("./models/player");
const flash = require("connect-flash");
const { Server } = require("socket.io");
require("dotenv").config();
const PORT = 5000;
const mongoose = require("mongoose");
const Game = require("./models/game");

// Connect to MongoDB
const mongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
  } catch (error) {
    console.error(error);
  }
};
mongo();

app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
const server = http.createServer(app);

const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("joinGame", ({ gameId }) => {
    socket.join(gameId);
  });
  socket.on("game", ({ gameId, game }) => {
    io.to(gameId).emit("game", game);
  });
  socket.on("result", ({ gameId, players, winner }) => {
    updateDb(gameId, players, winner);
  });
});

async function updateDb(gameId, players, winner) {
  const player0 = await Player.findById(players[0]);
  const player1 = await Player.findById(players[1]);
  if (winner) {
    if (winner === players[0]) {
      player0.wins++;
      player1.losses++;
    } else {
      player1.wins++;
      player0.losses++;
    }
  } else {
    player0.draws++;
    player1.draws++;
  }
  await player0.save();
  await player1.save();

  const game = await Game.findById(gameId);
  game.status = "finished";
  await game.save();
}

const store = new MongoDBStore({
  mongoUrl: process.env.MONGODB_URL,
  collection: "sessions",
});

store.on("error", function (error) {
  console.error(error);
});

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(Player.serializeUser());
passport.deserializeUser(Player.deserializeUser());

const LocalStrategy = require("passport-local").Strategy;
passport.use(new LocalStrategy(Player.authenticate()));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/game");
  }
  const errorMessage = req.flash("error");
  return res.render("login", { errorMessage });
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/game");
  }
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/");
  });
});

app.post("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/game");
  }
  const newPlayer = new Player({
    name: req.body.name,
    username: req.body.username,
  });
  Player.register(newPlayer, req.body.password, (err) => {
    if (err) {
      return res.render("register", {
        errorMessage: "An error occurred. Please try again",
      });
    }
    passport.authenticate("local")(req, res, () => {
      return res.redirect("/game");
    });
  });
});

app.get("/game", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const leaderboard = await Player.find().sort({ wins: -1 });
  if (leaderboard.length > 5) {
    leaderboard.length = 5;
  }

  const player = req.user;
  let game = await Game.findOne({
    status: "ongoing",
    players: { $size: 1 },
  });

  if (game) {
    if (game.players[0]._id.toString() === player._id.toString()) {
      game = await game.populate("players");
      return res.render("game", { player, game, leaderboard });
    }
    game.players.push(player._id);
    await game.save();
    game = game;
  } else {
    game = new Game({
      players: [player._id],
      grid: Array(10)
        .fill()
        .map(() => Array(10).fill({ monster: null })),
    });
    await game.save();
    game = await Game.findById(game._id);
  }

  if (game.players.length === 2) {
    const monsterTypes = ["vampire", "werewolf", "ghost"];
    for (let i = 0; i < 10; i++) {
      const randomMonsterType =
        monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      game.grid[0][i].monster = {
        type: randomMonsterType,
        player: game.players[0]._id,
      };
    }

    for (let i = 0; i < 10; i++) {
      const randomMonsterType =
        monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      game.grid[9][i].monster = {
        type: randomMonsterType,
        player: game.players[1]._id,
      };
    }

    game.turn =
      game.players[Math.floor(Math.random() * game.players.length)]._id;

    await game.save();
  }
  game = await game.populate("players");

  return res.render("game", {
    player,
    game,
    leaderboard,
  });
});

app.get("/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const player = req.user;
  res.render("profile", { player });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
