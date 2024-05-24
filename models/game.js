const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MonsterSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  player: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const CellSchema = new Schema({
  monster: { type: MonsterSchema, default: null },
});

const GameSchema = new Schema(
  {
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    grid: [[{ type: CellSchema, default: {} }]],
    status: { type: String, default: "ongoing" },
    turn: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", GameSchema);
module.exports = Game;
