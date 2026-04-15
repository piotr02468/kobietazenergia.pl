require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const OPINIONS_API_KEY = process.env.OPINIONS_API_KEY || "";
const MIN_OPINION_LENGTH = Number(process.env.MIN_OPINION_LENGTH) || 20;
const OPINIONS_POST_WINDOW_MS = Number(process.env.OPINIONS_POST_WINDOW_MS) || 15 * 60 * 1000;
const OPINIONS_POST_MAX = Number(process.env.OPINIONS_POST_MAX) || 10;
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server or same-origin requests without Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  }
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ message: "Brak ADMIN_PASSWORD w konfiguracji" });
  }

  const providedPassword = req.header("x-admin-password");
  if (!providedPassword || providedPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

function requireOpinieApiKey(req, res, next) {
  if (!OPINIONS_API_KEY) {
    return res.status(500).json({ message: "Brak OPINIONS_API_KEY w konfiguracji" });
  }

  const providedApiKey = req.header("x-api-key");
  if (!providedApiKey || providedApiKey !== OPINIONS_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

const postOpinieLimiter = rateLimit({
  windowMs: OPINIONS_POST_WINDOW_MS,
  max: OPINIONS_POST_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Za dużo prób dodania opinii. Spróbuj ponownie później." }
});

// 🔥 POŁĄCZENIE Z ATLAS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));


// MODEL
const opinionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  text: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Opinion = mongoose.model("Opinion", opinionSchema);


// GET (wszystkie opinie)
app.get("/opinie", async (req, res) => {
  try {
    const opinions = await Opinion.find().sort({ createdAt: -1 });
    res.json(opinions);
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// GET (wyroznione na strone glowna)
app.get("/opinie/wyroznione", async (req, res) => {
  try {
    const opinions = await Opinion.find({ featured: true })
      .sort({ createdAt: -1 })
      .limit(3);
    res.json(opinions);
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// POST (nowa opinia)
app.post("/opinie", postOpinieLimiter, requireOpinieApiKey, async (req, res) => {
  try {
    const { name, text, rating } = req.body || {};
    const normalizedName = String(name || "").trim();
    const normalizedText = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    const parsedRating = Number(rating);

    if (!normalizedName || !normalizedText || Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Nieprawidłowe dane opinii" });
    }

    if (normalizedText.length < MIN_OPINION_LENGTH) {
      return res.status(400).json({
        message: `Opinia jest zbyt krótka. Minimum to ${MIN_OPINION_LENGTH} znaków.`
      });
    }

    const newOpinion = new Opinion({
      name: normalizedName,
      text: normalizedText,
      rating: parsedRating,
      featured: false
    });

    await newOpinion.save();
    res.status(201).json({ message: "Dodano opinię", opinion: newOpinion });
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// ADMIN – wszystkie
app.get("/admin/opinie", requireAdmin, async (req, res) => {
  try {
    const opinions = await Opinion.find().sort({ createdAt: -1 });
    res.json(opinions);
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// ADMIN - logowanie
app.post("/admin/login", (req, res) => {
  const { password } = req.body || {};

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ message: "Brak ADMIN_PASSWORD w konfiguracji" });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Niepoprawne hasło" });
  }

  return res.json({ message: "OK" });
});


// WYROZNIJ / COFNIJ WYROZNIENIE
app.patch("/opinie/:id/wyroznione", requireAdmin, async (req, res) => {
  try {
    const { featured } = req.body || {};

    if (typeof featured !== "boolean") {
      return res.status(400).json({ message: "Pole featured musi być typu boolean" });
    }

    const updatedOpinion = await Opinion.findByIdAndUpdate(
      req.params.id,
      { featured },
      { new: true }
    );

    if (!updatedOpinion) {
      return res.status(404).json({ message: "Nie znaleziono opinii" });
    }

    res.json({
      message: featured ? "Opinia wyróżniona" : "Usunięto wyróżnienie",
      opinion: updatedOpinion
    });
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// USUŃ
app.delete("/opinie/:id", requireAdmin, async (req, res) => {
  try {
    const deletedOpinion = await Opinion.findByIdAndDelete(req.params.id);

    if (!deletedOpinion) {
      return res.status(404).json({ message: "Nie znaleziono opinii" });
    }

    res.json({ message: "Usunięto" });
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});


app.listen(PORT, () => console.log(`Server działa na ${PORT}`));