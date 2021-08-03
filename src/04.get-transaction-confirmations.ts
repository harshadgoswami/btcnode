import * as mongoose from 'mongoose';

require('dotenv').config();
import { LogHelper } from "../lib/helpers/LogHelper";
import { BtcHelper } from "../lib/helpers/BtcHelper";
import { TransactionHelper } from "../lib/helpers/TransactionHelper";


//Script :  ts-node --require dotenv/config ./src/04.get-transaction-confirmations.ts

(<any>mongoose).Promise = global.Promise;

                                                       
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true  /** , user: process.env.MONGO_USERNAME, pass: process.env.MONGO_PASSWORD **/ }).then(

    async () => {

        // all code here  
        let btcHelper = new BtcHelper();
        let logHelper = new LogHelper();
        
        let transactionHelper = new TransactionHelper();

        let transactionId = mongoose.Types.ObjectId("6107f7a1851b0503b8b04a18");
        let transaction:any = await transactionHelper.getTransactionById(transactionId);

        let confirmation = await btcHelper.getTransactionConfirmations(transaction.hex);

        console.log("Confiramtions are : ",confirmation);

        mongoose.connection.close();
        logHelper.log("Done!!");
        process.exit(1);
});