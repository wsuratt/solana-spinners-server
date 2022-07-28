import {Express, Request, Response} from "express";
import { PublicKey } from '@solana/web3.js';
const { pool } = require('../config');
import { send } from "./Transactions";

const fs = require('fs');

let userArray: any[] = [];

export class User{
  constructor(id: string){
      this.id = id;
      this.num_spins = 0;
  }
  id: string;
  num_spins: number;
}

export async function getUsers(): Promise<any[]>{
  return new Promise<any[]>(resolve => {
    pool.query('SELECT * FROM users', (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error);
      }
      userArray = results.rows;
      resolve(userArray);
    })
  });
}

export async function getUserSpins(ID: string): Promise<string>{
  const text = 'SELECT num_spins FROM users WHERE id = $1';
  const values = [ID];
  return new Promise<string>(resolve => {
    pool.query(text, values, (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error);
      }
      let numSpinsJSON = results.rows[0];
      let numSpins = numSpinsJSON.num_spins;
      resolve(String(numSpins));
    })
  });
}

export async function addUser(ID: PublicKey): Promise<void>{
  const text = 'SELECT COUNT(1) FROM users WHERE id = $1';
  const values = [ID];
  const exists =  await new Promise<number>(resolve => {
    pool.query(text, values, (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error)
      }
      let countJSON = results.rows[0];
      let count = countJSON.count;
      resolve(count);
    })
  });

  if (exists > 0) return;

  const text2 =`INSERT INTO users (id, num_spins) VALUES($1, 0)`;
  const values2 = [ID];
  await pool.query(text2, values2, (error: any, results: { rows: any; }) => {
    if (error) {
      console.log(error);
    }
  })
}

export async function getWin(): Promise<number>{
  const text = 'SELECT * FROM prizes WHERE winner = NULL';
  let prizes = [];
  let spinNum = -1;
  const MAX = 1000
  return new Promise<number>(resolve => {
    pool.query(text, (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error);
      }
      prizes = results.rows;
      console.log(prizes);
      resolve(spinNum);
    })
  });
}

export async function updateNumSpins(userID: string): Promise<string>{
  const text = 'SELECT * FROM users WHERE id = $1';
  const values = [userID];
  let user = new User(userID);
  let spinNum = -1;
  return new Promise<string>(resolve => {
    pool.query(text, values, (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error);
      }
      user = results.rows[0];
      if (user.num_spins > 0)
      {
        const text2 = 'SELECT * FROM prizes WHERE winner IS NULL';
        let prizes = [];
        pool.query(text2, (error: any, results: { rows: any; }) => {
          if (error) {
            console.log(error);
          }
          prizes = results.rows.map((prize: { mint: any; }) => prize.mint);
          if (prizes.length == 0) {
            resolve(String(spinNum));
            return
          }

          let winNum = Math.floor(Math.random() * prizes.length) + 1;
          
          const text3 = `UPDATE prizes SET winner = $1 WHERE mint = $2`;
          const values3 = [userID, prizes[winNum-1]];
          pool.query(text3, values3, (error: any, results: { rows: any; }) => {
            if (error) {
              console.log(error);
            }
          })

          user.num_spins -= 1;

          const text = `UPDATE users SET num_spins = $1 WHERE id = $2`;
          const values = [user.num_spins, user.id];
          pool.query(text, values, (error: any, results: { rows: any; }) => {
            if (error) {
              console.log(error);
            }
          })
          let prizeMint = new PublicKey(prizes[winNum-1]);
          let userKey = new PublicKey(userID);

          send(userKey, prizeMint, 1e-9);

          resolve(String(prizeMint.toString()));
        })
      }
      else {
        resolve(String(spinNum));
      }
    })
  });
}

export async function setSpins(userID: string) {
  const text = 'SELECT * FROM users WHERE id = $1';
  const values = [userID];
  let user = new User(userID);
  await new Promise<void>(resolve => {
    pool.query(text, values, (error: any, results: { rows: any; }) => {
      if (error) {
        console.log(error);
      }
      user = results.rows[0];
      const num_spins = user.num_spins + 1;
      const text2 = `UPDATE users SET num_spins = $1 WHERE id = $2`;
      const values2 = [num_spins, userID];
      pool.query(text2, values2, (error: any, results: { rows: any; }) => {
        if (error) {
          console.log(error);
        }
      })
    })
    resolve();
  });
}
