// 1. Import Firebase Admin
import admin from "firebase-admin";
import nodemailer from "nodemailer";

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

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  //  Handle the preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 3. check if it's a POST req
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} not allowed` });
  }

  try {
    // 4. Get user ID from the req body
    const data = req.body;
    const uid = data.user.uid;
    const usermail = data.user.email;

    // 5. Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Create transporter with Gmail SMTP
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER, // your@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD, // app password
      },
    });

    // 2. Send mail
    await transporter.sendMail({
      from: `"Intrusion Detection System" <${"ids@appnex.dev>"}>`,
      to: usermail,
      subject: "Your Verification Code",
      html: `<p>Hi, your verification code is <strong>${code}</strong></p>`,
    });

    if (!emailReq.ok) {
      const error = await emailReq.text();
      return res.status(500).json({ message: "Email send failed", error });
    }

    // save code in Firestore
    await admin.firestore().collection("users").doc(uid).update({
      verificationCode: code,
      // codeExpiresAt: Date.now() + 10 * 60 * 1000, // expires in 10 min
    });

    return res.status(200).json({ message: "Code sent successfully" });
  } catch (error) {
    console.error("Error sending code:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
