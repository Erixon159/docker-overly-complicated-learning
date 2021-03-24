const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    // if the connectoin is lost, reconnect should be tried every 1000ms
    retry_strategy: () => 1000
});

// if we create connection that is listening to some events, we can't use it for anything else
// therefore we create a copy
const sub = redisClient.duplicate();

// recursive fibbonaci
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);   
}

// everytime we get a new value stored into redis, we will calculate fib() and stored its 
// hash into values
sub.on('message', (channel, message) => {
    redisClient.hset('values',message,fib(parseInt(message)));
});

// we are subscibing on insert event
sub.subscribe('insert');