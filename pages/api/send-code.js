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
  if (req.method === "POST") {
    const data = req.body;
    if (data != null) {
      console.log("Webhook received, Data:", data);

      const snapshot = await admin
        .firestore()
        .collection("users")
        .doc(`${data.user.uid}`)
        .get();

      if (snapshot.exists()) {
        const userEmail = snapshot.data.email;

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        console.log("Webhook received, Data:", userEmail + code);
      }
    }

    return res.status(100).json({ message: "Event ignored" });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
