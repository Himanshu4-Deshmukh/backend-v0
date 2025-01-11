const port = 4000;
const express  = require("express");
const app = express();
const jwt =require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const cors = require("cors");
const axios = require('axios');
const { parseString } = require('xml2js');
import('node-fetch').then(({ default: fetch }) => {
    // Use fetch here
}).catch(err => {
    console.error('Failed to load node-fetch', err);
});
const request = require('request');
// using this our react will connect to the backend
app.use(cors());

mongoose.connect('mongodb://localhost:27017/easifybiz');

// mongoose.connect('mongodb+srv://vahanfinindia:ITyMcsljxjoVgWJ2@rcinfo.o6vdruh.mongodb.net/?retryWrites=true&w=majority&appName=rcinfo');
app.use(express.json());



const Users = mongoose.model('Users',{
  name:{
      type:String,
  },
  email:{
      type:String,
      unique:true,
  },
  password:{
      type:String,
  },
  apikey:{
    type:String,
  },
  date:{
      type:Date,
      default:Date.now,
  },
  companyname:{
    type:String,
  },
  number:{
    type:String,
    
  },
  credits: {
    type: Number,
    default: 100 // Initial value of credits
  },
  Rcbasictask:{
    type: Number,
    default: 0
  },
  Rcadvtask:{
    type: Number,
    default: 0
  },
  Rcchallantask:{
    type: Number,
    default: 0
  },
  RcchallanAdv:{
    type: Number,
    default:0
  },



})


// for admin
const Users_admin = mongoose.model('Admin',{
  name:{
      type:String,
  },
  email:{
      type:String,
      unique:true,
  },
  password:{
      type:String,
  },
  
  date:{
      type:Date,
      default:Date.now,
  },
  companyname:{
    type:String,
  },
  number:{
    type:String,
    
  },
  credits: {
    type: Number,
    default: 100 // Initial value of credits
  },
  Rcadvtask:{
    type: Number,
    default: 0
  },
  Rcchallantask:{
    type: Number,
    default:0
  },

})



// Endpoint for user signup
app.post('/adminsignup', async (req, res) => {
  try {
      // Check if user with the same email already exists
      let check = await Users_admin.findOne({ email: req.body.email });
      if (check) {
          return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Create a new user with hashed password
      const user = new Users_admin({
          name: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          companyname: req.body.companyname,
          number: req.body.number
      });

      // Save the user to the database
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom');

      // Return success response with token
      res.json({ success: true, token });
  } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// Endpoint for user login
app.post('/adminlogin', async (req, res) => {
  try {
      // Find user by email
      let user = await Users_admin.findOne({ email: req.body.email });
      if (user) {
          // Compare hashed passwords
          const passCompare = bcrypt.compare(req.body.password, user.password);
          if (passCompare) {
              // Generate JWT token
              const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom');
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

// Backend API endpoint to fetch all users
app.get('/users', async (req, res) => {
  try {
      const users = await Users.find(); // Assuming Users is your Mongoose model
      res.status(200).json(users);
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Backend API endpoint to fetch user info by ID
app.get('/users/:userId', async (req, res) => {
try {
  const userId = req.params.userId;
  const user = await Users.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json(user);
} catch (error) {
  console.error('Error fetching user info:', error);
  res.status(500).json({ error: 'Internal server error' });
}
});

// payment 
// Update user credits endpoint
app.post('/api/updateCredits', async (req, res) => {
try {
  const { paymentId, total } = req.body;

  // Verify payment details with Razorpay (You may need to implement this logic)

  // Assuming payment verification is successful, update user's credits
  const userId = req.user.id; // Assuming you have authentication and the user ID is available in the request
  const user = await Users.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Add the new credits to the existing credits
  user.credits += parseInt(total);
  await user.save(); // Save the updated user

  res.status(200).json({ message: 'Credits added successfully', userCredits: user.credits });
} catch (error) {
  console.error('Error adding credits:', error);
  res.status(500).json({ error: 'Internal server error' });
}
});

// Update user credits endpoint
app.post('/users/:userId/credits', async (req, res) => {
try {
  const { userId } = req.params;
  const { credits } = req.body;

  // Find the user by ID
  const user = await Users.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update the user's credits
  user.credits += parseInt(credits); // Add the new credits to the existing credits
  await user.save(); // Save the updated user

  res.status(200).json({ message: 'Credits added successfully', userCredits: user.credits });
} catch (error) {
  console.error('Error adding credits:', error);
  res.status(500).json({ error: 'Internal server error' });
}
});

app.post('/signup', async (req, res) => {
  try {
      // Check if user with the same email already exists
      let check = await Users.findOne({ email: req.body.email });
      if (check) {
          return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
      }

      // Hash the password

      const emailPrefix = req.body.email.substring(0, 4);
      const randomNumber = Math.floor(100000 + Math.random() * 900000); 
      const apikey = emailPrefix + randomNumber;
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const ff = await bcrypt.hash(apikey,4)

      // Create a new user with hashed password
      const user = new Users({
          name: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          companyname: req.body.companyname,
          number: req.body.number,
          apikey: ff
      });

      // Save the user to the database
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom');

      // Return success response with token
      res.json({ success: true, token });
  } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ success: false, errors: "Internal server error" });
  }
});

// Endpoint for user login
app.post('/login', async (req, res) => {
  try {
      // Find user by email
      let user = await Users.findOne({ email: req.body.email });
      if (user) {
          // Compare hashed passwords
          const passCompare = await bcrypt.compare(req.body.password, user.password); // Add await here
          console.log(req.body.password);
          console.log(await bcrypt.hash(req.body.password, 10)); // Example of hashing a password
          console.log(passCompare);

          if (passCompare) {
              // Generate JWT token
              const token = jwt.sign({ user: { id: user.id } }, 'secret_ecom');
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


// get request it getch intial details 
app.get('/credits', async (req, res) => {
  try {
    // Assuming token is sent in the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'secret_ecom');
    const userId = decoded.user.id;

    // Find the user by ID
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ userCredits: user.credits });
    
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/all', async (req, res) => {
  try {
    // Assuming token is sent in the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'secret_ecom');
    const userId = decoded.user.id;

    // Find the user by ID
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    res.status(200).json({ RcchallanAdv: user.RcchallanAdv,Rcchallantask: user.Rcchallantask,Rcadvtask: user.Rcadvtask,Rcbasictask: user.Rcbasictask });
   
    
  } catch (error) {
    console.error('Error fetching user api:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// to fetch usename
app.get('/username', async (req, res) => {
  try {
    // Assuming token is sent in the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'secret_ecom');
    const userId = decoded.user.id;

    // Find the user by ID
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ userName : user.name });
    
   
  } catch (error) {
    console.error('Error fetching user name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/rc-details', async (req, res) => {
    const { vehicleNumber } = req.body;
  
    if (!vehicleNumber) {
      return res.status(400).json({ error: 'Vehicle number is required' });
    }
  
    try {
      const response = await axios.post('http://3.110.172.78/vahan', {
        vehicleNumber: vehicleNumber,
      });
  
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

app.post('/api/echallan', async (req, res) => {
    const { vehicleNumber } = req.body;
  
    if (!vehicleNumber) {
      return res.status(400).json({ error: 'Vehicle number is required' });
    }
  
    try {
      const response = await axios.post('http://3.110.172.78/echallan', {
        vehicleNumber: vehicleNumber,
      });
  
      if (response.data) {
        res.json(response.data);
      } else {
        res.status(404).json({ error: 'No data found' });
      }
    } catch (error) {
      console.error('Error fetching e-challan data:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  app.post('/api/fastag', async (req, res) => {
    const { tagId } = req.body;
  
    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' });
    }
  
    try {
      const response = await axios.post('http://3.110.172.78/fastag', {
        tagId: tagId,
      });
  
      if (response.data) {
        res.json(response.data);
      } else {
        res.status(404).json({ error: 'No data found' });
      }
    } catch (error) {
      console.error('Error fetching Fastag data:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


app.get("/",(req,res)=>{
    res.send("Express is running");
})


app.listen(port, (error)=>{
    if(!error){
        console.log("Server running on Port "+port);
    }
    else{
        console.log("Error"+error);
    }
})
