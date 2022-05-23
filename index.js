const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jvaqe.mongodb.net/?retryWrites=true&w=majority`;
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
        const itemCollection = client.db("Template-DB").collection("collections");

        //JWT
        app.post('/auth', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // GET
        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })

        // GET single item by ID
        app.get('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await itemCollection.findOne(query);
            res.send(item);
        })

        //GET single items by email
        app.get('/addeditems', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email };
                const cursor = itemCollection.find(query);
                const items = await cursor.toArray();
                res.send(items);
            }
            else {
                res.status(403).send({ message: '403 Forbidden Access' })
            }
        })

        // POST
        app.post('/items', async (req, res) => {
            const newItem = req.body;
            const result = await itemCollection.insertOne(newItem);
            res.send(result);
        })

        //PUT
        app.put('/items/:id', async (req, res) => {
            const id = req.params.id;
            const updatedItem = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updatedItem.updatedQuantity
                }
            }
            const result = await itemCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })

        // DELETE
        app.delete('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await itemCollection.deleteOne(query);
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
