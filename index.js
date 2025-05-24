const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
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
    await client.connect();

    const database = client.db("groceryStore");
    const productsCollection = database.collection("products");

    // GET all products, supports search by name
    app.get('/api/products', async (req, res) => {
      const { search } = req.query;
      const query = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      try {
        const products = await productsCollection.find(query).toArray();
        res.json(products);
      } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    // GET single product by ID
    app.get('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const product = await productsCollection.findOne({ _id: new ObjectId(id) });
        res.json(product);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
      }
    });

    // POST new product
    app.post('/api/products', async (req, res) => {
      const newProduct = req.body;
      try {
        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
      }
    });

    // PUT update product by ID
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

    // DELETE product by ID
    app.delete('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
      }
    });

    // POST generate PDF receipt using PDFKit
    app.post('/api/generate-receipt', async (req, res) => {
      const cart = req.body.cart;

      if (!cart || cart.length === 0) {
        return res.status(400).send('Cart is empty');
      }

      const doc = new PDFDocument();
      let buffers = [];
      let subtotal = 0;

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="receipt.pdf"',
          'Content-Length': pdfData.length
        });
        res.send(pdfData);
      });

      // Header
      doc.fontSize(20).text('BillCraft Receipt', { align: 'center' });
      doc.moveDown();

      // Date
      const currentDate = new Date().toLocaleString('bn-BD', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.fontSize(12).text(`Date: ${currentDate}`);
      doc.moveDown();

      // Table header
      doc.fontSize(14).text('Item\t\tQty\tPrice\tTotal', { underline: true });

      // Table rows
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        doc.fontSize(12).text(
          `${item.name}\t\t${item.quantity}\t৳${item.price.toFixed(2)}\t৳${itemTotal.toFixed(2)}`
        );
      });

      doc.moveDown();
      doc.fontSize(14).text(`Subtotal: ৳${subtotal.toFixed(2)}`, { align: 'right' });

      doc.end();
    });

    console.log("Connected to MongoDB and API routes are ready.");
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

run().catch(console.dir);

// Default root route
app.get('/', (req, res) => {
  res.send('billcraft running');
});

// Start server
app.listen(port, () => {
  console.log(`billcraft is running on port: ${port}`);
});
