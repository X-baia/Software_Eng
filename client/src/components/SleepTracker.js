import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import TipsStar from "../TipsStar";
import '../css/Popup.css';
import '../css/App.css';
import '../css/SleepTracker.css';
import '../css/User.css';
import '../css/SleepLog.css';
import ReferenceTab from "../ReferenceTab";

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
  const [selectedLog, setSelectedLog] = useState(null);
  const [editedHours, setEditedHours] = useState("");


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

  //based on your age you ahve to sleep a certain amount of time, this returns the amount of hours based on the age range
  const getSleepRangeByAge = (age) => {
    if (age >= 1 && age <= 2) return [12, 14];
    if (age >= 3 && age <= 5) return [10, 13];
    if (age >= 6 && age <= 12) return [9, 12];
    if (age >= 13 && age <= 18) return [8, 10];
    return [7, 9];
  };

  //actual computation of the sleep cycles
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
      // show a popup if no time is selected, css in in Popup.css
      const popup = document.createElement("div");
      popup.innerText = "Please select a time.";
      popup.classList.add('popup')

      document.body.appendChild(popup);

      // remove the popup after 2 seconds
      setTimeout(() => {
        popup.style.animation = "fadeOut 0.3s ease";
        popup.addEventListener("animationend", () => popup.remove());
      }, 2000);

      return;
    }

    if (!user) {
      // show a popup if the user is not logged in, css in Popup.css
      const popup = document.createElement("div");
      popup.className = "popup-not-logged";

      const message = document.createElement('p');
      message.className = 'popup-not-logged-message';
      message.textContent = 'You must be logged in to log sleep data.';

      const button = document.createElement('button');
      button.className = 'popup-not-logged-button';
      button.textContent = 'Close';
      button.onclick = () => document.body.removeChild(popup);

      popup.appendChild(message);
      popup.appendChild(button);
      document.body.appendChild(popup);

      popup.classList.add('popup2')
      

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

    //used for logging in the Sleep Log the amount of time you've slept based on the computations
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

  const refreshSleepLogs = () => {
  fetch("http://localhost:5001/api/sleepLogs", { credentials: "include" })
    .then((res) => (res.status === 401 ? [] : res.json()))
    .then(setSleepLog)
    .catch(() => {});
  };

  const handleBarClick = (data) => {
  setSelectedLog(data);
  setEditedHours(data.hours);
  };

  //function to save modifications to a certain log
  const handleSave = async () => {
    if (!selectedLog || !editedHours) return;

    try {
      await fetch(`http://localhost:5001/api/sleepLogs/${selectedLog._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hours: Number(editedHours) }),
      });
      setSelectedLog(null);
      refreshSleepLogs();
    } catch (err) {
      alert("Failed to update log.");
    }
  };

  //delete modifications
  const handleDelete = async () => {
    if (!selectedLog) return;
      console.log("Attempting to delete log ID:", selectedLog._id);
    try {
      const res = await fetch(`http://localhost:5001/api/sleepLogs/${selectedLog._id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const result = await res.json();
    console.log("Delete response:", res.status, result);

    if (res.ok) {
      setSelectedLog(null);
      refreshSleepLogs();
    } else {
      alert(result.error || "Failed to delete log.");
    }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete log.");
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
    //top right corner with logout button and the welcome to the user
    <div className="layout-wrapper">
    <div
      className="bg-neutral-950"
      style={{ backgroundColor: "#000", minHeight: "100vh", padding: "40px", fontFamily: "Arial, sans-serif" }}
    >
      <div style={{ position: "absolute", top: 20, right: 30 }}>
        {user ? (
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <span className="welcome-text">
              Welcome, {user.username}</span>
            <button
              onClick={logout}
              className="log-button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <button
              onClick={() => setShowLoginPopup(true)}
              className="log-button"
            >
              Login / Register
            </button>
          </div>
        )}
      </div>

      {/* Login/Register Popup */}
      {showLoginPopup && (
        <div className="login-popup">
          <div className="login-form">
            <button
              onClick={closePopup}
              className="close-login"
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
            
            
            <input /*input for the username and for the password in the log in popup*/
              type="text"
              placeholder="Username"
              value={authFields.username}
              onChange={(e) => setAuthFields({ ...authFields, username: e.target.value })}
              className="user-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={authFields.password}
              onChange={(e) => setAuthFields({ ...authFields, password: e.target.value })}
              className="user-input"
            />

            {authMode === "register" && (
            <input
            type="date"
            placeholder="Date of Birth"
            value={authFields.dob || ""}
            onChange={(e) => setAuthFields({ ...authFields, dob: e.target.value })}
            className="user-input"
            />
            )}

            {authMode === "register" && (
              <p className="password-alert">
                The password must be 8 character long and contain at least a number.
              </p>
            )}

            <button
              onClick={handleAuth}
              className="register-button"
            >
              {authMode === "login" ? "Login" : "Register"}
            </button>
            <button
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              className="second-action"
            >
              {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      )}

    <h1 className="deep-sleep-title">
    DeepSleep
    </h1>

  <div class = "block">
    <div style={{
      marginBottom: "25px",
      borderBottom: "1px solid black",
      paddingBottom: "20px",
    }}>
    <label>
      <span class = "age-block">
        Your age:
      </span>
    </label>
    {!user ? (
      <input className="input-age"
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
    ) : (
      <p class= "age">
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
        <div className="alarm-mode">
          Calculates when to go to bed for a given alarm time.
        </div>
      </div>
    <div
      onClick={() => setMode(mode === "bedtime" ? "alarm" : "bedtime")}
      className="button-select-mode"
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
        <div className="bedtime-mode">
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
          <span className="bed-alarm-text">
           Bedtime:
          </span>
        </label>
        <input
          type="time"
          value={bedtime}
          onChange={(e) => setBedtime(e.target.value)}
          className="input-bedtime"
        />
      <button
        onClick={() => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        setBedtime(`${hours}:${minutes}`);
      }}
      className="button-bednow"
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
        <span className="bed-alarm-text">
          Alarm Time:
        </span>
      </label>
      <input
        type="time"
        value={alarmTime}
        onChange={(e) => setAlarmTime(e.target.value)}
        className="input-alarmtime"
      />
    </div>
  </div>

  <div style={{
    marginBottom: "25px",
    borderBottom: "1px solid black",
    paddingBottom: "20px"
  }}>
    <label>
      <span className="bed-alarm-text">
        Time to fall asleep (min):
      </span>
    </label>
    <input
      type="number"
      value={fallAsleepTime}
      onChange={(e) => setFallAsleepTime(Number(e.target.value))}
      className="input-fallasleep"
    />
  </div>

  <button
    onClick={calculateTimes}
    className="button-get-reccomandations"
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
      <ul className="suggested-times"
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
        className="button-confirm"
      >
        CONFIRM SELECTION
      </button>
    </>
  )}
</div>



{user && sleepLog.length > 0 && (
  <div style={{ marginTop: "50px" }}>
    <h2 style={{ textAlign: "center", color: "white" }}>Your Sleep Log</h2>
    <h2 style={{
      marginTop: "-7px",
      color: "white", 
      textAlign: "center", 
      fontSize: "18px",
      }}> 
      To edit your log, click on a column 
      </h2>
    
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sleepLog}>
        <CartesianGrid stroke="#444" strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          stroke="#c084fc"
          tick={{ fill: "#fff" }}
          axisLine={{ stroke: "#c084fc", strokeWidth: 2 }}
          tickLine={{ stroke: "#c084fc", strokeWidth: 2 }}
          label={{ value: "Date", position: "insideBottom", offset: -5, fill: "#fff" }}
        />
        <YAxis
          stroke="#c084fc"
          tick={{ fill: "#fff" }}
          axisLine={{ stroke: "#c084fc", strokeWidth: 2 }}
          tickLine={{ stroke: "#c084fc", strokeWidth: 2 }}
          label={{value: "Hours of Sleep",angle: -90,position: "insideLeft",offset: 10,fill: "#fff"}}
        />
        <Tooltip
          cursor={false} // Prevents full graph highlight
          contentStyle={{
          backgroundColor: "#222", 
          borderColor: "#c084fc",
          color: "#fff"
          }}
          labelStyle={{ color: "#c084fc" }}
          itemStyle={{ color: "#fff" }}
        />
        <Bar dataKey="hours" fill="#c084fc" barSize={40} isAnimationActive={false} activeBar={{fill: "#a855f7"}} onClick={handleBarClick} />
      </BarChart>
    </ResponsiveContainer>
    <div style={{ textAlign: "center" }}>
      <button
        onClick={clearSleepData}
        className="button-clear-sleep-data"
      >
        Clear all Logs
      </button>
    </div>

    {selectedLog && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        }}>
        <div className="editor-box">
          <button
              onClick={() => setSelectedLog(null)}
              className="close-editor"
            >
              &times;
            </button>
          <h3 style={{ color: "#fff" }}>Edit Sleep Log</h3>
          <p style={{ color: "#ccc" }}><strong>Date:</strong> {selectedLog.date}</p>
          <p style={{ color: "#ccc" }}><strong>Time:</strong> {selectedLog.selectedTime}</p>
          <p style={{ color: "#ccc" }}><strong>Mode:</strong> {selectedLog.mode}</p>

          <label style={{ color: "#fff" }}>
            Hours Slept:
            <input
              type="number"
              value={editedHours}
              onChange={(e) => setEditedHours(e.target.value)}
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                backgroundColor: "#333",
                color: "#fff"
              }}
            />
          </label>

          <div style={{ marginTop: "20px" }}>
            <button 
            className="button-save" 
            onClick={handleSave}>
              Save
            </button>
            <button 
            className="button-delete"
            onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}



  <div className="background-stars">
    <div>
    <TipsStar tip = "limit caffeine in the afternoon!" left = "6%" top = "15%"></TipsStar>
    <TipsStar tip = "try to not use your devices 1 hour before bed" left = "14%" top = "30%"></TipsStar>
    <TipsStar tip = "try to wake up at the same time everyday!" left = "14%" top = "45%"></TipsStar>
    <TipsStar tip = "block out sources of light!" left = "6%" top = "73%"></TipsStar>
    <TipsStar tip = "take a warm shower or bath an hours before bed" left = "16%" top = "60%"></TipsStar>
    <TipsStar tip = "daily exercise of 20 minutes can improve your sleep!" left = "25%" top = "84%"></TipsStar>
    <TipsStar tip = "try to have some light exposure for at least 30 minutes a day" left = "15%" top = "94%"></TipsStar>
    <TipsStar tip = "use relaxing techniques, we can help you find some! scroll down" left = "72%" top = "15%"></TipsStar>
    <TipsStar tip = "can't fall asleep? try getting out of bed and do something relaxing!" left = "81%" top = "15%"></TipsStar>
    <TipsStar tip = "try to eat dinner a few hours before bed!" left = "72%" top = "25%"></TipsStar>
    <TipsStar tip = "need a late snack? try to keep it light!" left = "79%" top = "25%"></TipsStar>
    <TipsStar tip = "reserve your bed for sleep only" left = "85%" top = "37%"></TipsStar>
    <TipsStar tip = "keep naps around 20 minutes!" left = "90%" top = "50%"></TipsStar>
    </div>


    <div class = "polar-star">
      <svg viewBox="0 0 100 100" class="polar-svg" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,10 60,50 50,90 40,50" />
        <polygon points="10,50 50,60 90,50 50,40" />
      </svg>
      <div class = "polar-tip">follow your sleep cycles! </div>
    </div>
  </div>


  <h2 id = "tips-section" class = "title">
    Read below for theory behind a good sleep schedule!
  </h2>




  <div  class = "text-tips">
    Want to sleep better? Touch the stars!
  </div>

  <div class = "text-tips2">
    Or click this icon <a href="#tips-section"><span>ℹ️</span></a>!
  </div>


  <div className="rhythm-box">    
    <h3>⌛️ What's the circadian rhythm?</h3>
      <p>  It helps living beings respond to changes in their environment in ways that conserve energy, help them find food and allow them to grow and heal. 
      In humans it helps to regulate sleeping, core body temperature, immune system, hormones, metabolism, cognitive function, the body’s reaction to stress. 
      It is controlled by biological clocks in organs and especially a  “clock” in a part of the brain. This clock operates on a cycle slightly longer than 24 hours, in order to maintain alignment with the 24 hours of the planet rotation the clock adjusts itself 
      by about 12 to 18 minutes every day, using environmental cues.
      The most important ones are sleep and light while others include: meals, exercise, social interactions, daily routines and stress.
      Having an aligned circadian rhythm can help you fall asleep and have a better sleeping schedule.
     </p>

    <h3>To mantain a healthy rhythm:</h3>
    <ul>
      <li>Keep a regular schedule during the day</li>
      <li>Implement a bedtime routine: do some relaxing activities like reading a book or a light stretch. Your body will connect these activities to bedtime, which will help you during the process of falling asleep</li>
      <li>Avoid naps late in the day</li>
      <li>Avoid screens and bright lights before bed. This inhibits melatonin production, which will make it harder for you to fall asleep</li>
      <li>Enjoy sunlight during the day</li>
    </ul>
  </div>


  <h2 class = "title-tips">
    More in depth tips! 
  </h2>


  <div className="tips-wrapper">
    <div className="tips-scroller">
      <div className="tip-box2">
      <h3>☕️ Caffeine!</h3>
      <p>Try to avoid caffeine and other substances like alchol or nicotine before going to bed.  Using caffeine in the afternoon can be tempting to resist the sleepiness of the afternoon, but it's not reccomended in the long term.
      Alchol on the other hand can affect the brain in a way that can lower the sleep quality.  Same goes with nicotine as it's a stimulant! It is proved that avoiding these substances 
      may help with a good night sleep. 
      </p>
    </div>

    <div className="tip-box2">
      <h3>📱 Devices</h3>
      <p> Blue light can affect your circadian rhythm, this can worsen the quality of your sleep.
      It's advisable to avoid using devices 1 hour before bed, but even 20 minutes before can help! The blue light can affect the production of melatonin during the evening
      and using eletronical devices can keep your brain from winding down which can reflect on your ability to fall asleep.
      </p>
    </div>

    <div className="tip-box2">
      <h3>💡Block out light</h3>
      <p> During the night, block out sources of light. This can affect your body in the production of melatonin and make it difficult
      for you to fall asleep. The importance of light is connected to your circadian rhythm, in fact as sun sets the brain begins to produce melatonin, an hormone inducing sleepiness.
      Also your body temperature starts to drop which is typical behavior of your body when it's ready to fall asleep.
      </p>
    </div>

    <div className="tip-box3">
      <h3>✨ Sleep cycles</h3>
      <p>
      Follow your sleep cycle! Sleep cycles are made of 1.5 hours each, using our site you can find the best time to go to bed or the best time to wake up at!
      One sleep cycles is divided between 2 different kind of stages, the Non-REM sleep and the REM sleep. Waking up between stages can make you feel tired even if you've just woken up.
      Studies suggest that it's better to wake up in between cycles. Our site is here to help you accomplish this goal!
      </p>
    </div>


    <div className = "tip-box2">
      <h3>🧘 Relaxing techniques</h3>
      <p> Simple relaxing techniques can be reading a book or listening to soothing music. You can also try some breathing exercises, for example:
        place one of your hands on your stomach and the other on your chest, inhale slowly directing your breath to the belly, concentrate on how your hands move, exhale slowly and feel how the hand 
        on your stomach gradually fall. You can also try some meditation techniques, we suggest the 
        <span className="tool-tip"><strong> body scan meditation</strong>
          <span className="tooltip-text">
            <ol>
              <li> Lie in bed with your hands at your side.</li>
              <li>Spend a few seconds concentrating on your breathing</li>
              <li>Concentrate on the sensations you feel in your feet</li>
              <li> Breathe deeply and imagine the breath travelling to your feet. Exhale and let your feet dissolve from your awarness</li>
              <li>Move your attention progressively upward until reaching your head.</li>
             <li> Finish by becoming aware of your whole body and breath deeply</li>
            </ol>
          </span>
        </span>.
      </p>
    </div>

    <div className = "tip-box2">
      <h3>⏰ Wake up</h3>
      <p>Try to wake up at the same time everyday, even in the weekends. In this way tou can help your body get accustomed
        to an healthy sleep routine, which is difficult if you don't follow a similar routine every day.
      </p>
    </div>

    <div className="tip-box2">
      <h3>🍽️ Dinner</h3>
      <p>Have dinner a few hours before your bedtime, allow your body to digest. Going to bed with an heavy stomach can affect the quality of your sleep and the amount of time
       you will actually take to fall asleep. Also not eating is not an option as you may wake up in the middle of the night hungry which will disrupt your sleep.
      </p>
    </div>

 

    <div className="tip-box2">
      <h3>🏃‍♂️‍➡️ Daily exercise</h3>
      <p>A daily walk of 20 minutes is enough to already improve your sleep schedule. Other than improving your health, exercising can also improve your mental health. It's always advisable! Experts advise to avoid heavy exercise
        close to bedtime, instead try some relaxing activities or light exercises like yoga!
      </p>
    </div>

    <div className="tip-box2">
      <h3>🛁 Warm bath</h3>
      <p>Take a warm shower or a warm bath an hour before bed. This will help with the natural temperature
      regulation process, improving sleep as a result.
      </p>
    </div>

    

    <div className = "tip-box2"> 
      <h3>😴 Naps</h3>
      <p> Keep naps around 20 minutes and take them early in the afternoon. The best time to take a nap is shortly after lunch. If you take it too late in the day, or take one too long,
       you probably will have more troubles falling asleep in the night. 
      </p>
    </div>

    <div className = "tip-box2">
      <h3>🛏️ Get out of bed!</h3>
      <p>Can't fall asleep? Try to get out of bed and do something relaxing instead. Read a few pages of a book or try some relaxing techniques.
      It's better to not associate frustation with the environment of the bed as it can affect your next sleep. Also in the mornings try to not stay in bed too long even if tempting.
      </p>
    </div>

    <div className="tip-box2">
     <h3>☀️ Light exposure</h3>
      <p> Try to take a dose of natural light everyday, especially in the morning. In fact as exposure to light increases, melatonin production stops and temperature arises promoting wakefulness.
        This will help regulate your circadian rhythm and as a consequence it will also help you with
        your sleeping schedule.
     </p>
    </div>
    </div>

    <ReferenceTab></ReferenceTab>
  
  </div>
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