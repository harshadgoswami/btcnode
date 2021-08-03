import * as mongoose from 'mongoose';

require('dotenv').config();
import { LogHelper } from "../lib/helpers/LogHelper";
import { BtcHelper } from "../lib/helpers/BtcHelper";
import { WalletHelper } from "../lib/helpers/WalletHelper";
import { TransactionHelper } from "../lib/helpers/TransactionHelper";


//Script :  ts-node --require dotenv/config ./src/05.retrieve-deposit-transaction.ts

(<any>mongoose).Promise = global.Promise;

                                                       
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true  /** , user: process.env.MONGO_USERNAME, pass: process.env.MONGO_PASSWORD **/ }).then(

    async () => {

        // all code here  
        let btcHelper = new BtcHelper();
        let logHelper = new LogHelper();
        let walletHelper = new WalletHelper();
        let transactionHelper = new TransactionHelper();

        let latestBlockNumber = await btcHelper.getLatestBlockCount();
        let latestBlockHash = await btcHelper.getBlockHash(latestBlockNumber);


        let wallets = await walletHelper.getWallets();
        let block = await btcHelper.getBlockDetail(latestBlockHash);

        block = await btcHelper.getBlockDetail("076a0a562e4114e620ea69b672f8ff58682fb203149759ad6f4f3d9731fc6eef");

        


        for (let i = 0; i < block.tx.length; i++) {
            
            let transactionDetail = await btcHelper.gettransactionDetail(block.tx[i]);

            logHelper.log('transaction details',transactionDetail);

            let rawTransaction = await btcHelper.getRawTransactionDetail(transactionDetail.hex);

            logHelper.log('rawTransaction details',rawTransaction);

            let senderInput:any;

            /** Start Process : For get sender detail */
            if (rawTransaction.vin.length) {
                let getTransactionInput = await btcHelper.getRawTransaction(rawTransaction.vin[0].txid)

                if (getTransactionInput != 0) {
                    let rawTransactionInput = await btcHelper.getRawTransactionDetail(getTransactionInput)

                    if (rawTransactionInput.vout.length) {

                        let val = rawTransactionInput.vout.filter((v) => v.n == rawTransaction.vin[0].vout)

                        if (val.length) {
                            senderInput = val[0].scriptPubKey.addresses[0];
                        }
                    }
                }
            }
            /** End Process : For get sender detail */

            for (let j = 0; j < rawTransaction.vout.length; j++) {

                logHelper.log(JSON.stringify(rawTransaction));

                if(rawTransaction.vout[j].scriptPubKey.addresses){
                    let sender = senderInput;
                    let value = Number(rawTransaction.vout[j].value);
                    let address = rawTransaction.vout[j].scriptPubKey.addresses[0];
                    let onchain_transaction_id = rawTransaction.txid;
    
                    for(let w = 0; w < wallets.length; w++ ){
                        if(wallets[w]['address'] == address){
    
                            let transaction = {
                                sender_id: null,
                                receiver_id: wallets[w]._id,
                                amount:value,
                                fee:0,
                                confirmations:0,
                                hex:onchain_transaction_id,
                                transaction_type:"deposit"
                            }
                
                            await transactionHelper.saveTransaction(transaction);
    
                            break;
                        }
                    }
                }
            }
        }

        mongoose.connection.close();
        logHelper.log("Done!!");
        process.exit(1);
});