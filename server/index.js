const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
// cors allows us to make a calls from our domain/port to a different domain/port
app.use(cors());
// parse incomming request to json
app.use(bodyParser.json());

// Postgress client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
});

pgClient.on('connect', () => {
    pgClient
      .query('CREATE TABLE IF NOT EXISTS values (number INT)')
      .catch((err) => console.log(err));
  });
  
// Redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    // if the connectoin is lost, reconnect should be tried every 1000ms
    retry_strategy: () => 1000
});

// if we create connection that is listening to some events, we can't use it for anything else
// therefore we create a copy
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req,res) => {
    res.send('Hi');
});

app.get('/values/all', async (req,res) => {
    const values = await pgClient.query('SELECT * FROM values');

    res.send(values.rows);
});

app.get('/values/current', async (req,res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values)
    });
});

app.post('/values', async (req,res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!')
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working:true });
});

app.listen(5000, err => {
    console.log('Listening');
});