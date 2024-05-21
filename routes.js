const router = require("express").Router();
const passport = require("passport");
const User = require("./models/user");
const Game = require("./models/game");

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/game");
  }
  const errorMessage = req.flash("error");
  res.render("login", { errorMessage });
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

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log("Error logging out: ", err);
    }
    res.redirect("/");
  });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) res.redirect("/game");
  res.render("register", {
    errorMessage: null,
  });
});

router.post("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/game");
  }
  const newUser = new User({
    name: req.body.name,
    username: req.body.username,
  });
  User.register(newUser, req.body.password, (err) => {
    if (err) {
      if (err.name === "MissingUsernameError") {
        return res.render("register", {
          errorMessage: "Please enter a username",
        });
      } else if (err.name === "MissingPasswordError") {
        return res.render("register", {
          errorMessage: "Please enter a password",
        });
      } else if (err.name === "UserExistsError") {
        return res.render("register", {
          errorMessage: "This username already exists",
        });
      } else {
        return res.render("register", { errorMessage: "An error occurred" });
      }
    }
    passport.authenticate("local")(req, res, () => {
      return res.redirect("/game");
    });
  });
});

router.get("/game", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const user = req.user;
  let game = await Game.findOne({
    players: user._id,
    status: "ongoing",
  }).populate("players");
  let playersCount = 0;

  if (!game) {
    const existingGameWithOnePlayer = await Game.findOne({
      status: "ongoing",
      $where: "this.players.length === 1",
    });

    if (existingGameWithOnePlayer) {
      // Add current user to the existing game
      existingGameWithOnePlayer.players.push(user._id);
      await existingGameWithOnePlayer.save();
      game = existingGameWithOnePlayer;
      playersCount = 2;
    } else {
      // Create a new game with the current user
      game = new Game({
        players: [user._id],
        grid: Array(10)
          .fill()
          .map(() => Array(10).fill(null)),
      });
      await game.save();
      playersCount = 1;
    }
  } else {
    playersCount = game.players.length;
  }

  res.render("game", { user, game, playersCount });
});

router.post("/place-monster", async (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ message: "Unauthorized" });

  const user = req.user;
  const { x, y } = req.body;

  try {
    const game = await Game.findOne({ players: user._id, status: "ongoing" });
    if (!game) return res.status(404).json({ message: "Game not found" });

    // Check if it's the player's turn
    if (game.turn.toString() !== user._id.toString()) {
      return res.status(400).json({ message: "Not your turn" });
    }

    // Check if the cell is valid to place monster
    const isValidCell = validateCell(game.grid, x, y);
    if (!isValidCell) {
      return res.status(400).json({ message: "Invalid cell" });
    }

    // Update the game grid with placed monster
    game.grid[x][y] = user.username;

    // Update turn and save game
    const nextPlayerIndex =
      (game.players.indexOf(user._id) + 1) % game.players.length;
    game.turn = game.players[nextPlayerIndex];
    await game.save();

    res.status(200).json({ message: "Monster placed successfully", game });
  } catch (error) {
    console.error("Error placing monster:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
