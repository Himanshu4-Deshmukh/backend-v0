const port = 4000;
  const express  = require("express");
  const app = express();
  const jwt =require("jsonwebtoken");
  const multer = require("multer");
  const path = require("path");
  const mongoose = require("mongoose");
  const cors = require("cors");
  const bcrypt = require('bcrypt');

  import('node-fetch').then(({ default: fetch }) => {
      // Use fetch here
  }).catch(err => {
      console.error('Failed to load node-fetch', err);
  });

  const request = require('request');
  // using this our react will connect to the backend
  app.use(cors());

  mongoose.connect('mongodb://localhost:27017/');
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
    }


  })


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



  // Crreatind Endpoint for registering 
  app.post('/signup',async(req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with the same email adress"})
    }
    let credits = {};
  
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        companyname:req.body.companyname,
        number:req.body.number
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})


  })

// Endpoint for user signup
app.post('/signup', async (req, res) => {
  try {
      // Check if user with the same email already exists
      let check = await Users.findOne({ email: req.body.email });
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
app.post('/login', async (req, res) => {
  try {
      // Find user by email
      let user = await Users.findOne({ email: req.body.email });
      if (user) {
          // Compare hashed passwords
          const passCompare = await bcrypt.compare(req.body.password, user.password);
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



  app.post('/credits', (req, res) => {
    try {
      

        // Assuming token is sent in the Authorization header
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'secret_ecom');
        const userId = decoded.user.id;

        // Find the user by ID
        Users.findById(userId)
            .then(user => {
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Decrease user's credits
                user.credits -= 3; // Decrease by 3 credits
                return user.save();
            })
            .then(updatedUser => {
                res.status(200).json({ message: 'Challan viewed successfully', userCredits: updatedUser.credits });
            })
            .catch(error => {
                console.error('Error viewing credits:', error);
                res.status(500).json({ error: 'Internal server error' });
            });
    }
    catch (error) {
        console.error('Error viewing credits', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  // for adv rc details
  app.post('/advcredits', (req, res) => {
    try {
      

        // Assuming token is sent in the Authorization header
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'secret_ecom');
        const userId = decoded.user.id;

        // Find the user by ID
        Users.findById(userId)
            .then(user => {
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Decrease user's credits
                user.credits -= 8; // Decrease by 3 credits
                return user.save();
            })
            .then(updatedUser => {
                res.status(200).json({ message: 'Challan viewed successfully', userCredits: updatedUser.credits });
            })
            .catch(error => {
                console.error('Error viewing credits:', error);
                res.status(500).json({ error: 'Internal server error' });
            });
    }
    catch (error) {
        console.error('Error viewing credits', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  const apiKey = 'a4db0f87-a8db-48ed-b91f-af2cf1369c9f';
  const accountId = '04259ab9861e/814cd672-bd23-4aff-96dd-87caed118df2';


  // POST endpoint to handle /challans
  app.post('/challans', (req, res) => {

    
    
    console.log(req.body)
    const externalApiUrl = 'https://eve.idfy.com/v3/tasks/async/verify_with_source/ind_rc_challan';
    const requestData = req.body;
    console.log(requestData)

    const options = {
      method: 'POST',
      url: externalApiUrl,
      headers: {
        'api-key': apiKey,
        'account-id': accountId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error('Error:', error);
        res.status(500).send('Error making request to external API');
        return;
      }

      console.log('Response from external API:', body);

      const responseBody = JSON.parse(body);
      console.log(responseBody)
      const requestId = responseBody.request_id;

      setTimeout( () => {
        const apiUrl = 'https://eve.idfy.com/v3/tasks';
    const getRequestUrl = ${apiUrl}?request_id=${requestId};
    const options = {
      method: 'GET',
      url: getRequestUrl,
      headers: {
        'api-key': apiKey,
        'account-id': accountId,
        'Content-Type': 'application/json'
      }
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error('Error:', error);
        return;
      }

      res.status(200).json(body);
      console.log(body);
      // Send task details to frontend or process it further as needed
    });
      }, 5000);
    });
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
    }


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
            const passCompare = await bcrypt.compare(req.body.password, user.password);
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