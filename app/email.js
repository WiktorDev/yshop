const nodemailer = require("nodemailer");


exports.sendMail = (user, code) => {
    let transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      });
      var mailOptions = {
        from: process.env.MAIL_USER,
        to: user,
        subject: 'Aktywacja konta yshop.cf',
        text: 'Twoj kod aktywacyjny to: ' + code + ' Aktywuj konto na: https://yshop.cf/auth/activate/?code='+code,
        html: ''
      };
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email zostal wyslany: ' + info.response);
        }
    }); 
}