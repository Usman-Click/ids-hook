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

export default async function handler(req, res) {
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

    // 5. Fetch user data from Firestore
    const snapshot = await admin.firestore().collection("users").doc(uid).get();
    if (!snapshot.exists)
      return res.status(404).json({ message: "User not found" });
    // 6. Get the user's mail
    const usermail = snapshot.data().email;

    // 7. Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 8. Send the email using Resend
    const emailReq = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESENDS_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", //  we're using test mail here, else we need to provide and virify our domain
        to: [usermail],
        subject: "Your Verification Code",
        html: `<p>Hi, your verification code is <strong>${code}</strong>.</p>`,
      }),
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
