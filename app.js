import http from 'http';
import express from 'express';
import { createTerminus} from "@godaddy/terminus";

const app = express();

app.get('/', (req, res) => {
    res.send('Hello world!');
});

app.get('/unhandledRejection', (req, res) => {
    Promise.reject('rejected');
    res.send('i failed');
});

app.get('/uncaughtException', (req, res) => {
    // This won't trigger the terminus handler b/c of express
    // throw new Error('error');
    // See here: https://expressjs.com/en/guide/error-handling.html
    // But this will
    setTimeout( () => {throw new Error('error')}, 1000);
});

const server = http.createServer(app);

/************ Terminus setup *****************/

// onSignal doesn't receive any arguments
// No way for us to know which signal was sent or do work that is signal specific (like logging)
function onSignal() {
    console.log('server is starting cleanup');
    return Promise.resolve('Clean!');
}

function onShutdown() {
    console.log('cleanup finished, server is shutting down');
}

// Where does state come from? What is it?
function healthCheck({ state }) {
   return Promise.resolve(state.isShuttingDown) ;
}

const terminusOptions = {
    // TODO: read terminus docs section on working with Kubernetes
    healthChecks: {
        '/healthcheck': healthCheck,
    },
    // number of ms before forcefully exiting
    timeout: 5000,
    // try other signals like SIGTERM, SIGKILL
    // anything that can be passed to process.on like uncaughtException or unhandledRejection
    signals: ['SIGINT', 'unhandledRejection', 'uncaughtException'],
    onSignal,
    onShutdown,
    logger: console.error

}

createTerminus(server, terminusOptions);

/************ End setup **********************/
server.listen(3000);
