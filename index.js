const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d3z2xp4.mongodb.net/`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database = client.db("groceryStore");
    const productsCollection = database.collection("products");

    // READ: Get all products (supports search only)
    app.get('/api/products', async (req, res) => {
      const { search } = req.query;
      const query = {};

      if (search) {
        query.name = { $regex: search, $options: 'i' }; // case-insensitive name search
      }

      try {
        const products = await productsCollection.find(query).toArray();
        res.json(products);
      } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    // READ: Get a single product by ID
    app.get('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const product = await productsCollection.findOne({ _id: new ObjectId(id) });
        res.json(product);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
      }
    });

    // CREATE: Add a new product
    app.post('/api/products', async (req, res) => {
      const newProduct = req.body;
      try {
        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
      }
    });

    // UPDATE: Modify a product by ID
    app.put('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      const updatedProduct = req.body;

      try {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedProduct }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
      }
    });

    // DELETE: Remove a product by ID
    app.delete('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
      }
    });

    console.log("Connected to MongoDB and API routes are ready.");
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
  res.send('billcraft running');
});

// Start server
app.listen(port, () => {
  console.log(`billcraft is running on port: ${port}`);
});