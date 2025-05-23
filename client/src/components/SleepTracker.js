import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import TipsStar from "../TipsStar";
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
  const [authFields, setAuthFields] = useState({ username: "", password: "", dob: "" });

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

  useEffect(() => {
  if (user && user.age != null) {
    setAge(user.age.toString()); // Ensure it's a string if age input is bound to a text/number input
  }
}, [user]);

  const getSleepRangeByAge = (age) => {
    if (age >= 1 && age <= 2) return [12, 14];
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
    if (!selectedRecommendation) {
      // Show a styled popup if no time is selected
      const popup = document.createElement("div");
      popup.innerText = "Please select a time.";
      Object.assign(popup.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#333", // Match app's dark theme
        color: "white",
        padding: "20px 30px",
        borderRadius: "10px",
        boxShadow: "0 0 20px rgba(192, 132, 252, 0.6)", // Purple glow
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: "16px",
        textAlign: "center",
        zIndex: 2000,
        animation: "fadeIn 0.3s ease",
      });

      document.body.appendChild(popup);

      // Remove the popup after 2 seconds
      setTimeout(() => {
        popup.style.animation = "fadeOut 0.3s ease";
        popup.addEventListener("animationend", () => popup.remove());
      }, 2000);

      return;
    }

    if (!user) {
      // Show a styled popup if the user is not logged in
      const popup = document.createElement("div");
      popup.innerHTML = `
        <p style="margin: 0; font-size: 16px; font-weight: bold;">You must be logged in to log sleep data.</p>
        <button style="
          margin-top: 15px;
          padding: 10px 20px;
          background-color: #7e22ce;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(192, 132, 252, 0.6);
          text-transform: uppercase;
          transition: transform 0.2s ease;
        " onmouseover="this.style.boxShadow='0 0 15px rgba(192, 132, 252, 0.8)'" onmouseout="this.style.boxShadow='0 0 10px rgba(192, 132, 252, 0.6)'" onclick="document.body.removeChild(this.parentElement)">Close</button>
      `;
      Object.assign(popup.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#333", // Match app's dark theme
        color: "white",
        padding: "20px 30px",
        borderRadius: "10px",
        boxShadow: "0 0 20px rgba(192, 132, 252, 0.6)", // Purple glow
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textAlign: "center",
        zIndex: 2000,
        animation: "fadeIn 0.3s ease",
      });

      document.body.appendChild(popup);

      return;
    }

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
      // Try to extract error message from response
    let errorMsg = "Failed to authenticate";
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMsg = errorData.error;
      }
    } catch (e) {
      console.error("Failed to parse error response:", e);
    }

    alert(errorMsg);
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
            <span 
            style={{
              color: "#7e22ce",
              padding: "10px 15px", 
              fontSize: "18px"}}
            >
              Welcome, {user.username}</span>
            <button
              onClick={logout}
              style={{
                backgroundColor: "#7e22ce", // Match purple theme
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 15px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(192, 132, 252, 0.6)", // Glow effect
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 15px rgba(192, 132, 252, 0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 10px rgba(192, 132, 252, 0.6)")}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <button
              onClick={() => setShowLoginPopup(true)}
              style={{
                backgroundColor: "#7e22ce", // Match purple theme
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 15px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(192, 132, 252, 0.6)", // Glow effect
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 15px rgba(192, 132, 252, 0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 10px rgba(192, 132, 252, 0.6)")}
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
            backgroundColor: "rgba(0,0,0,0.8)", // Darker overlay
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.5s ease", // Fade-in animation
          }}
        >
          <div
            style={{
              backgroundColor: "#333", // Match app's dark theme
              padding: "30px",
              borderRadius: "10px",
              position: "relative",
              width: "350px",
              boxShadow: "0 0 20px rgba(192, 132, 252, 0.6)", // Purple glow
              color: "white",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              display: "flex",
              flexDirection: "column",
              alignItems: "center", // Center content horizontally
              animation: "scaleIn 0.5s ease", // Scale-in animation
            }}
          >
            <button
              onClick={closePopup}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "18px",
                color: "#c084fc", // Purple close button
                cursor: "pointer",
                transition: "transform 0.2s ease", // Button click animation
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              &times;
            </button>

            <h3
              style={{
                textAlign: "center",
                textTransform: "uppercase",
                fontWeight: "bold",
                marginBottom: "20px",
                fontSize: "20px",
              }}
            >
              {authMode === "login" ? "Login" : "Register"}
            </h3>

            <input
              type="text"
              placeholder="Username"
              value={authFields.username}
              onChange={(e) => setAuthFields({ ...authFields, username: e.target.value })}
              style={{
                width: "100%",
                maxWidth: "300px", // Ensure consistent width
                marginBottom: "15px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "#222",
                color: "white",
                outline: "none",
                fontSize: "16px",
                textAlign: "center", // Center text inside input
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid #c084fc")}
              onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
            />
            <input
              type="password"
              placeholder="Password"
              value={authFields.password}
              onChange={(e) => setAuthFields({ ...authFields, password: e.target.value })}
              style={{
                width: "100%",
                maxWidth: "300px", // Ensure consistent width
                marginBottom: "10px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "#222",
                color: "white",
                outline: "none",
                fontSize: "16px",
                textAlign: "center", // Center text inside input
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid #c084fc")}
              onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
            />

            {authMode === "register" && (
            <input
            type="date"
            placeholder="Date of Birth"
            value={authFields.dob || ""}
            onChange={(e) => setAuthFields({ ...authFields, dob: e.target.value })}
            style={{
                width: "100%",
                maxWidth: "300px", // Ensure consistent width
                marginBottom: "10px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "#222",
                color: "white",
                outline: "none",
                fontSize: "16px",
                textAlign: "center", // Center text inside input
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid #c084fc")}
              onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
            />
            )}

            {authMode === "register" && (
              <p
                style={{
                  color: "#c084fc", // Purple text
                  fontSize: "18px",
                  textAlign: "center",
                  marginBottom: "15px",
                }}
              >
                The password must contain at least a number and a special character.
              </p>
            )}

            <button
              onClick={handleAuth}
              style={{
                width: "100%",
                maxWidth: "300px", // Ensure consistent width
                padding: "12px",
                backgroundColor: "#7e22ce", // Purple button
                color: "white",
                marginBottom: "15px",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(192, 132, 252, 0.6)", // Glow effect
                textTransform: "uppercase",
                transition: "transform 0.2s ease", // Button click animation
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {authMode === "login" ? "Login" : "Register"}
            </button>
            <button
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              style={{
                width: "100%",
                maxWidth: "300px", // Ensure consistent width
                padding: "12px",
                backgroundColor: "#444", // Darker button for secondary action
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "transform 0.2s ease", // Button click animation
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
        Your age:
      </span>
    </label>
    {!user ? (
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        style={{
          width: "100%",
          maxWidth: "250px",
          textAlign: "center",
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
        onFocus={(e) => (e.target.style.border = "1px solid #c084fc")}
        onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
      />
    ) : (
      <p
        style={{
          textAlign: "center",
          fontSize: "18px",
          fontWeight: "normal",
          marginTop: "10px",
        }}
      >
        {user.age}
      </p>
    )}
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
          textAlign: "center",
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
<button
  onClick={() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setBedtime(`${hours}:${minutes}`);
  }}
  style={{
    width: "100%",
    maxWidth: "250px",
    margin: "10px auto 0 auto",
    display: "block",
    backgroundColor: "#7e22ce", // Viola scuro come il bottone "GET RECOMMENDATIONS"
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 0 8px rgba(192, 132, 252, 0.6)", // Glow viola chiaro (#c084fc)
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  }}
  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 12px rgba(192, 132, 252, 0.8)"}
  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 8px rgba(192, 132, 252, 0.6)"}
  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
>
  GO TO BED NOW
</button>
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
          textAlign: "center",
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
        textAlign: "center", 
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
      transition: "background-color 0.3s ease",
    }}
    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
          transition: "background-color 0.3s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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


<div>
  <TipsStar tip = "limit caffeine in the afternoon!" left = "6%" top = "15%"></TipsStar>
  <TipsStar tip = "try to not use your devices 1 hour before bed" left = "14%" top = "30%"></TipsStar>
  <TipsStar tip = "try to wake up at the same time everyday!" left = "14%" top = "45%"></TipsStar>
  <TipsStar tip = "block out sources of light!" left = "6%" top = "73%"></TipsStar>
  <TipsStar tip = "take a warm shower or bath an hours before bed" left = "16%" top = "60%"></TipsStar>
  <TipsStar tip = "daily exercise of 20 minutes can improve your sleep!" left = "27%" top = "84%"></TipsStar>
  <TipsStar tip = "try to have some light exposure for at least 30 minutes a day" left = "15%" top = "94%"></TipsStar>
  <TipsStar tip = "use relaxing techniques, we can help you find some! scroll down" left = "72%" top = "15%"></TipsStar>
  <TipsStar tip = "can't fall asleep? try getting out of bed and do something relaxing!" left = "81%" top = "15%"></TipsStar>
  <TipsStar tip = "try to eat dinner a few hours before bed!" left = "72%" top = "25%"></TipsStar>
  <TipsStar tip = "need a late snack? try to keep it light!" left = "79%" top = "25%"></TipsStar>
  <TipsStar tip = "reserve your bed for sleep only" left = "85%" top = "37%"></TipsStar>
  <TipsStar tip = "keep naps around 20 minutes!" left = "90%" top = "50%"></TipsStar>
</div>

<div 
class = "polar-star">
  <svg viewBox="0 0 100 100" class="polar-svg" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 60,50 50,90 40,50" />
    <polygon points="10,50 50,60 90,50 50,40" />
  </svg>
  <div class = "polar-tip">follow your sleep cycles!</div>
</div>


<div  class = "text-tips">
  Want some tips? Touch the stars!
</div>








</div>
);
}

export default SleepTracker;

// Tooltip hover CSS and animations (preferably move to App.css or a global stylesheet)
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
  }
  to {
    transform: scale(1);
  }

}

.tooltip-alarm:hover div,
.tooltip-bedtime:hover div {
  visibility: visible !important;
  opacity: 1 !important;
  transform: translateY(-50%) scale(1);
}
`;
document.head.appendChild(style);