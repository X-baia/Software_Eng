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
  const [mode, setMode] = useState("bedtime"); // bedtime or alarm
  const [bedtime, setBedtime] = useState("");
  const [alarmTime, setAlarmTime] = useState("");
  const [fallAsleepTime, setFallAsleepTime] = useState(15);
  const [age, setAge] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState("");
  const [sleepLog, setSleepLog] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5001/api/sleepLogs")
      .then((res) => res.json())
      .then((data) => setSleepLog(data));
  }, []);

  const getSleepRangeByAge = (age) => {
    if (age >= 1 && age <= 2) return [11, 14];
    if (age >= 3 && age <= 5) return [10, 13];
    if (age >= 6 && age <= 12) return [9, 12];
    if (age >= 13 && age <= 18) return [8, 10];
    return [7, 9];
  };

  const calculateTimes = () => {
    if (!age || isNaN(age)) {
      alert("Please enter a valid age.");
      return;
    }

    const [minSleep, maxSleep] = getSleepRangeByAge(Number(age));
    const sleepCycle = 90;
    const minCycles = Math.floor((minSleep * 60) / sleepCycle);
    const maxCycles = Math.ceil((maxSleep * 60) / sleepCycle);

    let times = [];

    if (mode === "bedtime") {
      const bedtimeDate = new Date(`2024-01-01T${bedtime}:00`);
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);

      for (let i = minCycles; i <= maxCycles; i++) {
        const wakeTime = new Date(bedtimeDate);
        wakeTime.setMinutes(bedtimeDate.getMinutes() + i * sleepCycle);
        times.push(wakeTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } else {
      const alarmDate = new Date(`2024-01-01T${alarmTime}:00`);
      for (let i = maxCycles; i >= minCycles; i--) {
        const bedtimeEstimate = new Date(alarmDate);
        bedtimeEstimate.setMinutes(
          alarmDate.getMinutes() - i * sleepCycle - fallAsleepTime
        );
        times.push(bedtimeEstimate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    }

    setRecommendations(times);
    setSelectedRecommendation(""); // Reset selection
  };

  const confirmSelection = async () => {
    if (!selectedRecommendation) {
      alert("Please select a time before confirming.");
      return;
    }

    const log = {
      date: new Date().toLocaleDateString(),
      hours: 7.5, // Optional: Adjust this based on selectedCycles * 1.5
      selectedTime: selectedRecommendation,
      mode: mode,
    };

    const response = await fetch("http://localhost:5001/api/sleepLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });

    if (response.ok) {
      setSleepLog([...sleepLog, log]);
      alert("Sleep time logged!");
    } else {
      alert("Failed to log sleep time.");
    }
  };

  const clearSleepData = async () => {
    const response = await fetch("http://localhost:5001/api/sleepLogs", {
      method: "DELETE",
    });

    if (response.ok) {
      setSleepLog([]);
      alert("Sleep log data cleared!");
    } else {
      alert("Failed to clear sleep log data.");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#e6f2ff",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "auto",
          backgroundColor: "#ffffff",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* 💬 you have to modify this */}
        <img
          src="/sleep_icon.png"
          alt="Sleep Icon"
          style={{ width: "100px", display: "block", margin: "0 auto 20px" }}
        />

        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Sleep Tracker</h2>
        <p style={{ textAlign: "center", fontSize: "14px", color: "#444" }}>
          {/* 💬 you have to modify this */}
          Your personalized assistant for optimizing sleep based on your age and needs!
        </p>

        <label>Age:</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min="1"
          style={{ display: "block", width: "100%", marginBottom: "10px" }}
        />

        <label>Mode:</label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setRecommendations([]);
          }}
          style={{ display: "block", width: "100%", marginBottom: "10px" }}
        >
          <option value="bedtime">Bedtime Mode (Suggest Alarm)</option>
          <option value="alarm">Alarm Mode (Suggest Bedtime)</option>
        </select>

        {mode === "bedtime" ? (
          <>
            <label>Bedtime:</label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </>
        ) : (
          <>
            <label>Alarm Time:</label>
            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
          </>
        )}

        <label>Time to Fall Asleep (min):</label>
        <input
          type="number"
          value={fallAsleepTime}
          onChange={(e) =>
            setFallAsleepTime(Math.max(0, parseInt(e.target.value) || 0))
          }
          min="0"
          style={{ display: "block", width: "100%", marginBottom: "20px" }}
        />

        <button
          onClick={calculateTimes}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "30px",
            marginBottom: "10px",
            cursor: "pointer",
          }}
        >
          {mode === "bedtime" ? "Calculate Alarm Times" : "Calculate Bedtimes"}
        </button>

        {recommendations.length > 0 && (
          <div>
            <h3>
              {mode === "bedtime"
                ? "Recommended Alarm Times:"
                : "Recommended Bedtimes:"}
            </h3>
            {recommendations.map((time, index) => (
              <div key={index} style={{ marginBottom: "6px" }}>
                <input
                  type="radio"
                  name="suggestion"
                  value={time}
                  checked={selectedRecommendation === time}
                  onChange={(e) => setSelectedRecommendation(e.target.value)}
                />
                <label style={{ marginLeft: "8px" }}>{time}</label>
              </div>
            ))}

            <button
              onClick={confirmSelection}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#FF9900",
                color: "white",
                border: "none",
                borderRadius: "30px",
                marginTop: "10px",
                cursor: "pointer",
              }}
            >
              Confirm Selection
            </button>
          </div>
        )}

        <button
          onClick={clearSleepData}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "30px",
            marginTop: "20px",
            cursor: "pointer",
          }}
        >
          Clear Sleep Data
        </button>

        <h3 style={{ marginTop: "30px" }}>Sleep History</h3>
        <div style={{ width: "100%", height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sleepLog}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#3182CE" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default SleepTracker;
