// 1. Import Firebase Admin
import admin from "firebase-admin";

// 2. Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const RESEND_API_KEY = process.env.RESENDS_KEY; 

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "Missing UID" });

    // Fetch user data from Firestore
    const snapshot = await admin.firestore().collection("users").doc(uid).get();
    if (!snapshot.exists) return res.status(404).json({ message: "User not found" });

    const usermail = snapshot.data().email;

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Send email using Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "IDS Security <no-reply@yourdomain.com>", //  verified sender
        to: [usermail],
        subject: "Your Verification Code",
        html: `<p>Hi, your verification code is <strong>${code}</strong>.</p>`,
      }),
    });

    if (!emailRes.ok) {
      const error = await emailRes.text();
      return res.status(500).json({ message: "Email send failed", error });
    }

    // Optionally save code in Firestore
    await admin.firestore().collection("users").doc(uid).update({
      verificationCode: code,
      codeExpiresAt: Date.now() + 10 * 60 * 1000, // expires in 10 min
    });

    return res.status(200).json({ message: "Code sent successfully" });

  } catch (error) {
    console.error("Error sending code:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
