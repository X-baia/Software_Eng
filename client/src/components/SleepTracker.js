import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Main SleepTracker component
function SleepTracker() {
  // State hooks for inputs and data
  const [mode, setMode] = useState("bedtime"); // 'bedtime' or 'alarm' mode
  const [bedtime, setBedtime] = useState(""); // User input for bedtime
  const [alarmTime, setAlarmTime] = useState(""); // User input for alarm time
  const [fallAsleepTime, setFallAsleepTime] = useState(15); // Time (in minutes) it takes to fall asleep
  const [age, setAge] = useState(""); // User's age
  const [recommendations, setRecommendations] = useState([]); // Calculated bedtime/alarm time options
  const [selectedRecommendation, setSelectedRecommendation] = useState(""); // User's selected recommended time
  const [sleepLog, setSleepLog] = useState([]); // Logged sleep history

  // Fetch sleep logs from backend on component mount
  useEffect(() => {
    fetch("http://localhost:5001/api/sleepLogs")
      .then((res) => res.json())
      .then((data) => setSleepLog(data));
  }, []);

  // Returns [min, max] sleep hours recommended for given age
  const getSleepRangeByAge = (age) => {
    if (age >= 1 && age <= 2) return [11, 14];
    if (age >= 3 && age <= 5) return [10, 13];
    if (age >= 6 && age <= 12) return [9, 12];
    if (age >= 13 && age <= 18) return [8, 10];
    return [7, 9]; // adults
  };

  // Calculate recommended times based on mode
  const calculateTimes = () => {
    if (!age || isNaN(age)) {
      alert("Please enter a valid age.");
      return;
    }

    const [minSleep, maxSleep] = getSleepRangeByAge(Number(age));
    const sleepCycle = 90; // minutes per cycle
    const minCycles = Math.floor((minSleep * 60) / sleepCycle);
    const maxCycles = Math.ceil((maxSleep * 60) / sleepCycle);

    let times = [];

    if (mode === "bedtime") {
      // Calculate recommended wake-up times
      const bedtimeDate = new Date(`2024-01-01T${bedtime}:00`);
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);

      for (let i = minCycles; i <= maxCycles; i++) {
        const wakeTime = new Date(bedtimeDate);
        wakeTime.setMinutes(bedtimeDate.getMinutes() + i * sleepCycle);
        times.push(
          wakeTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        );
      }
    } else {
      // Calculate recommended bedtimes
      const alarmDate = new Date(`2024-01-01T${alarmTime}:00`);
      for (let i = maxCycles; i >= minCycles; i--) {
        const bedtimeEstimate = new Date(alarmDate);
        bedtimeEstimate.setMinutes(
          alarmDate.getMinutes() - i * sleepCycle - fallAsleepTime
        );
        times.push(
          bedtimeEstimate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        );
      }
    }

    setRecommendations(times);
    setSelectedRecommendation("");
  };

  // Confirm the selected time and log it with calculated sleep duration
  const confirmSelection = async () => {
    if (!selectedRecommendation) {
      alert("Please select a time before confirming.");
      return;
    }

    // Convert 12-hour format to 24-hour hours and minutes
    const parseTimeString = (timeStr) => {
      const [time, modifier] = timeStr.trim().split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    };

    let sleepDurationHours = 0;

    if (mode === "bedtime") {
      // Bedtime mode: user chooses bedtime, calculate duration to recommended wake time
      const bedtimeDate = new Date("2024-01-01T" + bedtime + ":00");
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);

      const { hours, minutes } = parseTimeString(selectedRecommendation);
      const wakeTime = new Date("2024-01-01T00:00:00");
      wakeTime.setHours(hours, minutes, 0, 0);
      if (wakeTime <= bedtimeDate) {
        wakeTime.setDate(wakeTime.getDate() + 1); // Adjust for next day
      }

      sleepDurationHours = (wakeTime - bedtimeDate) / (1000 * 60 * 60);
    } else {
      // Alarm mode: user chooses alarm time, calculate duration from selected bedtime
      const alarmDate = new Date("2024-01-01T" + alarmTime + ":00");

      const { hours, minutes } = parseTimeString(selectedRecommendation);
      const bedtimeDate = new Date("2024-01-01T00:00:00");
      bedtimeDate.setHours(hours, minutes, 0, 0);
      bedtimeDate.setMinutes(bedtimeDate.getMinutes() + fallAsleepTime);
      if (alarmDate <= bedtimeDate) {
        alarmDate.setDate(alarmDate.getDate() + 1); // Adjust for next day
      }

      sleepDurationHours = (alarmDate - bedtimeDate) / (1000 * 60 * 60);
    }

    sleepDurationHours = parseFloat(sleepDurationHours.toFixed(2));
    if (isNaN(sleepDurationHours) || sleepDurationHours <= 0) {
      alert("Failed to calculate sleep duration. Please check your inputs.");
      return;
    }

    const log = {
      date: new Date().toLocaleDateString(),
      hours: sleepDurationHours,
      selectedTime: selectedRecommendation,
      mode: mode,
    };

    // Send log to backend
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

  // Clears all sleep history data from backend
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

  // --- JSX Rendering ---
  return (
    <div style={{ backgroundColor: "#e6f2ff", minHeight: "100vh", padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "500px", margin: "auto", backgroundColor: "#ffffff", padding: "30px", borderRadius: "20px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)" }}>
        
        <img src="/sleep_icon.png" alt="Sleep Icon" style={{ width: "100px", display: "block", margin: "0 auto 20px" }} />

        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Sleep Tracker</h2>
        <p style={{ textAlign: "center", fontSize: "14px", color: "#444" }}>
          Your personalized assistant for optimizing sleep based on your age and needs!
        </p>

        {/* Input fields */}
        <label>Age:</label>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" style={{ display: "block", width: "100%", marginBottom: "10px" }} />

        <label>Mode:</label>
        <select value={mode} onChange={(e) => { setMode(e.target.value); setRecommendations([]); }} style={{ display: "block", width: "100%", marginBottom: "10px" }}>
          <option value="bedtime">Bedtime Mode (Suggest Alarm)</option>
          <option value="alarm">Alarm Mode (Suggest Bedtime)</option>
        </select>

        {/* Bedtime or Alarm input depending on mode */}
        {mode === "bedtime" ? (
          <>
            <label>Bedtime:</label>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} style={{ display: "block", width: "100%", marginBottom: "10px" }} />
          </>
        ) : (
          <>
            <label>Alarm Time:</label>
            <input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} style={{ display: "block", width: "100%", marginBottom: "10px" }} />
          </>
        )}

        <label>Time to Fall Asleep (min):</label>
        <input type="number" value={fallAsleepTime} onChange={(e) => setFallAsleepTime(Math.max(0, parseInt(e.target.value) || 0))} min="0" style={{ display: "block", width: "100%", marginBottom: "20px" }} />

        <button onClick={calculateTimes} style={{ width: "100%", padding: "12px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "30px", marginBottom: "10px", cursor: "pointer" }}>
          {mode === "bedtime" ? "Calculate Alarm Times" : "Calculate Bedtimes"}
        </button>

        {/* Recommendations list and confirm button */}
        {recommendations.length > 0 && (
          <div>
            <h3>{mode === "bedtime" ? "Recommended Alarm Times:" : "Recommended Bedtimes:"}</h3>
            {recommendations.map((time, index) => (
              <div key={index} style={{ marginBottom: "6px" }}>
                <input type="radio" name="suggestion" value={time} checked={selectedRecommendation === time} onChange={(e) => setSelectedRecommendation(e.target.value)} />
                <label style={{ marginLeft: "8px" }}>{time}</label>
              </div>
            ))}

            <button onClick={confirmSelection} style={{ width: "100%", padding: "10px", backgroundColor: "#FF9900", color: "white", border: "none", borderRadius: "30px", marginTop: "10px", cursor: "pointer" }}>
              Confirm Selection
            </button>
          </div>
        )}

        {/* Clear data button */}
        <button onClick={clearSleepData} style={{ width: "100%", padding: "12px", backgroundColor: "red", color: "white", border: "none", borderRadius: "30px", marginTop: "20px", cursor: "pointer" }}>
          Clear Sleep Data
        </button>

        {/* Graph of sleep log */}
        <h3 style={{ marginTop: "30px" }}>Sleep History</h3>
        <div style={{ width: "100%", height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sleepLog}>
              <XAxis dataKey="date" />
              <YAxis dataKey="hours"/>
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
