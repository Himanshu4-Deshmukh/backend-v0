const port = 4000;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const cors = require("cors");
const axios = require('axios');
const xml2js = require('xml2js');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: 'rzp_test_LetnicYdIN9c1h',
  key_secret: 'D9rULk9SvjfSvqfvfvqn0A2C'
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://studiofusionweb:yA393xeTzBxH35Ny@tenant.nqhqp.mongodb.net/easifybiz?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((error) => console.error('MongoDB connection error:', error));

// Models
const Users = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  apikey: { type: String },
  date: { type: Date, default: Date.now },
  companyname: { type: String },
  number: { type: String },
  credits: { type: Number, default: 100 },
  vahanChalanTask: { type: Number, default: 0 },
  chalanTask: { type: Number, default: 0 },
  fastagTask: { type: Number, default: 0 },
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
    insurancePolicyNo: String, // Add this field
    blacklistStatus: String,
    ownerName: String,
    vhClassDesc: String,
    makerModel: String,
    fuelDesc: String,
    color: String,
    presentAddress: String,
  },
  createdAt: { type: Date, default: Date.now },
});


const Payments = mongoose.model('Payments', {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  orderId: String,
  paymentId: String,
  amount: Number,
  credits: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
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

// Auth Routes
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

// Payment Routes
app.post('/api/create-payment', verifyToken, async (req, res) => {
  try {
    const { credits, companyName, address, selectedState, number } = req.body;
    
    if (!credits || isNaN(credits) || credits <= 0) {
      return res.status(400).json({ error: 'Invalid credit amount' });
    }

    const user = await Users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate amount in paise (Razorpay expects amount in smallest currency unit)
    const amount = Math.round(credits * 118); // Including 18% GST
    
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: rcpt_${Date.now()},
      notes: {
        userId: req.userId,
        credits: credits,
        companyName,
        address,
        selectedState,
        number
      }
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: 'rzp_test_LetnicYdIN9c1h'
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/verify-payment', verifyToken, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      credits
    } = req.body;

    console.log('Verifying payment:', {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      credits: credits
    });

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', 'D9rULk9SvjfSvqfvfvqn0A2C')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.log('Signature verification failed');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Verify payment status
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log('Payment status:', payment.status);
    
    if (payment.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }

    // Update user credits
    const user = await Users.findById(req.userId);
    if (!user) {
      console.log('User not found:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Current credits:', user.credits);
    console.log('Adding credits:', parseInt(credits));

    // Create payment record
    const paymentRecord = new Payments({
      userId: req.userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: payment.amount / 100, // Convert from paise to rupees
      credits: credits,
      status: 'success'
    });
    await paymentRecord.save();

    // Update user credits
    const previousCredits = user.credits;
    user.credits += parseInt(credits);
    await user.save();

    console.log('Updated credits:', user.credits);

    res.json({
      success: true,
      message: 'Payment verified and credits updated successfully',
      previousCredits,
      newCredits: user.credits,
      creditsAdded: parseInt(credits)
    });
  } catch (error) {
    console.error('Error verifying payment and updating credits:', error);
    res.status(500).json({ error: 'Failed to verify payment and update credits' });
  }
});
// Other existing routes remain the same...

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
      chalanTask: user.chalanTask,
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
      insurancePolicyNo: details.rc_insurance_policy_no,
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

// ## Challan APi WIth Logged in user Authentication ## // 

    app.post('/api/echallan', verifyToken, async (req, res) => {
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
      
          // Fetch data from E-challan API
          const response = await axios.post('http://3.110.172.78/echallan', { 
            vehicleNumber 
          });
          console.log('Raw API response:', JSON.stringify(response.data, null, 2));
          
          if (!response.data) {
            return res.status(404).json({ error: 'No data found' });
          }
      
          // Deduct credits and update user stats
          user.credits -= 5;
          user.chalanTask += 1; // Increment Vahan Chalan task count
          await user.save();
      
          res.json({
            message: 'E-challan data retrieved successfully',
            data: response.data
          });
      
        } catch (error) {
          console.error('Error fetching e-challan data:', error);
          res.status(500).json({ error: 'Failed to fetch e-challan data' });
        }
      });


      // ## Fastag APi WIth Logged in user Authentication ## // 

      app.post('/api/fastag', verifyToken, async (req, res) => {
        const { tagId } = req.body;
      
        if (!tagId) {
          return res.status(400).json({ error: 'Tag ID is required' });
        }
      
        try {
          // Check user credits
          const user = await Users.findById(req.userId);
          if (!user || user.credits <= 0) {
            return res.status(403).json({ error: 'Insufficient credits' });
          }
    
          // Fetch data from FastTag API
          const response = await axios.post('http://3.110.172.78/fastag', {
            tagId: tagId,
          });
          
          console.log('Raw API response:', JSON.stringify(response.data, null, 2));
          
          if (!response.data) {
            return res.status(404).json({ error: 'No data found' });
          }
    
          // Deduct credits and update user stats
          user.credits -= 5;
          user.fastagTask = (user.fastagTask || 0) + 1; // Increment FastTag task count
          await user.save();
    
          res.json({
            message: 'FastTag data retrieved successfully',
            data: response.data
          });
    
        } catch (error) {
          console.error('Error fetching FastTag data:', error.message);
          res.status(500).json({ error: 'Failed to fetch FastTag data' });
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
            chalanTask: user.chalanTask, // Ensure this is populated in your MongoDB schema
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
  console.log(Server is running on port ${port});
});