const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/sleepTracker", { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Could not connect to MongoDB", err));  

// Define Sleep Log Schema
const SleepLogSchema = new mongoose.Schema({
  date: String,
  hours: Number,
});

const SleepLog = mongoose.model("SleepLog", SleepLogSchema);

// API Endpoints
app.get("/api/sleepLogs", async (req, res) => {
  const logs = await SleepLog.find();
  res.json(logs);
});

app.post("/api/sleepLogs", async (req, res) => {
  const newLog = new SleepLog(req.body);
  await newLog.save();
  res.status(201).json(newLog);
});

app.delete("/api/sleepLogs", async (req, res) => {
  try {
    // Assuming you're using MongoDB (Mongoose)
    await SleepLog.deleteMany({}); // Deletes all sleep logs
    res.json({ message: "All sleep logs deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear sleep logs" });
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));