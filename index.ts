import express from 'express';
import {
  getUsers,
  getUserSpins,
  addUser,
  updateNumSpins,
} from "./app/Server";
import { verifyTransaction } from './app/Transactions';
import { PublicKey } from "@solana/web3.js";
import { start } from 'repl';

const app = express();
const PORT = process.env.PORT || 4800;
app.use(express.json());

var cors = require('cors');
const corsOptions = {
  origin: ['https://wheel.solanaspinners.com', 'http://localhost:3000'],
  preflightContinue: false,
  credentials: true
}
app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.send('Solana Spinners Wheel');
});

app.get('/api/users', (req, res) => {
  let usersList = [];
  async function setUsers() {
    usersList = await getUsers();
    res.send(usersList);
  }
  setUsers();
});

app.get('/api/users/spins/:id', (req, res) => {
  let numSpins = '';
  async function getSpins() {
    numSpins = await getUserSpins(req.params.id);
    res.send(numSpins);
  }
  getSpins();
});

app.put('/api/users', (req, res) => {
  addUser(req.body.ID);
});

app.post('/api/unlock', (req, res) => {
  const sig = req.body.sig;
  const userID = req.body.ID;
  async function getTransactionData(signature: string) {
    if (await verifyTransaction(userID, signature)){
        res.status(200).send({ status: 'OK'});
    }else{
        res.send("bad");
    }
  }
  getTransactionData(sig);
});

app.post('/api/spin', (req, res) => {
  const userID = req.body.ID;

  async function spinAsync(userID: string) {
    let spin = await updateNumSpins(userID);
    res.send(spin);
  }
  spinAsync(userID);
});

app.listen(PORT, () => {
  console.log(`Express with Typescript! http://localhost:${PORT}`);
});
