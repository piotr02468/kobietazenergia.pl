/*{
  _id: ObjectId,
  name: "Jan",
  text: "Super pomoc!",
  rating: 5,
  approved: false,
  createdAt: Date
}*/

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

if (!ADMIN_PASSWORD) {
  throw new Error("Brak zmiennej srodowiskowej ADMIN_PASSWORD");
}

if (!MONGO_URI) {
  throw new Error("Brak zmiennej srodowiskowej MONGO_URI");
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Brak dostepu" });
  }

  next();
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("Polaczono z MongoDB"))
  .catch((err) => { console.error("Blad polaczenia z MongoDB:", err); process.exit(1); });

// MODEL
const Opinion = mongoose.model("Opinion", {
  name: String,
  text: String,
  rating: Number,
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});


// ✅ GET zatwierdzone
app.get("/opinie", async (req, res) => {
  const opinions = await Opinion.find({ approved: true })
    .sort({ createdAt: -1 })
    .limit(3);

  res.json(opinions);
});


// ✅ POST nowa opinia
app.post("/opinie", async (req, res) => {
  const { name, text, rating } = req.body;

  const newOpinion = new Opinion({ name, text, rating });
  await newOpinion.save();

  res.json({ message: "Opinia dodana (czeka na zatwierdzenie)" });
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Niepoprawne haslo" });
  }

  res.json({ message: "Zalogowano" });
});


// ✅ ADMIN – wszystkie
app.get("/admin/opinie", requireAdmin, async (req, res) => {
  const opinions = await Opinion.find().sort({ createdAt: -1 });
  res.json(opinions);
});


// ✅ ZATWIERDŹ
app.patch("/opinie/:id", requireAdmin, async (req, res) => {
  await Opinion.findByIdAndUpdate(req.params.id, { approved: true });
  res.json({ message: "Zatwierdzono" });
});


// ❌ USUŃ
app.delete("/opinie/:id", requireAdmin, async (req, res) => {
  await Opinion.findByIdAndDelete(req.params.id);
  res.json({ message: "Usunięto" });
});


app.listen(PORT, () => console.log(`Server dziala na porcie ${PORT}`));