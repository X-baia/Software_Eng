import { useState } from "react";

function ReferenceTab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="reference-tab">
      <button 
      onClick={() => setOpen(!open)} className="ref-toggle">
        References {open ? "▲" : "▼"}
      </button>

      {open && (
        <ul className="ref-list">
          <li>
            <a href="https://www.sleepfoundation.org" target="_blank" rel="noopener noreferrer">
              Sleep Fundation
            </a>
          </li>
          <li>
            <a href="https://www.health.harvard.edu" target="_blank" rel="noopener noreferrer">
              Harvard Health
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}

export default ReferenceTab;