const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
    host: "mail.yourcraft.pl",
    port: 587,
    secure: false,
    auth: {
      user: 'kontakt@yourcraft.pl',
      pass: 'zgPC2Us*ozRdU4b',
    },
  });
  
  var mailOptions = {
    from: 'kontakt@yourcraft.pl',
    to: 'wiktor101a@wp.pl',
    subject: 'Sending Email using Node.js',
    text: 'That was easy!'
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 