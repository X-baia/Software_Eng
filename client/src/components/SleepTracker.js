import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function SleepTracker() {
  const [mode, setMode] = useState("bedtime");
  const [bedtime, setBedtime] = useState("");
  const [alarmTime, setAlarmTime] = useState("");
  const [fallAsleepTime, setFallAsleepTime] = useState(15);
  const [age, setAge] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState("");
  const [sleepLog, setSleepLog] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [authFields, setAuthFields] = useState({ username: "", password: "" });

  useEffect(() => {
    fetch("http://localhost:5001/api/sleepLogs", { credentials: "include" })
      .then((res) => (res.status === 401 ? [] : res.json()))
      .then(setSleepLog)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch("http://localhost:5001/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
  }, []);

  const getSleepRangeByAge = (age) => {
    if (age >= 1 && age <= 2) return [11, 14];
    if (age >= 3 && age <= 5) return [10, 13];
    if (age >= 6 && age <= 12) return [9, 12];
    if (age >= 13 && age <= 18) return [8, 10];
    return [7, 9];
  };

  const calculateTimes = () => {
    if (!age || isNaN(age)) return alert("Please enter a valid age.");
    const [minSleep, maxSleep] = getSleepRangeByAge(Number(age));
    const sleepCycle = 90;
    const minCycles = Math.floor((minSleep * 60) / sleepCycle);
    const maxCycles = Math.ceil((maxSleep * 60) / sleepCycle);
    const times = [];

    if (mode === "bedtime") {
      const bedtimeDate = new Date(`2024-01-01T${bedtime}:00`);
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);
      for (let i = minCycles; i <= maxCycles; i++) {
        const wakeTime = new Date(bedtimeDate);
        wakeTime.setMinutes(bedtimeDate.getMinutes() + i * sleepCycle);
        times.push(wakeTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }));
      }
    } else {
      const alarmDate = new Date(`2024-01-01T${alarmTime}:00`);
      for (let i = maxCycles; i >= minCycles; i--) {
        const bedtimeEstimate = new Date(alarmDate);
        bedtimeEstimate.setMinutes(alarmDate.getMinutes() - i * sleepCycle - fallAsleepTime);
        times.push(bedtimeEstimate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }));
      }
    }

    setRecommendations(times);
    setSelectedRecommendation("");
  };

  const parseTimeString = (timeStr) => {
    const [time, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  };

  const confirmSelection = async () => {
    if (!selectedRecommendation) return alert("Please select a time.");
    if (!user) return alert("You must be logged in to log sleep data.");

    let sleepDurationHours = 0;
    if (mode === "bedtime") {
      const bedtimeDate = new Date("2024-01-01T" + bedtime + ":00");
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);
      const { hours, minutes } = parseTimeString(selectedRecommendation);
      const wakeTime = new Date("2024-01-01T00:00:00");
      wakeTime.setHours(hours, minutes, 0, 0);
      if (wakeTime <= bedtimeDate) wakeTime.setDate(wakeTime.getDate() + 1);
      sleepDurationHours = (wakeTime - bedtimeDate) / (1000 * 60 * 60);
    } else {
      const alarmDate = new Date("2024-01-01T" + alarmTime + ":00");
      const { hours, minutes } = parseTimeString(selectedRecommendation);
      const bedtimeDate = new Date("2024-01-01T00:00:00");
      bedtimeDate.setHours(hours, minutes, 0, 0);
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);
      if (alarmDate <= bedtimeDate) alarmDate.setDate(alarmDate.getDate() + 1);
      sleepDurationHours = (alarmDate - bedtimeDate) / (1000 * 60 * 60);
    }

    sleepDurationHours = parseFloat(sleepDurationHours.toFixed(2));
    if (isNaN(sleepDurationHours) || sleepDurationHours <= 0) {
      alert("Invalid calculation. Check your input.");
      return;
    }

    const log = {
      date: new Date().toLocaleDateString(),
      hours: sleepDurationHours,
      selectedTime: selectedRecommendation,
      mode,
    };

    const response = await fetch("http://localhost:5001/api/sleepLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(log),
    });

    if (response.ok) {
      setSleepLog([...sleepLog, log]);
      alert("Sleep time logged!");
    } else {
      alert("You must be logged in to log data.");
    }
  };

  const clearSleepData = async () => {
    const res = await fetch("http://localhost:5001/api/sleepLogs", {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setSleepLog([]);
      alert("Sleep log data cleared!");
    }
  };

  const handleAuth = async () => {
    const endpoint = authMode === "login" ? "login" : "register";
    const res = await fetch(`http://localhost:5001/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(authFields),
    });

    if (res.ok) {
      const me = await fetch("http://localhost:5001/api/me", { credentials: "include" });
      const data = await me.json();
      setUser(data.user);
      closePopup();
    } else {
      alert("Failed to authenticate");
    }
  };

  const logout = async () => {
    await fetch("http://localhost:5001/api/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setSleepLog([]);
  };

  const closePopup = () => {
    setShowLoginPopup(false);
    setAuthFields({ username: "", password: "" });
    setAuthMode("login");
  };

  return (
    <div style={{ backgroundColor: "#e6f2ff", minHeight: "100vh", padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: 20, right: 30 }}>
        {user ? (
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <span>Welcome, {user.username}</span>
            <button
              onClick={logout}
              style={{ marginLeft: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "5px", padding: "5px 10px", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <button
              onClick={() => setShowLoginPopup(true)}
              style={{ backgroundColor: "#0275d8", color: "white", border: "none", borderRadius: "5px", padding: "5px 10px", cursor: "pointer" }}
            >
              Login / Register
            </button>
          </div>
        )}
      </div>

      {/* Login/Register Popup */}
      {showLoginPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", position: "relative", width: "300px" }}>
            <button
              onClick={closePopup}
              style={{ position: "absolute", top: "10px", right: "10px", background: "transparent", border: "none", fontSize: "18px", color: "red", cursor: "pointer" }}
            >
              &times;
            </button>

            <h3 style={{ textAlign: "center" }}>{authMode === "login" ? "Login" : "Register"}</h3>

            <input
              type="text"
              placeholder="Username"
              value={authFields.username}
              onChange={(e) => setAuthFields({ ...authFields, username: e.target.value })}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={authFields.password}
              onChange={(e) => setAuthFields({ ...authFields, password: e.target.value })}
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <button
              onClick={handleAuth}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#4CAF50",
                color: "white",
                marginBottom: "10px",
                border: "none",
                borderRadius: "5px",
              }}
            >
              {authMode === "login" ? "Login" : "Register"}
            </button>
            <button
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#FF9900",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      )}

<h1 style={{ textAlign: "center", color: "#003366", marginBottom: "30px" }}>Sleep Time Recommendation</h1>

<div style={{ maxWidth: "500px", margin: "0 auto", backgroundColor: "#ffffff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
  <div style={{ marginBottom: "15px" }}>
    <label>Age: </label>
    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
  </div>

  <div style={{ marginBottom: "15px" }}>
    <label>
      <input type="radio" value="bedtime" checked={mode === "bedtime"} onChange={() => setMode("bedtime")} />
      Bedtime Mode
    </label>
    <label style={{ marginLeft: "10px" }}>
      <input type="radio" value="alarm" checked={mode === "alarm"} onChange={() => setMode("alarm")} />
      Alarm Mode
    </label>
  </div>

  {mode === "bedtime" ? (
    <div style={{ marginBottom: "15px" }}>
      <label>Bedtime: </label>
      <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
    </div>
  ) : (
    <div style={{ marginBottom: "15px" }}>
      <label>Alarm Time: </label>
      <input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} />
    </div>
  )}

  <div style={{ marginBottom: "15px" }}>
    <label>Time to fall asleep (min): </label>
    <input type="number" value={fallAsleepTime} onChange={(e) => setFallAsleepTime(Number(e.target.value))} />
  </div>

  <button onClick={calculateTimes} style={{ width: "100%", marginTop: "10px" }}>
    Get Recommendations
  </button>

  {recommendations.length > 0 && (
    <>
      <h3>Suggested {mode === "bedtime" ? "Wake Times" : "Bedtimes"}:</h3>
      <ul>
        {recommendations.map((time, index) => (
          <li key={index} style={{ cursor: "pointer", fontWeight: selectedRecommendation === time ? "bold" : "normal" }} onClick={() => setSelectedRecommendation(time)}>
            {time}
          </li>
        ))}
      </ul>
      <button onClick={confirmSelection} style={{ marginTop: "10px" }}>
        Confirm Selection
      </button>
    </>
  )}
</div>

{user && sleepLog.length > 0 && (
  <div style={{ marginTop: "50px" }}>
    <h2 style={{ textAlign: "center" }}>Your Sleep Log</h2>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={sleepLog}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="hours" stroke="#003366" />
      </LineChart>
    </ResponsiveContainer>
    <div style={{ textAlign: "center" }}>
      <button onClick={clearSleepData} style={{ marginTop: "20px", backgroundColor: "#d9534f", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px" }}>
        Clear Log
      </button>
    </div>
  </div>
)}

    </div>
  );
}

export default SleepTracker;