const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// === CONFIGURATION ===
const app = express();
const PORT = 5001;
const JWT_SECRET = "super_secure_jwt_secret"; // Replace with env variable in production

// === MIDDLEWARE ===
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// === MONGODB CONNECTION ===
mongoose.connect("mongodb://localhost:27017/sleepTracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

// === SCHEMAS ===
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const sleepLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  date: String,
  hours: Number,
  selectedTime: String,
  mode: String,
});

const User = mongoose.model("User", userSchema);
const SleepLog = mongoose.model("SleepLog", sleepLogSchema);

// === AUTH MIDDLEWARE ===
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// === AUTH ROUTES ===

// Register
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: "Username already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.status(201).json({ message: "User registered" });
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: "2d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: false // Set to true in production with HTTPS
  });
  res.json({ message: "Logged in" });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// Get current user info
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// === SLEEP LOG ROUTES ===

// Get all logs for authenticated user
app.get("/api/sleepLogs", authMiddleware, async (req, res) => {
  const logs = await SleepLog.find({ userId: req.user.id });
  res.json(logs);
});

//da togliere prima di rendere pubblica la webapp
app.get("/api/users", (req, res) => {
  // WARNING: only expose this in development/testing!
  res.json(users.map(u => ({ username: u.username })));
});

// Create new log
app.post("/api/sleepLogs", authMiddleware, async (req, res) => {
  const log = new SleepLog({ ...req.body, userId: req.user.id });
  await log.save();
  res.status(201).json(log);
});

// Delete all logs for this user
app.delete("/api/sleepLogs", authMiddleware, async (req, res) => {
  await SleepLog.deleteMany({ userId: req.user.id });
  res.json({ message: "Sleep logs cleared" });
});

// === SERVER START ===
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
