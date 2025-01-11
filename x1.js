const port = 4000;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const cors = require("cors");
const axios = require('axios');
const xml2js = require('xml2js'); // Ensure you install this package

// Middleware setup
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/easifybiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((error) => console.error('MongoDB connection error:', error));

// User model
const Users = mongoose.model('Users', {
  name: String,
  email: { type: String, unique: true },
  password: String,
  apikey: String,
  date: { type: Date, default: Date.now },
  companyname: String,
  number: String,
  credits: { type: Number, default: 100 },
  Rcbasictask: { type: Number, default: 0 },
  Rcadvtask: { type: Number, default: 0 },
  Rcchallantask: { type: Number, default: 0 },
  RcchallanAdv: { type: Number, default: 0 },
});

// RC Details model
const RcDetails = mongoose.model('RcDetails', {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  vehicleNumber: { type: String, required: true },
  vehicleData: Object,
  createdAt: { type: Date, default: Date.now },
});

// JWT middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, 'secret_ecom', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = decoded.user.id;
    next();
  });
}

// Signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const existingUser = await Users.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ success: false, errors: "Email already registered" });
    }

    const emailPrefix = req.body.email.substring(0, 4);
    const apikey = emailPrefix + Math.floor(100000 + Math.random() * 900000);
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      companyname: req.body.companyname,
      number: req.body.number,
      apikey,
    });

    await user.save();
    const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const user = await Users.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ success: false, errors: "Email not found" });
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, errors: "Incorrect password" });
    }

    const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// RC Details CRUD endpoints
app.post('/api/rc-details', verifyToken, async (req, res) => {
  const { vehicleNumber } = req.body;

  if (!vehicleNumber) return res.status(400).json({ error: 'Vehicle number is required' });

  try {
    const user = await Users.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.credits < 5) return res.status(400).json({ error: 'Insufficient credits' });

    user.credits -= 5;
    await user.save();

    const response = await axios.post('http://3.110.172.78/vahan', { vehicleNumber });
    const rawXML = response.data.response;
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsedData = await parser.parseStringPromise(rawXML);

    const vehicleDetails = parsedData?.VehicleDetails || {};
    const rcDetails = new RcDetails({
      userId: req.userId,
      vehicleNumber,
      vehicleData: vehicleDetails,
    });

    await rcDetails.save();
    res.json({ message: 'RC data saved', rcDetails });
  } catch (error) {
    console.error('Error fetching RC data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update RC details
app.put('/api/rc-details/:id', verifyToken, async (req, res) => {
  try {
    const rcDetail = await RcDetails.findOne({ _id: req.params.id, userId: req.userId });
    if (!rcDetail) return res.status(404).json({ error: 'RC details not found' });

    rcDetail.vehicleData = { ...rcDetail.vehicleData, ...req.body.vehicleData };
    await rcDetail.save();
    res.json({ message: 'RC details updated', rcDetail });
  } catch (error) {
    console.error('Error updating RC data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete RC details
app.delete('/api/rc-details/:id', verifyToken, async (req, res) => {
  try {
    const rcDetail = await RcDetails.findOne({ _id: req.params.id, userId: req.userId });
    if (!rcDetail) return res.status(404).json({ error: 'RC details not found' });

    await rcDetail.remove();
    res.json({ message: 'RC details deleted' });
  } catch (error) {
    console.error('Error deleting RC data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch RC details
app.get('/api/rc-fetch', verifyToken, async (req, res) => {
  try {
    const rcDetails = await RcDetails.find({ userId: req.userId });
    if (!rcDetails.length) return res.status(404).json({ error: 'No RC details found' });

    res.json({ rcDetails });
  } catch (error) {
    console.error('Error fetching RC details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Express is running");
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
