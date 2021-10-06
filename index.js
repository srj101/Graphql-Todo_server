const { application } = require("express");
const { GraphQLServer, PubSub } = require("graphql-yoga");
const mongoose = require("mongoose");
const Todo = require("./models/todo.model.js");
const cors = require("cors");
mongoose.connect(
  "mongodb+srv://srjoy:sI3ukqsCx0W93gKR@cluster0.qgh6h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
);

const pubsub = new PubSub();
const typeDefs = `

  type Subscription {
    somethingChanged: [Todo]!
  }

  type Query {
    hello(name: String): String!
    todos : [Todo]
  }

  type Todo {
      id: ID
      text: String!
      complete: Boolean!
  }

  type Mutation {
      createTodo(text:String!) : Todo!
      updateTodo(id: ID!,complete: Boolean) : Todo
      removeTodo(id:ID!): Boolean
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }

`;

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || "World"}`,
    todos: async () => Todo.find(),
  },
  Mutation: {
    createTodo: async (_, { text }) => {
      const todo = new Todo({ text, complete: false });
      await todo.save();
      const allTodos = await Todo.find();
      await pubsub.publish("something_changed", {
        somethingChanged: allTodos,
      });
      return todo;
    },
    updateTodo: async (_, { id, complete }) => {
      const updated_todo = await Todo.findByIdAndUpdate(
        id,
        { complete },
        { new: true }
      );

      const allTodos = await Todo.find();
      await pubsub.publish("something_changed", {
        somethingChanged: allTodos,
      });

      return updated_todo;
    },
    removeTodo: async (_, { id }) => {
      await Todo.findByIdAndRemove(id);
      const allTodos = await Todo.find();
      await pubsub.publish("something_changed", {
        somethingChanged: allTodos,
      });
      return true;
    },
  },
  Subscription: {
    somethingChanged: {
      subscribe(parent, args, { pubsub }) {
        return pubsub.asyncIterator("something_changed");
      },
    },
  },
};

const server = new GraphQLServer({ typeDefs, resolvers, context: { pubsub } });

server.use(cors());
const options = {
  port: process.env.PORT || 5000,
};

mongoose.connection.once("open", () => {
  console.log("Database connected");
  server.start(options, ({ port }) =>
    console.log(`Server is running on localhost:${port}`)
  );
});
