// import dependencies
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
const session = require("express-session");

//const bodyParser = require('body-parser'); // not required for Express 4.16 onwards as bodyParser is now included with Express
// set up expess validator
const { check, validationResult } = require("express-validator"); //destructuring an object

// connect to DB
mongoose.connect("mongodb://localhost:27017/abcdebugsubmissionticketsystem", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// define the model

const Submission = mongoose.model("Submission", {
  userName: String,
  userEmailOrPhone: String,
  bugDescription: String,
  bugImageName: String,
});

// define model for admin

const Admin = mongoose.model("Admin", {
  adminName: String,
  adminPassword: String,
});

// set up variables to use packages
var myApp = express();

// set up the session middleware
myApp.use(
  session({
    secret: "abcde",
    resave: false,
    saveUninitialized: true,
  })
);

// myApp.use(bodyParser.urlencoded({extended:false})); // old way before Express 4.16
myApp.use(express.urlencoded({ extended: false })); // new way after Express 4.16
myApp.use(fileUpload()); // set up the express file upload middleware to be used with Express
// set path to public folders and view folders

myApp.set("views", path.join(__dirname, "views"));
//use public folder for CSS etc.
myApp.use(express.static(__dirname + "/public"));
myApp.set("view engine", "ejs");

//var userNameRegex = /^[a-zA-Z0-9]{1,}\s[a-zA-Z0-9]{1,}$/;

// set up different routes (pages) of the website
// render the home page
myApp.get("/", function (req, res) {
  res.render("home"); // will render views/home.ejs
});
// render the login page
myApp.get("/login", function (req, res) {
  res.render("login"); // will render views/login.ejs
});

myApp.post("/login", function (req, res) {
  // fetch admin name and password
  var adminName = req.body.adminName;
  var adminPassword = req.body.adminPassword;

  // find admin name and password it in the database
  Admin.findOne({ adminName: adminName, adminPassword: adminPassword }).exec(
    function (err, admin) {
      // set up the session variables for logged-in admin
      console.log("Errors: " + err);
      if (admin) {
        req.session.adminName = admin.adminName;
        req.session.loggedIn = true;
        // redirect to dashboard
        res.redirect("/dashboard");
      } else {
        res.redirect("/login"); // in case want to redirect the admin to login
        // alternatively, render login form with errors
        //res.render('login', {error: 'Incorrect username/password'}); // complete the logic on login.ejs file to show the error only if error is undefined.
      }
    }
  );
});

// show all submissions
myApp.get("/dashboard", function (req, res) {
  if (req.session.loggedIn) {
    // code to fetch all the submissions from db and send to the view dashboard
    Submission.find({}).exec(function (err, submissions) {
      console.log(err);
      console.log(submissions);
      res.render("dashboard", { submissions: submissions }); // will render views/dashboard.ejs
    });
  } else {
    res.redirect("/login");
  }
});

myApp.get("/logout", function (req, res) {
  // destroy the whole session
  // req.session.destroy();
  // alternatively just unset the variables which had been set
  req.session.adminName = "";
  req.session.adminPassword = "";
  req.session.loggedIn = false;
  res.redirect("/login");
});

// show only one card depending on the id, just like amazon products
myApp.get("/print/:submissionid", function (req, res) {
  // --------add some logic to put this page behind login---------
  // code to fetch a submission and create pageData
  var submissionId = req.params.submissionid;
  Submission.findOne({ _id: submissionId }).exec(function (err, submission) {
    res.render("viewsubmission", submission); // render viewsubmission.ejs with the data from submission
  });
});
// to delete a card from the database
myApp.get("/delete/:submissionid", function (req, res) {
  // --------add some logic to put this page behind login---------
  var submissionId = req.params.submissionid;
  Submission.findByIdAndDelete({ _id: submissionId }).exec(function (
    err,
    submission
  ) {
    res.render("deletesuccess"); // render delete.ejs
  });
});
// edit a card
myApp.get("/edit/:submissionid", function (req, res) {
  // --------add some logic to put this page behind login---------
  var submissionId = req.params.submissionid;
  // write some logic to show the card in a form with the details
  Submission.findOne({ _id: submissionId }).exec(function (err, submission) {
    res.render("edit", submission); // render edit.ejs with the data from submission
  });
});

// process the edited form from admin
myApp.post("/editprocess/:submissionid", function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect("/login");
  } else if (!errors.isEmpty()) {
    const errors = validationResult(req);
    console.log(errors);
    res.render("edit", { er: errors.array() });
  } else {
    //fetch all the form fields
    var userName = req.body.userName; // the key here is from the name attribute not the id attribute
    var userEmailOrPhone = req.body.userEmailOrPhone;
    var bugDescription = req.body.bugDescription;
    var bugImageName = req.files.bugImage.name;
    var bugImageFile = req.files.bugImage; // this is a temporary file in buffer.
    // check if the file already exists or employ some logic that each filename is unique.
    var bugImagePath = "public/uploads/" + bugImageName;
    // move the temp file to a permanent location mentioned above
    bugImageFile.mv(bugImagePath, function (err) {
      console.log(err);
    });
    // find the submission in database and update it
    var submissionId = req.params.submissionid;
    Submission.findOne({ _id: submissionId }).exec(function (err, submission) {
      // update the submission and save
      submission.userName = userName;
      submission.userEmailOrPhone = userEmailOrPhone;
      submission.bugDescription = bugDescription;
      submission.bugImageName = bugImageName;
      submission.save();
      res.render("editsuccess"); // render editsuccess.ejs
    });
  }
});

// process the form submission from the user
myApp.post("/process", function (req, res) {
  // check for errors
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    res.render("home", { er: errors.array() });
  } else {
    //fetch all the form fields
    var userName = req.body.userName; // the key here is from the name attribute not the id attribute
    var userEmailOrPhone = req.body.userEmailOrPhone;
    var bugDescription = req.body.bugDescription;

    // fetch the file
    // get the name of the file
    var bugImageName = req.files.bugImage.name;
    // get the actual file
    var bugImageFile = req.files.bugImage; // this is a temporary file in buffer.

    // save the file
    // check if the file already exists or employ some logic that each filename is unique.
    var bugImagePath = "public/uploads/" + bugImageName;
    // move the temp file to a permanent location mentioned above
    bugImageFile.mv(bugImagePath, function (err) {
      console.log(err);
    });

    // create an object with the fetched data to send to the view
    var pageData = {
      userName: userName,
      userEmailOrPhone: userEmailOrPhone,
      bugDescription: bugDescription,
      bugImageName: bugImageName,
    };

    // create an object from the model to save to DB
    var userSubmission = new Submission(pageData);
    // save it to DB
    userSubmission.save();

    // send the data to the view and render it
    res.render("submitsuccess");
  }
});

// setup routes

myApp.get("/setup", function (req, res) {
  let adminData = [
    {
      adminName: "admin",
      adminPassword: "admin",
    },
  ];
  Admin.collection.insertMany(adminData);
  res.send("data added");
});

// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log(
  "Everything executed fine.. website at port 8080....http://localhost:8080/"
);
