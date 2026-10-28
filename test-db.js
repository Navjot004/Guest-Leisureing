const mongoose = require('mongoose');

const uri = "mongodb+srv://princevegetasaiyan01234_db_user:navjot1234@navjot.4m1pws3.mongodb.net/guest_leisureing?retryWrites=true&w=majority";

async function testConnection() {
  try {
    console.log("Attempting connection to MongoDB Atlas...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("MongoDB Connection SUCCESSFUL! Connected to:", mongoose.connection.name);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("MongoDB Connection FAILED:", err.message);
    process.exit(1);
  }
}

testConnection();
