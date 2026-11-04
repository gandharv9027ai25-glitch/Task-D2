
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const formData = require("form-data");
const Mailgun = require("mailgun.js");

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const serviceAccount = require("./firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

const app = express();
const PORT = 3000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

console.log("API key loaded:", !!process.env.MAILGUN_API_KEY);
console.log("Domain loaded:", !!process.env.MAILGUN_DOMAIN);

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running"
  });
});

// Newsletter subscription
app.post("/api/subscribe", async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim()
      : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  if (
    !process.env.MAILGUN_API_KEY ||
    !process.env.MAILGUN_DOMAIN
  ) {
    console.error("Mailgun configuration is missing.");

    return res.status(500).json({
      success: false,
      message: "Email service is not configured."
    });
  }

  try {
    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      {
        from: `DEV@Deakin <postmaster@${process.env.MAILGUN_DOMAIN}>`,
        to: [email],
        subject: "Welcome to DEV@Deakin!",
        text: "Welcome to DEV@Deakin! Thank you for subscribing.",
        html: `
          <h1>Welcome to DEV@Deakin!</h1>
          <p>Thank you for subscribing to our DEV@Deakin platform.</p>
          <p>We are happy to have you with us!</p>
        `
      }
    );

    console.log("Mailgun accepted the email request:", response.id);

    return res.status(200).json({
      success: true,
      message: "Subscription successful! Welcome email requested."
    });

  } catch (error) {
    console.error("Mailgun error:", error.message || "Unknown error");

    return res.status(502).json({
      success: false,
      message: "Unable to send the welcome email. Please try again."
    });
  }
});

// Upgrade subscription
app.post("/api/upgrade-plan", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in first."
      });
    }

    const idToken = authHeader.substring("Bearer ".length);
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { name, cardNumber, expiry, cvv } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof cardNumber !== "string" ||
      typeof expiry !== "string" ||
      typeof cvv !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all demonstration fields."
      });
    }

    const digits = cardNumber.replace(/\s/g, "");

    if (!/^\d{12,19}$/.test(digits)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid demonstration card number."
      });
    }

    const expiryMatch = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

    if (!expiryMatch || !/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid expiry date and demonstration CVV."
      });
    }

    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const now = new Date();

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "The expiry date must be in the future."
      });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile was not found."
      });
    }

    if (userDoc.data().plan === "Paid") {
      return res.status(409).json({
        success: false,
        message: "You are already on the Paid plan."
      });
    }

    await userRef.update({
      plan: "Paid"
    });

    return res.status(200).json({
      success: true,
      message: "Your demonstration upgrade was successful.",
      plan: "Paid"
    });

  } catch (error) {
    console.error(
      "Upgrade error:",
      error.code || error.message || "Unknown error"
    );

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired. Please log in again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to complete the upgrade. Please try again."
    });
  }
});

// Create a new post
app.post("/api/posts", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in before submitting a post."
      });
    }

    const idToken = authHeader.substring("Bearer ".length);
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const {
      postType,
      postPlan,
      title,
      description,
      abstract,
      articleText,
      tags
    } = req.body;

    if (!["Question", "Article"].includes(postType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type."
      });
    }

    if (!["Free", "Paid"].includes(postPlan)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid post plan."
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be 150 characters or fewer."
      });
    }

    if (postType === "Question") {
      if (
        typeof description !== "string" ||
        !description.trim() ||
        description.trim().length > 10000
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid question description."
        });
      }
    }

    if (postType === "Article") {
      if (
        typeof abstract !== "string" ||
        !abstract.trim() ||
        abstract.trim().length > 2000 ||
        typeof articleText !== "string" ||
        !articleText.trim() ||
        articleText.trim().length > 20000
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid abstract and article text."
        });
      }
    }

    if (
      !Array.isArray(tags) ||
      tags.length > 3
    ) {
      return res.status(400).json({
        success: false,
        message: "You can add a maximum of 3 tags."
      });
    }

    const cleanTags = tags.map(tag =>
      typeof tag === "string" ? tag.trim() : ""
    );

    if (
      cleanTags.some(tag =>
        !tag ||
        tag.length > 30 ||
        !/^[a-zA-Z0-9+#.-]+$/.test(tag)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid tags."
      });
    }

    const postData = {
      userId,
      postType,
      postPlan,
      title: title.trim(),
      tags: cleanTags,
      createdAt: FieldValue.serverTimestamp()
    };

    if (postType === "Question") {
      postData.description = description.trim();
    } else {
      postData.abstract = abstract.trim();
      postData.articleText = articleText.trim();
    }

    const postRef = await db.collection("posts").add(postData);

    return res.status(201).json({
      success: true,
      message: "Post submitted successfully!",
      postId: postRef.id
    });

  } catch (error) {
    console.error(
      "Create post error:",
      error.code || error.message || "Unknown error"
    );

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired. Please log in again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit your post. Please try again."
    });
  }
});

// Browse posts with Free/Paid access control
app.get("/api/posts", async (req, res) => {
  try {
    let userPlan = "Free";
    const authHeader = req.headers.authorization || "";

    if (authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring("Bearer ".length);
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const userDoc = await db.collection("users").doc(uid).get();

      if (userDoc.exists && userDoc.data().plan === "Paid") {
        userPlan = "Paid";
      }
    }

    let postsQuery = db.collection("posts");

    if (userPlan === "Free") {
      postsQuery = postsQuery.where("postPlan", "==", "Free");
    }

    const snapshot = await postsQuery.get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    posts.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      userPlan,
      posts
    });

  } catch (error) {
    console.error(
      "Browse posts error:",
      error.code || error.message || "Unknown error"
    );

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to load posts."
    });
  }
});

// Start backend
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
