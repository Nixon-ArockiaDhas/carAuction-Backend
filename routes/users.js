import { Router } from 'express';
import { connectToDatabase } from '../db/dbConfig.js'; // MongoDB connection file
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

const router = Router();


// Function to get the users collection
async function getUsersCollection() {
  const db = await connectToDatabase();
  return db.collection('user_list');
}

// Get all users
router.get('/', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching users', error });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const userId = new ObjectId(req.params.id);
    const user = await usersCollection.findOne({ _id: userId });
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user', error });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const {
      first_name,
      last_name,
      email,
      mobile_number,
      alternate_number,
      pincode,
      city,
      state,
      pan,
      aadhar,
      role
    } = req.body;

    // Check if the email already exists in the database
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'Email already exists' });
    }

    const user_id = Math.floor(10000 + Math.random() * 90000);
    const generatedPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = {
      user_id,
      first_name,
      last_name,
      email,
      password: hashedPassword,
      mobile_number,
      alternate_number,
      pincode,
      city,
      state,
      pan,
      aadhar,
      role,
      status: 'active'
    };

    const result = await usersCollection.insertOne(newUser);

    // Create a transporter using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"Admin Team" <${process.env.EMAIL_ADDRESS}>`,
      to: email,
      subject: 'Welcome to Car Auction',
      text: `Hello ${first_name} ${last_name},

We are delighted to welcome you to our platform! Below, you will find the details of your account:

Email: ${email}

Password: ${generatedPassword}

For your security, we kindly ask that you keep your password confidential. 
It is highly recommended that you change your password upon your first login to ensure the protection of your account.

If you have any questions or require assistance, please do not hesitate to reach out to our support team. We are here to help you!

Best regards,
Car Auction Team`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(201).send({
      message: 'User created',
      userId: result.insertedId,
      generatedPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ message: 'Error creating user', error: error.message });
  }
});


// Update user by ID
router.put('/:id', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const userId = req.params.id;
    const { first_name, last_name, email, password, mobile_number, alternate_number,
      pincode, city, state, pan, aadhar, role, status } = req.body;

    let updateObject = {
      first_name, last_name, email, mobile_number, alternate_number,
      pincode, city, state, pan, aadhar, role
    };

    // Only hash and update the password if it is provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateObject.password = hashedPassword;
    }

    if (status) {
      updateObject.status = status;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateObject }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'User not found or no changes applied' });
    }

    res.send({ message: 'User updated successfully', userId });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send({ message: 'Error updating user', error: error.message });
  }
});


// Delete user by ID
router.delete('/:id', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const userId = req.params.id;
    const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send({ message: 'User deleted successfully', id: userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send({ message: 'Error deleting user', error: error.message });
  }
});

// Change password
router.put('/change-password/:id', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();
    const userId = req.params.id;
    const { password, newPassword } = req.body;

    if (!password || !newPassword) {
      return res.status(400).send({ message: 'Current password and new password are required' });
    }

    // Find the user by ID
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid current password' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedNewPassword } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).send({ message: 'Failed to update password' });
    }

    res.send({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).send({ message: 'Error changing password', error: error.message });
  }
});

// Get user summary for dashboard
router.get('/dashboard/users-summary', async (req, res) => {
  try {
    const usersCollection = await getUsersCollection();

    // Aggregate counts for active and inactive users
    const totalUsers = await usersCollection.countDocuments();
    const activeUsers = await usersCollection.countDocuments({ status: 'active' });
    const inactiveUsers = await usersCollection.countDocuments({ status: 'inactive' });

    res.send({
      totalUsers: String(totalUsers).padStart(2, '0'),
      activeUsers: String(activeUsers).padStart(2, '0'),
      inactiveUsers: String(inactiveUsers).padStart(2, '0')
    });
  } catch (error) {
    console.error('Error fetching user summary:', error);
    res.status(500).send({ message: 'Error fetching user summary', error: error.message });
  }
});

export default router;
