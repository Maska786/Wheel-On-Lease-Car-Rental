const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin-models');

mongoose.connect('mongodb://127.0.0.1:27017/carRental')
  .then(async () => {
    try {
      const email = 'admin@balqis.com';
      const plainPassword = 'admin';
      
      let admin = await Admin.findOne({ email });
      if (admin) {
        // Update password to be sure
        admin.password = await bcrypt.hash(plainPassword, 10);
        await admin.save();
        console.log('Existing admin password reset.');
      } else {
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        admin = new Admin({
          name: 'Super Admin',
          email: email,
          password: hashedPassword,
          role: 'admin'
        });
        await admin.save();
        console.log('New admin created.');
      }
      console.log(`Email: ${email}`);
      console.log(`Password: ${plainPassword}`);
    } catch (err) {
      console.error(err);
    } finally {
      mongoose.connection.close();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });
