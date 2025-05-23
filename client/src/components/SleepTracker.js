import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import '../App.css';

function SleepTracker() {
  const [mode, setMode] = useState("bedtime");
  const [bedtime, setBedtime] = useState("");
  const [alarmTime, setAlarmTime] = useState("");
  const [fallAsleepTime, setFallAsleepTime] = useState(15);
  const [age, setAge] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState("");
  const [hoveredRecommendation, setHoveredRecommendation] = useState(null);
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
    <div
      className="bg-neutral-950"
      style={{ backgroundColor: "#000", minHeight: "100vh", padding: "40px", fontFamily: "Arial, sans-serif" }}
    >
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

<h1 className="deep-sleep-title">
  DeepSleep
</h1>

<div style={{
  maxWidth: "500px",
  margin: "0 auto",
  backgroundColor: "#696969", // light gray
  padding: "30px",
  borderRadius: "10px",
  boxShadow: "0 0 20px #c084fc", // purple glow
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  color: "white"
}}>
  <div style={{
    marginBottom: "25px",
    borderBottom: "1px solid black",
    paddingBottom: "20px"
  }}>
    <label>
      <span style={{
        display: "block",
        textAlign: "center",
        marginBottom: "10px",
        fontWeight: "bold",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textTransform: "uppercase"
      }}>
        Age:
      </span>
    </label>
    <input
      type="number"
      value={age}
      onChange={(e) => setAge(e.target.value)}
      style={{
        width: "100%",
        maxWidth: "250px",
        margin: "0 auto",
        display: "block",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        backgroundColor: "#333",
        color: "white",
        outline: "none",
        fontSize: "18px",
        transition: "all 0.3s",
      }}
      onFocus={(e) => e.target.style.border = "1px solid #c084fc"}
      onBlur={(e) => e.target.style.border = "1px solid #ccc"}
    />
  </div>

  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", gap: "15px" }}>
    <div style={{ position: "relative", display: "inline-block" }} className="tooltip-alarm">
      <span
        style={{
          fontWeight: "bold",
          textTransform: "uppercase",
          textShadow: mode === "alarm" ? "0 0 8px #c084fc" : "none",
          transition: "text-shadow 0.3s ease",
        }}
      >
        Alarm Mode
      </span>
      <div style={{
        visibility: "hidden",
        opacity: 0,
        transform: "translateY(-50%) scale(0.85)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(192, 132, 252, 0.3)",
        backgroundColor: "rgba(99, 33, 99, 0.7)",
        padding: "10px 15px",
        fontSize: "13px",
        fontWeight: "700",
        textTransform: "uppercase",
        color: "#eee",
        textAlign: "center",
        position: "absolute",
        zIndex: 10,
        width: "220px",
        top: "50%",
        left: "-260px",
        marginLeft: 0,
        userSelect: "none"
      }}>
        Calculates when to go to bed for a given alarm time.
      </div>
    </div>
    <div
      onClick={() => setMode(mode === "bedtime" ? "alarm" : "bedtime")}
      style={{
        width: "60px",
        height: "30px",
        borderRadius: "15px",
        backgroundColor: "#333",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)"
      }}
    >
      <div style={{
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        backgroundColor: "#c084fc",
        position: "absolute",
        top: "2px",
        left: mode === "bedtime" ? "32px" : "2px",
        transition: "left 0.3s ease"
      }} />
    </div>
    <div style={{ position: "relative", display: "inline-block" }} className="tooltip-bedtime">
      <span
        style={{
          fontWeight: "bold",
          textTransform: "uppercase",
          textShadow: mode === "bedtime" ? "0 0 8px #c084fc" : "none",
          transition: "text-shadow 0.3s ease",
        }}
      >
        Bedtime Mode
      </span>
      <div style={{
        visibility: "hidden",
        opacity: 0,
        transform: "translateY(-50%) scale(0.85)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(192, 132, 252, 0.3)",
        backgroundColor: "rgba(99, 33, 99, 0.7)",
        padding: "10px 15px",
        fontSize: "13px",
        fontWeight: "700",
        textTransform: "uppercase",
        color: "#eee",
        textAlign: "center",
        position: "absolute",
        zIndex: 10,
        width: "220px",
        top: "50%",
        left: "calc(100% + 20px)",
        marginLeft: 0,
        userSelect: "none"
      }}>
        Calculates the best wake-up time based on your bedtime.
      </div>
    </div>
  </div>

  <div
    style={mode === "bedtime" ?
      {
        opacity: 1,
        height: "auto",
        overflow: "hidden",
        transition: "opacity 0.5s ease, height 0.5s ease",
        pointerEvents: "auto"
      } :
      {
        opacity: 0,
        height: 0,
        overflow: "hidden",
        transition: "opacity 0.5s ease, height 0.5s ease",
        pointerEvents: "none"
      }
    }
  >
    <div style={{
      marginBottom: "25px",
      borderBottom: "1px solid black",
      paddingBottom: "20px"
    }}>
      <label>
        <span style={{
          display: "block",
          textAlign: "center",
          marginBottom: "10px",
          fontWeight: "bold",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          textTransform: "uppercase"
        }}>
          Bedtime:
        </span>
      </label>
      <input
        type="time"
        value={bedtime}
        onChange={(e) => setBedtime(e.target.value)}
        style={{
          width: "100%",
          maxWidth: "250px",
          margin: "0 auto",
          display: "block",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          backgroundColor: "#333",
          color: "white",
          outline: "none",
          fontSize: "18px",
          transition: "all 0.3s",
        }}
        onFocus={(e) => e.target.style.border = "1px solid #c084fc"}
        onBlur={(e) => e.target.style.border = "1px solid #ccc"}
      />
    </div>
  </div>
  <div
    style={mode === "alarm" ?
      {
        opacity: 1,
        height: "auto",
        overflow: "hidden",
        transition: "opacity 0.5s ease, height 0.5s ease",
        pointerEvents: "auto"
      } :
      {
        opacity: 0,
        height: 0,
        overflow: "hidden",
        transition: "opacity 0.5s ease, height 0.5s ease",
        pointerEvents: "none"
      }
    }
  >
    <div style={{
      marginBottom: "25px",
      borderBottom: "1px solid black",
      paddingBottom: "20px"
    }}>
      <label>
        <span style={{
          display: "block",
          textAlign: "center",
          marginBottom: "10px",
          fontWeight: "bold",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          textTransform: "uppercase"
        }}>
          Alarm Time:
        </span>
      </label>
      <input
        type="time"
        value={alarmTime}
        onChange={(e) => setAlarmTime(e.target.value)}
        style={{
          width: "100%",
          maxWidth: "250px",
          margin: "0 auto",
          display: "block",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          backgroundColor: "#333",
          color: "white",
          outline: "none",
          fontSize: "18px",
          transition: "all 0.3s",
        }}
        onFocus={(e) => e.target.style.border = "1px solid #c084fc"}
        onBlur={(e) => e.target.style.border = "1px solid #ccc"}
      />
    </div>
  </div>

  <div style={{
    marginBottom: "25px",
    borderBottom: "1px solid black",
    paddingBottom: "20px"
  }}>
    <label>
      <span style={{
        display: "block",
        textAlign: "center",
        marginBottom: "10px",
        fontWeight: "bold",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textTransform: "uppercase"
      }}>
        Time to fall asleep (min):
      </span>
    </label>
    <input
      type="number"
      value={fallAsleepTime}
      onChange={(e) => setFallAsleepTime(Number(e.target.value))}
      style={{
        width: "100%",
        maxWidth: "250px",
        margin: "0 auto",
        display: "block",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        backgroundColor: "#333",
        color: "white",
        outline: "none",
        fontSize: "18px",
        transition: "all 0.3s",
      }}
      onFocus={(e) => e.target.style.border = "1px solid #c084fc"}
      onBlur={(e) => e.target.style.border = "1px solid #ccc"}
    />
  </div>

  <button
    onClick={calculateTimes}
    style={{
      width: "100%",
      marginTop: "10px",
      backgroundColor: "#7e22ce",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "12px",
      fontWeight: "bold",
      fontSize: "16px",
      cursor: "pointer",
      boxShadow: "0 0 10px #7e22ce",
      transition: "background-color 0.3s ease"
    }}
  >
    GET RECOMMENDATIONS
  </button>

  {recommendations.length > 0 && (
    <>
      <h3
        style={{
          textTransform: "uppercase",
          textAlign: "center",
          fontSize: "18px"
        }}
      >
        Suggested {mode === "bedtime" ? "Wake Times" : "Bedtimes"}:
      </h3>
      <ul
        style={{
          display: "block",
          width: "100%",
          maxWidth: "220px",
          margin: "20px auto 0 auto",
          paddingLeft: 0,
          listStyleType: "none",
          textAlign: "center",
          fontSize: "14px"
        }}
      >
        {recommendations.map((time, index) => {
          const isCentral = index === Math.floor(recommendations.length / 2);
          const isHovered = hoveredRecommendation === time;
          const enlarge =
  isHovered ||
  (!hoveredRecommendation && selectedRecommendation === time) ||
  (!hoveredRecommendation && !selectedRecommendation && isCentral);
          return (
            <li
              key={index}
              style={{
                display: "block",
                width: "100%",
                cursor: "pointer",
                fontWeight: enlarge ? "bold" : "normal",
                textTransform: "uppercase",
                fontSize: enlarge ? "16px" : "14px",
                transform: `scale(${enlarge ? 1.1 : 1})`,
                boxShadow: enlarge ? "0 0 12px #c084fc" : "none",
                background: selectedRecommendation === time ? "#c084fc33" : "transparent",
                borderRadius: "8px",
                padding: "6px 12px",
                transition: "all 0.3s ease",
                textAlign: "center",
                whiteSpace: "nowrap",
                minWidth: "150px",

              }}
              onClick={() => setSelectedRecommendation(time)}
              onMouseEnter={() => setHoveredRecommendation(time)}
              onMouseLeave={() => setHoveredRecommendation(null)}
            >
              {time} {isCentral ? "(RECOMMENDED)" : ""}
            </li>
          );
        })}
      </ul>
      <button
        onClick={confirmSelection}
        style={{
          marginTop: "10px",
          width: "100%",
          backgroundColor: "#111",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "12px",
          fontWeight: "bold",
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: "0 0 10px #222",
          transition: "background-color 0.3s ease"
        }}
      >
        CONFIRM SELECTION
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

// Tooltip hover CSS (preferably move to App.css or a global stylesheet)
const style = document.createElement("style");
style.innerHTML = `
.tooltip-alarm:hover div,
.tooltip-bedtime:hover div {
  visibility: visible !important;
  opacity: 1 !important;
  transform: translateY(-50%) scale(1);
}
`;
document.head.appendChild(style);
