const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GameSchema = new Schema(
  {
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    grid: [[{ type: String, default: null }]],
    status: { type: String, default: "ongoing" },
    turn: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", GameSchema);
module.exports = Game;
