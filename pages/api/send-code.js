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
      from: "Intrusion Detection System <ids@appnex.dev>",
      to: usermail,
      subject: "🔒 Verify Your Account - Security Alert",
      html: `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #f9f9f9;">
      <h2 style="color: #1976d2; text-align: center;">Security Verification Required</h2>
      <p>Hello,</p>
      <p>
        We detected a new login attempt to your account. For your security, please verify your identity using the code below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #fff; background: #1976d2; padding: 15px 30px; border-radius: 8px;">
          ${code}
        </span>
      </div>
      
      <p>
        This code will expire in <strong>10 minutes</strong>. If you did not try to log in, please
        <a href="https://appnex.dev/security" style="color: #d32f2f; font-weight: bold;">secure your account immediately</a>.
      </p>
      
      <p style="margin-top: 30px;">
        Thanks,<br/>
        <strong>IDS Security Team</strong>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        You’re receiving this email because a verification was requested for your Appnex account.  
        If this wasn’t you, please ignore this email or contact support immediately.
      </p>
    </div>
  `,
    });

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
