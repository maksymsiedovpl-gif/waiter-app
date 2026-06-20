import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/las_woda";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Схеми даних
const tableSchema = new mongoose.Schema({
  number: String,
  zone: String,
  isOccupied: { type: Boolean, default: false },
  activeReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null }
});

const reservationSchema = new mongoose.Schema({
  tableId: String,
  guestName: String,
  phone: String,
  time: String,
  guestsCount: Number,
  comment: String,
  date: String // YYYY-MM-DD
});

const receiptSchema = new mongoose.Schema({
  tableId: String,
  status: { type: String, default: 'active' }, // active, closed
  items: [{
    name: String,
    price: Number,
    status: { type: String, default: 'Нове' } // Нове, На кухні, Видане
  }],
  paymentMethod: String,
  totalSum: Number
});

const Table = mongoose.model('Table', tableSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);

// Ендпоінти для Столів
app.get('/api/tables', async (req, res) => {
  const tables = await Table.find();
  res.json(tables);
});

app.post('/api/tables/toggle', async (req, res) => {
  const { id, isOccupied, receiptId } = req.body;
  const table = await Table.findByIdAndUpdate(id, { isOccupied, activeReceipt: receiptId }, { new: true });
  res.json(table);
});

// Ендпоінти для Резервацій
app.get('/api/reservations', async (req, res) => {
  const reservations = await Reservation.find();
  res.json(reservations);
});

app.post('/api/reservations', async (req, res) => {
  const newRes = new Reservation(req.body);
  await newRes.save();
  res.json(newRes);
});

app.delete('/api/reservations/:id', async (req, res) => {
  await Reservation.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// Ендпоінти для Чеків
app.get('/api/receipts/:id', async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  res.json(receipt);
});

app.post('/api/receipts', async (req, res) => {
  const newReceipt = new Receipt(req.body);
  await newReceipt.save();
  res.json(newReceipt);
});

app.put('/api/receipts/:id', async (req, res) => {
  const updated = await Receipt.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// Ініціалізація базових столів (для першого запуску)
async function initDB() {
  const count = await Table.countDocuments();
  if (count === 0) {
    const zones = ['Головний зал', 'Тераса', 'SPA / Басейн'];
    let defaultTables = [];
    zones.forEach(zone => {
      for (let i = 1; i <= 6; i++) {
        defaultTables.push({ number: `${i}`, zone, isOccupied: false });
      }
    });
    await Table.insertMany(defaultTables);
    console.log("ℹ️ Default tables initialized");
  }
}
initDB();

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
