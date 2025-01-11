const port = 4000;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const cors = require("cors");
const axios = require('axios');

// using this our react will connect to the backend
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/easifybiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((error) => console.error('MongoDB connection error:', error));

// User Model
const Users = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  apikey: { type: String },
  date: { type: Date, default: Date.now },
  companyname: { type: String },
  number: { type: String },
  credits: { type: Number, default: 100 },
  Rcbasictask: { type: Number, default: 0 },
  Rcadvtask: { type: Number, default: 0 },
  Rcchallantask: { type: Number, default: 0 },
  RcchallanAdv: { type: Number, default: 0 },
});

const RcDetails = mongoose.model('RcDetails', {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  vehicleNumber: { type: String, required: true },
  vehicleData: {
    regnNo: String,
    regnDt: String,
    insuranceUpto: String,
    fitUpto: String,
    puccUpto: String,
    taxUpto: String,
    registeredAt: String,
    chasiNo: String,
    engNo: String,
    financer: String,
    insuranceComp: String,
    blacklistStatus: String,
    ownerName: String,
    vhClassDesc: String,
    makerModel: String,
    fuelDesc: String,
    color: String,
    presentAddress: String
  },
  createdAt: { type: Date, default: Date.now },
});


// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header
  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  jwt.verify(token, 'secret_ecom', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Failed to authenticate token' });
    }
    req.userId = decoded.user.id;
    next();
  });
}

// Signup Route
app.post('/signup', async (req, res) => {
  try {
    const existingUser = await Users.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
    }

    const emailPrefix = req.body.email.substring(0, 4);
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const apikey = emailPrefix + randomNumber;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      companyname: req.body.companyname,
      number: req.body.number,
      apikey
    });

    await user.save();

    const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '1h' }); // Added token expiration
    res.json({ success: true, token });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const user = await Users.findOne({ email: req.body.email });
    if (user) {
      const passCompare = await bcrypt.compare(req.body.password, user.password);
      if (passCompare) {
        const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '1h' }); // Added token expiration
        res.json({ success: true, token });
      } else {
        res.json({ success: false, errors: "Wrong Password" });
      }
    } else {
      res.json({ success: false, errors: "Wrong Email Id" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// Get User Info (requires token)
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await Users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ userName: user.name, email: user.email, credits: user.credits });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Credits (requires token)
app.post('/api/updateCredits', verifyToken, async (req, res) => {
  try {
    const { total } = req.body;
    const user = await Users.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.credits += parseInt(total);
    await user.save();
    res.status(200).json({ message: 'Credits added successfully', userCredits: user.credits });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch Rc Details (requires token)
app.post('/api/rc-details', verifyToken, async (req, res) => {
  const { vehicleNumber } = req.body;

  if (!vehicleNumber) {
    return res.status(400).json({ error: 'Vehicle number is required' });
  }

  try {
    const response = await axios.post('http://3.110.172.78/vahan', { vehicleNumber });
    const data = response.data;

    if (data.response && data.response[0]?.response) {
      res.json({ response: data.response[0].response });
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    console.error('Error fetching RC data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});






app.get("/",(req,res)=>{
  res.send("Express is running");
})


// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
