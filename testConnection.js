import { MongoClient } from 'mongodb';

// Replace with your MongoDB connection string
const uri = 'mongodb+srv://nixon:spacebar57@cluster0.va0xc.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(uri);

async function testConnection() {
  try {
    // Attempt to connect to the database
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Optionally, list all databases (for verification)
    const databases = await client.db().admin().listDatabases();
    console.log('Databases:', databases.databases.map(db => db.name));
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    // Close the connection
    await client.close();
  }
}

testConnection();
