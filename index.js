const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.sw8z3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth) {
        return res.status(401).send({ message: '401 Unauthorized' });
    }
    const token = auth.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: '403 Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

app.get('/', (req, res) => {
    res.send('Running my server');
})

async function run() {
    try {
        // Connect to DB
        await client.connect();
        const partsCollection = client.db("sonic-techland").collection("parts");
        const reviewsCollection = client.db("sonic-techland").collection("reviews");
        const ordersCollection = client.db("sonic-techland").collection("orders");

        //JWT
        app.post('/auth', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // GET
        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        })
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })
        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        // GET single parts by ID
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const parts = await partsCollection.findOne(query);
            res.send(parts);
        })

        //GET orders by email
        app.get('/userOrders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email };
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(403).send({ message: '403 Forbidden Access' })
            }
        })

        // POST
        app.post('/parts', async (req, res) => {
            const newParts = req.body;
            const result = await partsCollection.insertOne(newParts);
            res.send(result); //admin verify
        })
        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result); //user jwt verify
        })
        app.post('/orders', async (req, res) => {
            const newOrder = req.body;
            const result = await reviewsCollection.insertOne(newOrder);
            res.send(result);
        })

        //PUT
        app.put('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const updatedParts = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updatedParts.updatedQuantity
                }
            }
            const result = await partsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const updatedOrder = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: updatedOrder.updatedStatus
                }
            }
            const result = await ordersCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })

        // DELETE
        app.delete('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log('Running is started');
})
