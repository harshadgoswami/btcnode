import * as mongoose from 'mongoose';

require('dotenv').config();
import { LogHelper } from "../lib/helpers/LogHelper";
import { BtcHelper } from "../lib/helpers/BtcHelper";
import { WalletHelper } from "../lib/helpers/WalletHelper";


//Script :  ts-node --require dotenv/config ./src/03.get-wallet-balance.ts

(<any>mongoose).Promise = global.Promise;

                                                       
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true  /** , user: process.env.MONGO_USERNAME, pass: process.env.MONGO_PASSWORD **/ }).then(

    async () => {

        // all code here  
        let btcHelper = new BtcHelper();
        let logHelper = new LogHelper();
        
        let walletHelper = new WalletHelper();

        // wallet Id as Input 
        let walletId = mongoose.Types.ObjectId('6102d99c69897c0930551427'); //14949.035642420056
        walletId = mongoose.Types.ObjectId('6102dd9f2c251a0a53e787b8'); // 0


        let wallet = await walletHelper.getWallet(walletId);

        let balance = await btcHelper.getWalletBalance(wallet);

        logHelper.log("Balance is : ",balance);
        
        mongoose.connection.close();
        logHelper.log("Done!!");
        process.exit(1);
});