import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { connectToDatabase } from '../db/dbConfig.js'; 

const { sign, verify } = jwt;

// Function to login a user
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // Connect to the database and get the users collection
    const db = await connectToDatabase();
    const usersCollection = db.collection('user_list');

    // Find the user by email
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).send('User not found');

    // Compare the provided password with the hashed password in the database
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).send('Invalid password');

    // Generate a JWT token
    const token = sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Send response with token and user details
    res.send({ token, role: user.role, firstName: user.first_name, lastName: user.last_name, email:user.email });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to login');
  }
}

// Middleware to authenticate requests
function authenticate(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).send('Access denied. No token provided.');

  const token = authHeader.split(' ')[1]; // Extract the token after "Bearer"
  if (!token) return res.status(401).send('Access denied. Invalid token format.');

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
}

// Function to get sidebar items based on user role
async function getSidebarItems(req, res) {
  try {
    const role = req.user.role;
    const db = await connectToDatabase();
    const sidebarItemsCollection = db.collection('sidebar_items');

    // Find sidebar items accessible by the user's role and sort by sortOrder
    const items = await sidebarItemsCollection
      .find({ roles: { $in: [role] } })
      .sort({ sortOrder: 1 }) // Sort by sortOrder field
      .toArray();

    // Check if items were found
    if (items.length === 0) {
      return res.status(404).send('No sidebar items found for this role');
    }

    res.send(items);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to fetch sidebar items');
  }
}


// Middleware to authorize roles
function authorize(roles = []) {
  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

export { loginUser, authenticate, getSidebarItems, authorize };
