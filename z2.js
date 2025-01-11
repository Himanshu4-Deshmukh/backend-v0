const port = 4000;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const cors = require("cors");
const axios = require('axios');
const xml2js = require('xml2js');

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
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

  vahanChalanTask: { type: Number, default: 0 },  // New field for Vahan Chalan task count
  fastagTask: { type: Number, default: 0 },  // New field for Fastag task count
});

// RC Details Model
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
  const token = req.headers.authorization?.split(' ')[1];
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

    const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '5h' });
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
        const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom', { expiresIn: '5h' });
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

// Get User Profile Route
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await Users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({
      userName: user.name,
      email: user.email,
      credits: user.credits,
      vahanChalanTask: user.vahanChalanTask,
      fastagTask: user.fastagTask
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Credits Route
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

// Fetch Vehicle Data and Save to DB
const parseVehicleData = async (responseData) => {
  try {
    let xmlString;
    if (typeof responseData === 'string') {
      xmlString = responseData;
    } else if (typeof responseData === 'object') {
      if (responseData.response && Array.isArray(responseData.response) && responseData.response[0].response) {
        xmlString = responseData.response[0].response;
      } else {
        throw new Error('Unexpected response structure');
      }
    } else {
      throw new Error('Unexpected response format');
    }

    // Ensure xmlString is a string and remove any leading/trailing whitespace
    xmlString = String(xmlString).trim();

    if (!xmlString.startsWith('<?xml')) {
      throw new Error('Response does not appear to be valid XML');
    }

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlString);
    const details = result.VehicleDetails;

    if (!details) {
      throw new Error('Vehicle details not found in the parsed XML');
    }

    return {
      regnNo: details.rc_regn_no,
      regnDt: details.rc_regn_dt,
      insuranceUpto: details.rc_insurance_upto,
      fitUpto: details.rc_fit_upto,
      taxUpto: details.rc_tax_upto,
      registeredAt: details.rc_registered_at,
      chasiNo: details.rc_chasi_no,
      engNo: details.rc_eng_no,
      financer: details.rc_financer,
      insuranceComp: details.rc_insurance_comp,
      blacklistStatus: details.rc_blacklist_status,
      ownerName: details.rc_owner_name,
      vhClassDesc: details.rc_vh_class_desc,
      makerModel: details.rc_maker_model,
      fuelDesc: details.rc_fuel_desc,
      color: details.rc_color,
      presentAddress: details.rc_present_address
    };
  } catch (error) {
    console.error('Error parsing vehicle data:', error);
    throw new Error('Failed to parse vehicle data: ' + error.message);
  }
};

// API to fetch RC Details and Save
app.post('/api/rc-details', verifyToken, async (req, res) => {
  const { vehicleNumber } = req.body;

  if (!vehicleNumber) {
    return res.status(400).json({ error: 'Vehicle number is required' });
  }

  try {
    // Check user credits
    const user = await Users.findById(req.userId);
    if (!user || user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }

    // Check if vehicle data already exists for this user
    const existingRecord = await RcDetails.findOne({
      userId: req.userId,
      vehicleNumber: vehicleNumber
    });

    if (existingRecord) {
      return res.json({
        message: 'Vehicle data retrieved from database',
        data: existingRecord.vehicleData
      });
    }

    // Fetch data from Vahan API
    const response = await axios.post('http://3.110.172.78/vahan', { vehicleNumber });
    console.log('Raw API response:', JSON.stringify(response.data, null, 2));
    const data = response.data;

    if (!data) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Parse XML data
    const vehicleData = await parseVehicleData(data);

    // Save to database
    const rcDetail = new RcDetails({
      userId: req.userId,
      vehicleNumber: vehicleNumber,
      vehicleData: vehicleData
    });

    await rcDetail.save();

    // Deduct one credit from user
    user.credits -= 5;
    user.vahanChalanTask += 1; // Increment Vahan Chalan task count
    await user.save();

    res.json({ message: 'Vehicle data saved successfully', data: vehicleData });
  } catch (error) {
    console.error('Error fetching and saving vehicle data:', error);
    res.status(500).json({ error: 'Failed to fetch or save vehicle data' });
  }
});

// Get User's RC Details History
app.get('/api/rc-details-history', verifyToken, async (req, res) => {
    try {
      const rcDetails = await RcDetails.find({ userId: req.userId })
        .sort({ createdAt: -1 }); // Sort by newest first
  
      res.json({ success: true, data: rcDetails });
    } catch (error) {
      console.error('Error fetching RC details history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Delete RC Details History Entry
  app.delete('/api/rc-details-history/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
    
        // Find and delete the entry belonging to the authenticated user
        const deletedEntry = await RcDetails.findOneAndDelete({
          _id: id,
          userId: req.userId, // Ensure the user can only delete their own entries
        });
    
        if (!deletedEntry) {
          return res.status(404).json({ success: false, message: 'RC details entry not found or unauthorized' });
        }
    
        res.json({ success: true, message: 'RC details entry deleted successfully' });
      } catch (error) {
        console.error('Error deleting RC details entry:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });


    app.get('/api/user-tasks', verifyToken, async (req, res) => {
        try {
          const user = await Users.findById(req.userId);
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }
      
          // Return task counts
          res.json({
            Rcchallantask: user.Rcchallantask,
            vahanChalanTask: user.vahanChalanTask, // Ensure this is populated in your MongoDB schema
          });
        } catch (error) {
          console.error('Error fetching user tasks:', error);
          res.status(500).json({ error: 'Failed to fetch user tasks' });
        }
      });
      
    
  
  // Root Route
  app.get("/", (req, res) => {
    res.send("Express is running");
  });


// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
