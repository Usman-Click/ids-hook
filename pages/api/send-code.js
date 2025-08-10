// 1. Import Firebase Admin
import admin from "firebase-admin";
import { Resend } from "resend";

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
  if (req.method === "POST") {
    const data = req.body;
    if (data != null) {
      const uid = data.user.uid;
      const snapshot = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get();

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const resend = new Resend("re_Roe1xZd8_6DVZMewNGYmSyZzF5Czt5Sb9");
      const usermail = snapshot.email;

      resend.emails.send({
        from: "Intrusion Detection System",
        to: "uadamuharuna@gmail.com",
        subject: "Verification Code",
        html:
          "<p>Hi, Your Verification code is <strong>" + code + "</strong>!</p>",
      });

      console.log("Webhook received, Data:", usermail + code);
    }

    return res.status(200).json({ message: "Code Sent Succesfully" });

    // return res.status(100).json({ message: "Event ignored" });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
