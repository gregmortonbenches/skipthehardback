const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/notifyPaperback", async (req, res) => {
  const { book, email } = req.body;
  if (!book || !email) {
    return res.json({ success: false, error: "Missing book or email" });
  }

  let result = null;
  try {
    let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(book)}&limit=1`;
    const olRes = await axios.get(url);
    if (olRes.data.docs.length === 0) {
      return res.json({ success: false, error: "Book not found." });
    }
    result = olRes.data.docs[0];
  } catch (err) {
    return res.json({ success: false, error: "Book search failed." });
  }

  const formats = (result?.format || "").toLowerCase();
  if (formats.includes("paperback")) {
    return res.json({ success: false, error: "Paperback is already available!" });
  }

  await db.collection("notifications").add({
    bookQuery: book,
    email,
    ol_key: result.key,
    title: result.title,
    author: result.author_name ? result.author_name.join(", ") : "",
    created: admin.firestore.FieldValue.serverTimestamp(),
    notified: false
  });

  return res.json({ success: true });
});

exports.checkPaperbacks = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const snapshot = await db.collection("notifications").where("notified", "==", false).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    try {
      const url = `https://openlibrary.org${data.ol_key}.json`;
      const olRes = await axios.get(url);
      const formats = (olRes.data.physical_format || "").toLowerCase();
      if (formats.includes("paperback")) {
        await sendEmail(data.email, data.title, data.author);
        await doc.ref.update({ notified: true, notifiedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    } catch (err) {
      console.log("Error checking book", data, err);
    }
  }
  return null;
});

async function sendEmail(to, title, author) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "yourgmail@gmail.com",
      pass: "your-app-password"
    }
  });

  const info = await transporter.sendMail({
    from: '"Paperback Notifier" <yourgmail@gmail.com>',
    to,
    subject: `Paperback Available: ${title}`,
    text: `Good news! The paperback edition of "${title}" by ${author} is now available.`
  });
  return info;
}

exports.api = functions.https.onRequest(app);