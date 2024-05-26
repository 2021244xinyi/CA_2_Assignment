const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MonsterSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
});

const CellSchema = new Schema({
  monster: { type: MonsterSchema, default: null },
});

const GameSchema = new Schema(
  {
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    grid: [[{ type: CellSchema, default: {} }]],
    status: { type: String, default: "ongoing" },
    turn: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", GameSchema);
module.exports = Game;
