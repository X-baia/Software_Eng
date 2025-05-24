const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
//security for password part
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//cookie part
const cookieParser = require("cookie-parser");
//exposed in breaches part for the registration
const axios = require("axios");
const crypto = require("crypto");
//ratelimit part for the login
const rateLimit = require("express-rate-limit");


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
  password: {type: String, required: true},
  dob : { type: Date, required: true},
  age : {type: Number, required: true},
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

// Checks if the password has been exposed in breaches
async function isPasswordBreached(password) {
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
    const breachedList = response.data.split("\r\n").map(line => line.split(":")[0]);

    return breachedList.includes(suffix);
  } catch (err) {
    console.error("HIBP password check failed", err.message);
    // You can choose to fail closed (reject) or fail open (allow)
    return false;
  }
}

//common password part
const commonPasswords = ["password123","12345678"];

app.post("/api/register", async (req, res) => {
  const { username, password, dob} = req.body;

  if (!username || !password || !dob) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (password.length > 72) {
    return res.status(400).json({ error: "Password must not exceed 72 characters" });
  }

  const passwordRegex = /^(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long and include at least one number",
    });
  }

  // Check against common weak passwords
  if (commonPasswords.includes(password.toLowerCase())) {
    return res.status(400).json({ error: "Password is too common. Choose a stronger one." });
  }

  const isBreached = await isPasswordBreached(password);
  if (isBreached) {
    return res.status(400).json({
      error: "This password has appeared in data breaches. Please choose a stronger one.",
    });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(400).json({ error: "Username already exists" });
  }

  try {
    // Calculate age
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, dob, age });
    await user.save();

    // Create JWT token for the newly registered user
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: "2d" });

    // Set the token cookie to log in the user automatically
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false, // true if using HTTPS in production
    });


    res.status(201).json({ message: "User registered succesfully and automatically logged in" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login

// Limit to 5 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  // Recalculate age based on current date and user's dob
  const birthDate = new Date(user.dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Update age in the database if it changed
  if (user.age !== age) {
    user.age = age;
    await user.save();
  }

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

// Get all users - only for development/testing!
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password").lean(); // Exclude password
    const formattedUsers = users.map(user => ({
      username: user.username,
      dob: user.dob instanceof Date
        ? user.dob.toISOString().split("T")[0]  // "YYYY-MM-DD"
        : "N/A",
        age: typeof user.age === "number" ? user.age : "N/A"
    }));
    res.json({ users: formattedUsers });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
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
