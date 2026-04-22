/**
 * One-time script: sets ayushparasher555@gmail.com as admin.
 * Run once with: node makeAdmin.js
 * Safe to run multiple times — it's idempotent.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_EMAIL = 'ayushparasher555@gmail.com';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const user = await User.findOne({ email: ADMIN_EMAIL });
  if (!user) {
    console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
    console.error('   Make sure this account is registered first.');
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`ℹ️  ${ADMIN_EMAIL} is already an admin. Nothing to do.`);
  } else {
    user.isAdmin = true;
    user.adminSince = new Date();
    await user.save();
    console.log(`🎉 Success! ${ADMIN_EMAIL} (${user.name}) is now an admin.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
