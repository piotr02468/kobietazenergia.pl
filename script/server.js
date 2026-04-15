require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.options("*", cors());
app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const PORT = Number(process.env.PORT) || 3000;

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
app.post("/opinie", async (req, res) => {
  try {
    const { name, text, rating } = req.body || {};
    const parsedRating = Number(rating);

    if (!name || !text || Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Nieprawidłowe dane opinii" });
    }

    const newOpinion = new Opinion({
      name,
      text,
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