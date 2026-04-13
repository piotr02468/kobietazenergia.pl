require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
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
const Opinion = mongoose.model("Opinion", {
  name: String,
  text: String,
  rating: Number,
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});


// GET (zatwierdzone - 3)
app.get("/opinie", async (req, res) => {
  const opinions = await Opinion.find({ approved: true })
    .sort({ createdAt: -1 })
    .limit(3);

  res.json(opinions);
});


// POST (nowa opinia)
app.post("/opinie", async (req, res) => {
  const { name, text, rating } = req.body;

  const newOpinion = new Opinion({ name, text, rating });
  await newOpinion.save();

  res.json({ message: "Dodano (czeka na zatwierdzenie)" });
});


// ADMIN – wszystkie
app.get("/admin/opinie", requireAdmin, async (req, res) => {
  const opinions = await Opinion.find().sort({ createdAt: -1 });
  res.json(opinions);
});


// ADMIN - logowanie
app.post("/admin/login", (req, res) => {
  const { password } = req.body || {};

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ message: "Brak ADMIN_PASSWORD w konfiguracji" });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Niepoprawne haslo" });
  }

  return res.json({ message: "OK" });
});


// ZATWIERDŹ
app.patch("/opinie/:id", requireAdmin, async (req, res) => {
  await Opinion.findByIdAndUpdate(req.params.id, { approved: true });
  res.json({ message: "Zatwierdzono" });
});


// USUŃ
app.delete("/opinie/:id", requireAdmin, async (req, res) => {
  await Opinion.findByIdAndDelete(req.params.id);
  res.json({ message: "Usunięto" });
});


app.listen(PORT, () => console.log(`Server dziala na ${PORT}`));