import * as anchor from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { setSpins } from "./Server";
import { getTokenWallet } from "./utils";
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
// const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
// export const connection = new Connection("https://withered-delicate-bird.solana-mainnet.quiknode.pro/59cfd581e09e0c25b375a642f91a4db010cf27f6/", "confirmed");

const fs = require('fs');
const { pool } = require('../config');

const BURN_WALLET = "2uiQx1XG7Ljc8PnrFYKtLWU5UZ2UtYj1PuRG9B3m7ThA";

const serverWallet = loadWalletKey('./app/etc/my-keypair.json');

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

function loadWalletKey(keypairPath: string): Keypair {
  if (!keypairPath || keypairPath == '') {
      throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keypairPath).toString())),
  );
  return loaded;
}

const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

async function verifyKey(mintKey: PublicKey): Promise<boolean> {
  const metadataAccount = await getMetadata(mintKey);
  const info = await connection.getAccountInfo(metadataAccount);
  if (info) {
    const meta = MetadataData.deserialize(info.data);
    return(meta.data.creators[0].address === "7vMzUhEGrtvnF44jJFhjnMcdX8EA23qg7djomFk6QDkR");
  } else {
    console.log(`No Metadata account associated with: ${mintKey}`);
    return false;
  }
}

export async function verifyTransaction(userID: string, tSig: string): Promise<boolean>{
  const text = 'SELECT COUNT(1) FROM transactions WHERE sig = $1';
  const values = [tSig];
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

  if (exists > 0) return false;

  const transactionData = await connection.getParsedTransaction(tSig, "confirmed");

  if (!transactionData) return false;
  if (!transactionData.meta) return false;
  if (!transactionData.meta.postTokenBalances) return false;

  const mint = new PublicKey(transactionData.meta.postTokenBalances[0].mint);

  console.log("checking meta validity...");
  if (transactionData.meta.err != null) return false;

  console.log("checking signer...");
  if(!(transactionData.transaction.message.accountKeys[0].signer)) return false;
  
  console.log("checking recipient...");
  let accounts = transactionData.meta.postTokenBalances;
  let recipient = accounts[0].owner;
  if (accounts[0].uiTokenAmount.amount != '1') {
    recipient =  accounts[1].owner;
  }
  if (recipient != BURN_WALLET) return false;

  console.log("verifying key...");
  if(!verifyKey(mint)) return false;

  const text2 = 'INSERT INTO transactions (sig) VALUES($1)';
  const values2 = [tSig];
  await pool.query(text2, values2, (error: any, results: { rows: any; }) => {
    if (error) {
      console.log(error);
    }
  })

  await setSpins(userID);

  return true;
}

export async function send(wallet: PublicKey, mint: PublicKey, quantity: number){

  const fromTokenAccount = await getTokenWallet(
      serverWallet.publicKey,
      mint
  );
      // console.log("fromAccount: ", fromTokenAccount.toString());
      // console.log("fromWallet: ", tuskWallet.publicKey.toString());
      
  const toTokenAccount = await getTokenWallet(
      wallet,
      mint
  );
  // console.log("toAccount: ", toTokenAccount.toString());
  // console.log("toWallet: ", wallet.toString());

  try {
      const createInstruction = Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mint,
          toTokenAccount,
          wallet, // owner
          serverWallet.publicKey // payer
      );
      const transaction = new Transaction();
      transaction.add(createInstruction);
      transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      transaction.sign(...[serverWallet]);
      console.log("signed");
      //console.log("serialized: ", transaction.serialize());
      console.log(">>", TOKEN_PROGRAM_ID.toString());

      const makeTokenWallet = await anchor.web3.sendAndConfirmTransaction(
          connection,
          transaction,
          [serverWallet]
      );
      await connection.confirmTransaction(makeTokenWallet, 'processed');
      } catch (error) {
      console.log(error);
      }

  try {

  const transaction = new Transaction().add(
      Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount,
      toTokenAccount,
      serverWallet.publicKey,
      [],
      quantity*1e9,
      ),
  );

  console.log("send transaction created")

  const mintTxId = await anchor.web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [serverWallet]
  );

  console.log("minttx", mintTxId);

  await connection.confirmTransaction(mintTxId, 'processed');
  } catch (error) {
    console.log(error);
    send(wallet, mint, quantity);
  }
}
