const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');


const keys = require("./config/keys");
const cors = require('cors')
// const users = require("./routes/api/users");


// Load input validation
const validateRegisterInput = require("./validation/register");
const validateLoginInput = require("./validation/login");

const validateRegisterInputs = require("./validation/ClientRegister");

// Load  model

const User = require("./models/User");
const Admin = require("./models/Admin");
const Merchant = require("./models/Merchant");
const Invoice = require("./models/Invoice");

// twilio api auth
const accountSid = 'ACce651195b50bfaf3a77fc7de41aa5be7';
const authToken = '5b931923e20cddf9b0198d0e3bf6aa5b';
const client = require('twilio')(accountSid, authToken);

const app = express();

app.use(cors());
// Bodyparser middleware
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

// DB Config
const db = require("./config/keys").mongoURI;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { 
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true, }
  )
  .then(() => console.log("MongoDB successfully connected"))
  .catch(err => console.log(err));
// Passport middleware
app.use(passport.initialize());

// Passport config
require("./config/passport")(passport);




//Merchant Apis

// #1 Rgister

app.post("/merchant/register", (req, res) => {
  // Form validation

  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }




  Merchant.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new Merchant({
        name: req.body.name,
        email: req.body.email,
        phone_number: req.body.phone_number,
        password: req.body.password
      });


      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'expodevclub@gmail.com',
          pass: 'Expodevclub@123'
        }
      });

      const URIs = "your email is :" + req.body.email + "and password is:" + req.body.password
      
      var mailOptions = {
        from: 'expodevclub@gmail.com',
        to: req.body.email,
        subject: 'Get Quick Loan',
        text: URIs
      };

     

     

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .then(
              client.messages
              .create({
                 body: 'You have registered as Merchant.  Please login through your email as:' + req.body.email + "and your password for the email is:" + req.body.password,
                 from: '+12058518061',
                 to: req.body.phone_number
               }).then(message => console.log(message.sid))
                
            )
            .then(
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              })
            )
            .catch(err => console.log(err));
        });
      });
    }
  });
});


// @access Public
app.post("/merchant/login", (req, res) => {
  // Form validation

  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  Merchant.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }

    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926 // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});

// get  api
app.get("/merchants", (req, res) => {
  Merchant.find({   
}).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Delter api
app.delete("/merchants/:id", (req, res) => {
  const id = req.params.id;

  Merchant.findByIdAndRemove(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Get  by id api
app.get("/merchants/:id", (req, res) => {
  const id = req.params.id;

  Merchant.findById(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// update api

app.put("/merchants/:id", (req, res) => {
  const _id = req.params.id;
  Merchant.findByIdAndUpdate(_id, req.body)
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Tutorial with id=${_id}. Maybe Tutorial was not found!`
        });
      } else res.send({ message: "Tutorial was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Tutorial with id=" + _id
      });
    });
});

// send invoice api

app.post("/merchant/invoice", (req, res) => {

  const newInvoice = new Invoice({
    userids: req.body.userids,
    musername: req.body.musername,
    email: req.body.email,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    phone_number: req.body.phone_number,
    amount: req.body.amount,
  })

  var rootUrl = 'http://www.tryswifty.com/application?'

  var URIs = rootUrl + "userids=" + newInvoice.userids + "&" + "username=" + newInvoice.musername + "&" 
  + "first_name=" + newInvoice.first_name + "&" + "last_name=" + newInvoice.last_name + "&" + "email=" + newInvoice.email
  + "&" + "amount=" + newInvoice.amount
  
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'expodevclub@gmail.com',
      pass: 'Expodevclub@123'
    }
  });
  
  var mailOptions = {
    from: 'expodevclub@gmail.com',
    to: req.body.email,
    subject: 'Get Quick Loan',
    text: URIs
  };
  
  Invoice.create(newInvoice).then(user => {
  
      newInvoice
            .save()
            .then(
              client.messages
              .create({
                 body: 'Please complete the application for loadn here:' + "" + URIs,
                 from: '+12058518061',
                 to: req.body.phone_number
               }).then(message => console.log(message.sid))
                
            )
            .then(user => res.json(user))
            .catch(err => console.log(err))
  }).then(
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    })
  )
});


app.get('/merchant/invoice', (req, res) => {
  console.log(req.query)
})


// updateprofile merchant
const Mprofile = require("./models/Mprofile");
app.post("/merchant/addprofile", (req, res) => {

  const addprofiles = new Mprofile({
    userid: req.body.userid,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    address: req.body.address,
    address1: req.body.address1,
    phone_number: req.body.phone_number,
    state: req.body.state,
    bussiness: req.body.bussiness,
    city: req.body.city,
    phone_number: req.body.phone_number
  })

  Mprofile.create(addprofiles).then(user => {
  
    addprofiles
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err)); 
  })
});


// get  api
app.get("/mprofiless", (req, res) => {
  Mprofile.find({   
}).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});

// Getprofile by  id api
app.get("/mprofiless/:id", (req, res) => {
  const userid = '23433';

  Mprofile.findById(userid).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});

// get  api
app.get("/invoices", (req, res) => {
  Invoice.find({   
}).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Delter api
app.delete("/invoices/:id", (req, res) => {
  const id = req.params.id;

  Invoice.findByIdAndRemove(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Get  by id api
app.get("/invoices/:id", (req, res) => {
  const id = req.params.id;

  Invoice.findById(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});







//Admin Apis

// #1 Rgister

app.post("/admin/register", (req, res) => {
  // Form validation

  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  Admin.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new Admin({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      });

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});


// @access Public
app.post("/admin/login", (req, res) => {
  // Form validation

  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  Admin.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }

    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926 // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});



// Get  by id api
app.get("/admin/:id", (req, res) => {
  const id = req.params.id;

  Admin.findById(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// update api

app.put("/admin/:id", (req, res) => {
  const _id = req.params.id;
  Admin.findByIdAndUpdate(_id, req.body)
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Tutorial with id=${_id}. Maybe Tutorial was not found!`
        });
      } else res.send({ message: "Tutorial was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Tutorial with id=" + _id
      });
    });
});



//Client Apis

// #1 Rgister

app.post("/register", (req, res) => {
  // Form validation

  const { errors, isValid } = validateRegisterInputs(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        userid: req.body.userid,
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        address: req.body.address,
        address1: req.body.address1,
        amount: req.body.amount,
        state: req.body.state,
        bussiness: req.body.bussiness,
        city: req.body.city,
        phone_number: req.body.phone_number,
        plan: req.body.plan,
        password: req.body.password
      });

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});


// @access Public
app.post("/login", (req, res) => {
  // Form validation

  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  User.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }

    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926 // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});


// get  api
app.get("/users", (req, res) => {
  User.find({   
}).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Delter api
app.delete("/users/:id", (req, res) => {
  const id = req.params.id;

  User.findByIdAndRemove(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// Get  by id api
app.get("/users/:id", (req, res) => {
  const id = req.params.id;

  User.findById(id).then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving data."
      });
    });
});


// update api

app.put("/users/:id", (req, res) => {
  const _id = req.params.id;
  User.findByIdAndUpdate(_id, req.body)
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Tutorial with id=${_id}. Maybe Tutorial was not found!`
        });
      } else res.send({ message: "Tutorial was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Tutorial with id=" + _id
      });
    });
});

const port = process.env.PORT || 4000;

app.listen(port, () => console.log(`Server up and running on port ${port} !`));
