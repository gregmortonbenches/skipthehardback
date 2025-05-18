import React, { useState } from "react";

function App() {
  const [book, setBook] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    try {
      const response = await fetch("/api/notifyPaperback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book, email }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus("Success! You'll be notified when the paperback is available.");
      } else {
        setStatus(data.error || "Error. Please try again.");
      }
    } catch (err) {
      setStatus("Server error. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Get Paperback Notification</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Book Title or ISBN:<br />
          <input
            type="text"
            value={book}
            onChange={e => setBook(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>
        <br /><br />
        <label>
          Your Email:<br />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>
        <br /><br />
        <button type="submit">Notify Me</button>
      </form>
      <p>{status}</p>
    </div>
  );
}

export default App;