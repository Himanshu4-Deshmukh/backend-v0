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

mongoose.connect('mongodb+srv://vahanfinindia:ITyMcsljxjoVgWJ2@rcinfo.o6vdruh.mongodb.net/?retryWrites=true&w=majority&appName=rcinfo');
app.use(express.json());


const websites = mongoose.model('website',{
  name:{
      type:String,
  },
  status:{
    type:String,
  },
  date:{
      type:Date,
      default:Date.now,
  },
  Rcadvtask:{
    type: Number,
    default: 0
  },
  Rcbasictask:{
    type: Number,
    default: 0
  },
  Rcchallantask:{
    type: Number,
    default:0
  },
  Parivahan:{
    type: Number,
    default:0

  },
  Totalreq:{
    type: Number,
    default:0
  },
})

const vehicleSchema =  mongoose.model('Vehicle',{
  userid: {
    type: String,
    required: true
  },
  vehicleNo: {
    type: String,
    required: true
  },
  status: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  rcData: {
    type: mongoose.Schema.Types.Mixed, // Changed to Mixed type to store any data structure
    default: {}
  },
  rcEchallan: {
    type: Number,
    default: 0
  }
});



const Payments = mongoose.model('Payments',{

    
  orderAmount: {
    type: Number,
    required: true,
  },
  companyName: String,
  address: String,
  selectedState: String,
  hasGst: Boolean,
  gstNumber: String,
  customerDetails: {
    customerId: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String,
  },
  orderId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: String,
});


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



app.post('/signupp', async (req, res) => {
  try {
      // Check if user with the same email already exists
      let userr = await Users.findOne({ $or: [{ email: req.body.email }, { name: req.body.username }] });

    if (userr) {
      // If user exists, generate and return JWT token
      const token = jwt.sign({ user: { id: userr.id } }, 'secret_ecom', { expiresIn: '1h' });
      return res.json({ success: true, token });
    }


    const emailPrefix = req.body.email.substring(0, 6);
      const randomNumber = Math.floor(100000 + Math.random() * 900000); 
      const apikey = emailPrefix + randomNumber;
      // Hash the password
      const hashedPassword = await bcrypt.hash('defult1234', 10);
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



// add by rajni


app.get('/echallan', async (req, res) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const type = req.headers.type;
    console.log(type)
    
    // // Verify and decode the token
    const decoded = jwt.verify(token, 'secret_ecom');
    const userId = decoded.user.id;

    // Find the user by ID
    const user = await Users.findById(userId);
    const website =  await websites.findOne({ name: 'Parivahan' });

    

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }

    

    const { rcNumber } = req.query;

    
    let jsonData
    // const type ='hi'
    if (type==='rcchallan'){

        
        // console.log(data)


        const response2 = await fetch(`http://103.211.219.91:4040/echallan/${rcNumber}`, {
                    method: 'GET'
                });
       const url = `http://103.211.219.91:4040/vehiclenumber/${rcNumber}`;

        const response = await axios.get(url);
        const xmlData = response.data.response[0].response;
        const data = await response2.json();

        // Parse XML data to JSON
        parseString(xmlData, (err, result) => {
          if (err) {
            console.error('Error parsing XML:', err);
            res.status(500).json({ error: 'Error parsing XML' });
          } else {


            


            let pendingData

            let owner

            
            
        // if (!response2.ok) {
        //     throw new Error('echallan not working');
        // }
        

            
            if(data.response[0].response.code){
              console.log(data.response[0].response.code)
              const pendingData = ''
              
            }else{
            // const disposedData = data.response[0].response.data.Disposed_data;
             if(data.response[0].response.data && data.response[0].response.data.Pending_data){
              pendingData = data.response[0].response.data.Pending_data;
              // owner = data.response[0].response.data.Pending_data[0].owner_name[0];
             }else{
               pendingData = ''
             }
            }

              const jsonData = {
                  stauts: result.VehicleDetails.stautsMessage[0],
                  rc_regn_no: result.VehicleDetails.rc_regn_no[0],
                  rc_regn_dt: result.VehicleDetails.rc_regn_dt[0],
                  rc_regn_upto: result.VehicleDetails.rc_regn_upto[0],
                  rc_owner_name: result.VehicleDetails.rc_owner_name[0], //dome
                  rc_chasi_no: result.VehicleDetails.rc_chasi_no[0],
                  rc_eng_no: result.VehicleDetails.rc_eng_no[0],
                  rc_fit_upto: result.VehicleDetails.rc_fit_upto[0],
                  rc_tax_upto: result.VehicleDetails.rc_tax_upto[0],
                  rc_financer: result.VehicleDetails.rc_financer[0],
                  rc_insurance_comp: result.VehicleDetails.rc_insurance_comp[0],
                  rc_insurance_policy_no: result.VehicleDetails.rc_insurance_policy_no[0],
                  rc_insurance_upto: result.VehicleDetails.rc_insurance_upto[0],
                  rc_registered_at: result.VehicleDetails.rc_registered_at[0],
                  rc_status_as_on: result.VehicleDetails.rc_status_as_on[0],
                  rc_pucc_upto: result.VehicleDetails.rc_pucc_upto[0] || '',
                  rc_status: result.VehicleDetails.rc_status[0],
                  rc_ncrb_status: result.VehicleDetails.rc_ncrb_status[0],
                  rc_blacklist_status: result.VehicleDetails.rc_blacklist_status[0],
                  rc_noc_details: result.VehicleDetails.rc_noc_details[0],
                  echallan: pendingData

                  
                
              };

              user.credits -= 10; // Decrease by 3 credits
              user.RcchallanAdv += 1;
              user.save();

              website.Parivahan +=2
              website.save();

              
              // console.log(jsonData)
              res.json(jsonData);
            }
      })


  }else{
    const response2 = await fetch(`http://103.211.219.91:4040/echallan/${rcNumber}`, {
            method: 'GET'
        });
        if (!response2.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response2.json();
        let pendingData
        let disposedData

            let owner = ''

            
            if(data.response[0].response.code){
              console.log(data.response[0].response.code)
              const pendingData = ''
              const jsonData = {
                stauts: 'data not found',
                pending: '',
                dispose: ''
              };
  
              // user.credits -= 2; // Decrease by 3 credits
              // user.Rcbasictask += 1;
              // user.save();
              res.json(jsonData);

              

              
            }else{

              

              if(data.response[0].response.data.Disposed_data){
              disposedData = data.response[0].response.data.Disposed_data;
              }else{
                disposedData = ''
              }
              if(data.response[0].response.data.Pending_data){
                pendingData = data.response[0].response.data.Pending_data;
                if(data.response[0].response.data.Pending_data[0].owner_name){
                  owner = data.response[0].response.data.Pending_data[0].owner_name;

                }
                
              }else{
                pendingData = ''
              }

              const jsonData = {
                stauts: 'ok',
                pending: pendingData,
                dispose: disposedData
              };


    
              user.credits -= 2; // Decrease by 3 credits
              user.Rcchallantask += 1;

              user.save();
              website.Parivahan +=1
              website.save();
              res.json(jsonData);

            }

            


  }


  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getVehicleInfo', async (req, res) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const type= req.headers.type;
    // console.log(type)
    
    // Verify and decode the token
    const decoded = jwt.verify(token, 'secret_ecom');

    // Assuming you have a middleware to decode user ID from the token
    const userId = decoded.user.id;
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }
    // Retrieve rcNumber from the query parameters
    const { rcNumber } = req.query;

    const url = `http://103.211.219.91:4040/vehiclenumber/${rcNumber}`;

    const response = await axios.get(url);
    const xmlData = response.data.response[0].response;
    const existingVehicle = await vehicleSchema.findOne({ vehicleNo: rcNumber });
    const website =  await websites.findOne({ name: 'Parivahan' });

    // Parse XML data to JSON
    parseString(xmlData, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        res.status(500).json({ error: 'Error parsing XML' });
      } else {

        let jsonData

        

        if (existingVehicle) {
          console.log('Vehicle already exists with vehicleNo:', rcNumber);
          // return existingVehicle; // Return the existing vehicle if found
        }else{
          const vehi = new  vehicleSchema ({
            userid: userId,
            vehicleNo: rcNumber, // Assuming rcNumber is the vehicle number
            status:  result.VehicleDetails.stautsMessage[0], // Ensure this is extracted correctly
            rcData: result.VehicleDetails // Storing the entire JSON object
          });

        // Save the user to the database
          vehi.save();
        }

       




        if (type=='basic'){


          const jsonData = {
            //   Status: result.VehicleDetails.stautsMessage[0], 

              vehicle_no: result.VehicleDetails.rc_regn_no[0],

              registered_date: result.VehicleDetails.rc_regn_dt[0],

              status_as_on: result.VehicleDetails.rc_status_as_on[0],

              vehicle_valid_upto: result.VehicleDetails.rc_regn_upto[0],

 
              chassis_no: result.VehicleDetails.rc_chasi_no[0].slice(0, -5) + '*****', 
              

              engine_no : result.VehicleDetails.rc_eng_no[0],

              owner_name: result.VehicleDetails.rc_owner_name[0],

              vehicle_description: result.VehicleDetails.rc_vh_class_desc[0],


              maker_description: result.VehicleDetails.rc_maker_desc[0],

              maker_model: result.VehicleDetails.rc_maker_model[0],
               
              fuel_type: result.VehicleDetails.rc_fuel_desc[0],

              vehicle_color: result.VehicleDetails.rc_color[0],

              insurance_validity: result.VehicleDetails.rc_insurance_upto[0],

              unladen_weight: result.VehicleDetails.rc_unld_wt[0],

              registered_at: result.VehicleDetails.rc_registered_at[0],

              pucc_validity: result.VehicleDetails.rc_pucc_upto[0],
             
              vehicle_class: result.VehicleDetails.rc_vh_class[0]
              
          };

          

          website.Parivahan +=1
          website.save();

          user.credits -= 2; // Decrease by 3 credits
          user.Rcbasictask += 1;
          user.save();
          res.json(jsonData);
        }else{


            const jsonData = {
              
    "Vehicle Number": result.VehicleDetails.rc_regn_no[0],
    "Registered Date": result.VehicleDetails.rc_regn_dt[0],
    "Status As On": result.VehicleDetails.rc_status_as_on[0],
    "Owner Serial": result.VehicleDetails.rc_owner_sr[0],
    "Vehicle Valid Upto": result.VehicleDetails.rc_regn_upto[0],
    "Insurance Valid Upto": result.VehicleDetails.rc_insurance_upto[0],
    "PUC Validity": result.VehicleDetails.rc_pucc_upto[0],
    "Fitness Validity": result.VehicleDetails.rc_fit_upto[0],
    "Chassis NO.": result.VehicleDetails.rc_chasi_no[0],
    "Engine NO.": result.VehicleDetails.rc_eng_no[0],
    "Financer Name": result.VehicleDetails.rc_financer[0],
    "Insurance Company Name": result.VehicleDetails.rc_insurance_comp[0],
    "PUCC Number": result.VehicleDetails.rc_pucc_no[0],
    "Policy Number": result.VehicleDetails.rc_insurance_policy_no[0],
    "Vehicle Model": result.VehicleDetails.rc_maker_model[0],
    "Vehicle Color": result.VehicleDetails.rc_color[0],
    "Fuel Type": result.VehicleDetails.rc_fuel_desc[0],
    "Registered RTO": result.VehicleDetails.rc_registered_at[0],
    "Vehicle Category": result.VehicleDetails.rc_vch_catg[0],
    "Vehicle Description": result.VehicleDetails.rc_vh_class_desc[0],
    "Maker Description": result.VehicleDetails.rc_maker_desc[0],
    "Cubic Capacity": result.VehicleDetails.rc_cubic_cap[0],
    "Body Type Description": result.VehicleDetails.rc_body_type_desc[0],
    "Norms Description": result.VehicleDetails.rc_norms_desc[0],
    "Unladen Weight": result.VehicleDetails.rc_unld_wt[0],
    "Gross Vehicle Weight": result.VehicleDetails.rc_gvw[0],
    "RC Status": result.VehicleDetails.rc_status[0],
    "Blacklist Status": result.VehicleDetails.rc_blacklist_status[0],
    "NCRB Status": result.VehicleDetails.rc_ncrb_status[0],
    "NOC Details": result.VehicleDetails.rc_noc_details[0],
    "State Code": result.VehicleDetails.state_cd[0],
    "RTO Code": result.VehicleDetails.rto_cd[0],
    "Manufacture Month & Year": result.VehicleDetails.rc_manu_month_yr[0],
    "Number of Cylinders": result.VehicleDetails.rc_no_cyl[0],
    "Purchase Date": result.VehicleDetails.rc_purchase_dt[0],
    "Current Address District Code": result.VehicleDetails.rc_currentadd_districtcode[0],
    "Current Address State Name": result.VehicleDetails.rc_currentadd_statename[0],
    "Current Address Pincode": result.VehicleDetails.rc_currentadd_pincode[0],
    "Owner Name": result.VehicleDetails.rc_owner_name[0],
    "Father Name": result.VehicleDetails.rc_f_name[0],
    "Present Address": result.VehicleDetails.rc_present_address[0],
    "Mobile No": result.VehicleDetails.rc_mobile_no[0]
              
              
             
            
          };

          website.Parivahan +=1
          website.save();
          user.credits -= 5; // Decrease by 3 credits
          user.Rcadvtask += 1;
            user.save();

            res.json(jsonData);
            
        }

        // Send the JSON object as the response
        // console.log(jsonData)
        
      }
});


    // const responseData = response.data;
  

    // res.json(responseData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/apikey', async (req, res) => {
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

    res.status(200).json({ apikey: user.apikey });
    
  } catch (error) {
    console.error('Error fetching user api:', error);
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

//for advcedits usage
app.get('/Rcadvtask', async (req, res) => {
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

    res.status(200).json({ Rcadvtask: user.Rcadvtask });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/Rcadvtask', (req, res) => {
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
              user.Rcadvtask += 1; // Decrease by 3 credits
              return user.save();
          })
          .then(updatedUser => {
              res.status(200).json({ message: 'Challan viewed successfully', Rcadvtask: updatedUser.Rcadvtask });
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

//For challan  usage

app.get('/Rcchallantask', async (req, res) => {
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

    res.status(200).json({  Rcchallantask: user.Rcchallantask });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/Rcchallantask', (req, res) => {
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
              user.Rcchallantask += 1; // Decrease by 3 credits
              return user.save();
          })
          .then(updatedUser => {
              res.status(200).json({ message: 'Challan viewed successfully', Rcchallantask: updatedUser.Rcchallantask });
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


// after successful payment this will be called
app.post('/addcredits', (req, res) => {
  try {
      // Assuming token is sent in the Authorization header
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, 'secret_ecom');
      const userId = decoded.user.id;

      // Extract the amount of credits to add from the request body
      const { credits } = req.body;
      if (!credits || typeof credits !== 'number' || credits <= 0) {
          return res.status(400).json({ error: 'Invalid credits amount' });
      }

      // Find the user by ID
      Users.findById(userId)
          .then(user => {
              if (!user) {
                  return res.status(404).json({ error: 'User not found' });
              }

              // Increment user's credits
              user.credits += credits; // Increase by the specified amount
              return user.save();
          })
          .then(updatedUser => {
              res.status(200).json({ message: 'Credits added successfully', userCredits: updatedUser.credits });
          })
          .catch(error => {
              console.error('Error adding credits:', error);
              res.status(500).json({ error: 'Internal server error' });
          });
  } catch (error) {
      console.error('Error adding credits:', error);
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



app.post('/cashfree', async (req, res) => {

  try {
    

    // Assuming token is sent in the Authorization header
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'secret_ecom');
    const userId = decoded.user.id;

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const {
      totalAmount,
      companyName,
      address,
      selectedState,
      hasGst,
      gstNumber,
      number
      // Add more fields as needed
    } = req.body;
    // console.log(req.body)





    const config = {
      headers: {
        'X-Client-Id': 'TEST10200959c9b7b510b911a8312a3e95900201',
        'X-Client-Secret': 'cfsk_ma_test_dec4b914d7c755a06f6bf3a7baf8027e_f138bd1f',
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       
      }
    };
  
    const data = {
      order_amount: totalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: `+91${number}`
      },
      order_meta: {
        return_url: 'https://rc.vahanfin.com/order?order_id={order_id}'
      },
      order_note: 'Test order'
    };
  
 
      const response = await axios.post('https://sandbox.cashfree.com/pg/orders', data, config);
      const paymentSessionId = response.data.payment_session_id;


      // console.log(response.data)
      const ff = paymentSessionId //`https://cashfree.com/checkout/pg/${paymentSessionId}`

      const { order_id: orderId } = response.data;
    
        // Save payment data to MongoDB
        const newPayment = new Payments({
          orderAmount: totalAmount,
          companyName,
          address,
          selectedState,
          hasGst,
          gstNumber,
          customerDetails: {
            customerId: userId,
            customerName: user.name,
            customerEmail: user.email,
            customerPhone: `+91${number}`,
          },
          orderId,
          status: 'pending',
        });

        await newPayment.save();

      res.status(200).json({ url: ff });
      // res.redirect(`https://cashfree.com/checkout/pg/${paymentSessionId}`);
   

    
  }
  catch (error) {
      // console.error('Error viewing credits', error);
      res.status(500).json({ error: 'Internal server error'+error });
  }




});

// check oder id

app.get('/check-order/:order_id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const { order_id } = req.params;

 
    // const decoded = jwt.verify(token, 'secret_ecom');
    // const userId = decoded.user.id;

    // const user = await Users.findById(userId);

    // if (!user) {
    //   return res.status(404).json({ error: 'User not found' });
    // }
    
    const config = {
      headers: {
        'X-Client-Id': 'TEST10200959c9b7b510b911a8312a3e95900201',
        'X-Client-Secret': 'cfsk_ma_test_dec4b914d7c755a06f6bf3a7baf8027e_f138bd1f',
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       
      }
    };

  try {
    const response = await axios.get(`https://sandbox.cashfree.com/pg/orders/${order_id}`, config);
    const orderStatus = response.data;
    const  order_amount = response.order_amount;
    const Status = response.data.order_status;
    const oderID = response.data.order_id
    const session =  response.data.payment_session_id
    const userId = response.data.customer_details.customer_id
    // console.log(userid)
    // console.log(orderStatus)
    // console.log(Status,oderID,session)
    // res.json(orderStatus);

    if(Status=='ACTIVE'){
      // const oder = await Payments.findOne({ orderId: oderID });,oderid: oder.status


      res.status(200).json({ url: session ,status: "ACTIVE",oderid:oderID});


    }else if(Status=="PAID"){

      const oder = await Payments.findOne({ orderId: oderID });
      console.log(oder)
      
      if (oder) {
        if(oder.status=='pending'){

          const user = await Users.findById(userId);
          oder.status = "success";
          await oder.save()

          console.log(user,oder.orderAmount)
          user.credits += oder.orderAmount;
          await user.save();
          res.status(200).json({ url: session ,status: "PAID",oderid: oderID});


        }else{

          res.status(200).json({ url: session ,status: "Already Clamed",oderid: oderID});

        }


      
      }else{
        res.status(200).json({ url: session ,status: "Already Clamed",oderid: oderID});
      }

    }else{
      res.status(200).json({ url: session ,status: "UNKNOW",oderid: oderID});

    }
  } catch (error) {
    console.error('Error checking order status:', error);
    res.status(500).json({ error: 'Failed to check order status' });
  }
});

//Dummy account credentials
// const apiKey = 'a4db0f87-a8db-48ed-b91f-af2cf1369c9f';
// const accountId = '04259ab9861e/814cd672-bd23-4aff-96dd-87caed118df2';


// Orginal account credentials
const apiKey  = 'e713633b-ab11-485c-8153-5654c5a0ccd3';
const accountId = '69b202aee524/c95b76ad-9d0e-4e0f-9ba0-c8b7c640f3a8';


// POST endpoint to handle /challans
app.post('/basicrc', (req, res) => {

  
  
  console.log(req.body)
  const externalApiUrl = 'https://eve.idfy.com/v3/tasks/async/verify_with_source/ind_rc_basic';
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
  const getRequestUrl = `${apiUrl}?request_id=${requestId}`;
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
  

  
  
// POST endpoint to handle /challans
app.post('/advrc', (req, res) => {

  
  
  console.log(req.body)
  const externalApiUrl = 'https://eve.idfy.com/v3/tasks/async/verify_with_source/ind_rc_plus';
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
  const getRequestUrl = `${apiUrl}?request_id=${requestId}`;
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
    }, 10000);
  });
});

// challans

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
  const getRequestUrl = `${apiUrl}?request_id=${requestId}`;
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
    }, 10000);
  });
});
  


app.post('/details', (req, res) => {

    const requestData = req.body;

    const options = {
      method: 'POST',
      url: 'https://rto-vehicle-information-india.p.rapidapi.com/getVehicleInfo',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': '742c463415msh55159cb981c077ep151d70jsnccb39958e318',
        'X-RapidAPI-Host': 'rto-vehicle-information-india.p.rapidapi.com'
      },
      body: JSON.stringify(requestData)
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
  
})




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