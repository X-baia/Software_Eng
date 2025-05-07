// Import required packages
const express = require("express");           // Web framework to handle routing and server logic
const mongoose = require("mongoose");         // ODM for MongoDB to define schemas and interact with the database
const cors = require("cors");                 // Middleware to enable cross-origin resource sharing

// Initialize the Express app
const app = express();

// Middleware setup
app.use(cors());               // Allow cross-origin requests (e.g., from localhost:3000 to localhost:5001)
app.use(express.json());       // Parse incoming JSON requests into JS objects

// Connect to MongoDB using Mongoose
mongoose.connect("mongodb://localhost:27017/sleepTracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))               // Connection successful
.catch(err => console.error("Could not connect to MongoDB", err)); // Connection failed

// Define the schema (structure) for a sleep log entry
const SleepLogSchema = new mongoose.Schema({
  date: String,               // Stores the date of the log (e.g., "04/30/2025")
  hours: Number,              // Stores the number of hours slept
});

// Create a model from the schema
const SleepLog = mongoose.model("SleepLog", SleepLogSchema);

// === API Endpoints ===

// GET all sleep logs
app.get("/api/sleepLogs", async (req, res) => {
  const logs = await SleepLog.find();         // Fetch all documents from the SleepLog collection
  res.json(logs);                             // Send the results as JSON to the client
});

// POST a new sleep log
app.post("/api/sleepLogs", async (req, res) => {
  const newLog = new SleepLog(req.body);      // Create a new SleepLog instance with request data
  await newLog.save();                        // Save it to the MongoDB database
  res.status(201).json(newLog);               // Respond with the saved log and status code 201 (Created)
});

// DELETE all sleep logs
app.delete("/api/sleepLogs", async (req, res) => {
  try {
    await SleepLog.deleteMany({});            // Delete all documents in the SleepLog collection
    res.json({ message: "All sleep logs deleted successfully." }); // Respond with success message
  } catch (error) {
    res.status(500).json({ error: "Failed to clear sleep logs" }); // Respond with error if deletion fails
  }
});

// Start the server on port 5001
app.listen(5001, () => console.log("Server running on port 5001")); // Log a message to confirm the server is running
