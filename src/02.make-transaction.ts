import * as mongoose from 'mongoose';

require('dotenv').config();
import { LogHelper } from "../lib/helpers/LogHelper";
import { BtcHelper } from "../lib/helpers/BtcHelper";
import { WalletHelper } from "../lib/helpers/WalletHelper";
import { TransactionHelper } from "../lib/helpers/TransactionHelper";


//Script :  ts-node --require dotenv/config ./src/02.make-transaction.ts

(<any>mongoose).Promise = global.Promise;

                                                       
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true  /** , user: process.env.MONGO_USERNAME, pass: process.env.MONGO_PASSWORD **/ }).then(

    async () => {

        /**
         *  - sender wallet and receiver wallet is input 
         *  - amount is input 
         *  - transaction is output 
        **/

        // all code here  
        let btcHelper = new BtcHelper();
        let logHelper = new LogHelper();
        let transactionHelper = new TransactionHelper();
        
        
        let walletHelper = new WalletHelper();
        
        let senderId = mongoose.Types.ObjectId('6102d99c69897c0930551427');
        let receiverId = mongoose.Types.ObjectId('6102dd9f2c251a0a53e787b8');
        let amount = 1; // 1 BTC
        let fee = process.env.BTC_TRANSACTIONCOST;

        let senderWallet = await walletHelper.getWallet(senderId);
        let receiverWallet = await walletHelper.getWallet(receiverId);
        
        // create onchain transactions
        let hex = await btcHelper.sendBitcoin(senderWallet,receiverWallet,amount,fee);

        if(hex){

            // save transaction into database 
            let transaction = {
                sender_id: senderWallet._id,
                receiver_id: receiverWallet._id,
                amount:amount,
                fee:fee,
                confirmations:0,
                hex:hex,
                transaction_type:"withdraw"
            }

            await transactionHelper.saveTransaction(transaction);
            
        }
        
        mongoose.connection.close();
        logHelper.log("Done!!");
        process.exit(1);
});