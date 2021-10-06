const mongoose = require("mongoose");

const todoSchemma = new mongoose.Schema({
  text: String,
  complete: Boolean,
});

const Todo = mongoose.model("Todo", todoSchemma);

module.exports = Todo;
