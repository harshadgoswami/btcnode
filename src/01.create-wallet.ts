import * as mongoose from 'mongoose';

require('dotenv').config();
import { LogHelper } from "../lib/helpers/LogHelper";
import { BtcHelper } from "../lib/helpers/BtcHelper";
import { WalletHelper } from "../lib/helpers/WalletHelper";


//Script :  ts-node --require dotenv/config ./src/01.create-wallet.ts

(<any>mongoose).Promise = global.Promise;

                                                       
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true  /** , user: process.env.MONGO_USERNAME, pass: process.env.MONGO_PASSWORD **/ }).then(

    async () => {

        // all code here  
        let btcHelper = new BtcHelper();
        let logHelper = new LogHelper();
        
        // 1 815658
        let wallet = await btcHelper.createWallet(815658);

        wallet['address'] = wallet['p2pkh'];
        wallet['p2shp2wpkh'] = wallet['p2sh-p2wpkh'];
        

        let walletHelper = new WalletHelper();
        let id = await walletHelper.saveWallet(wallet);

        mongoose.connection.close();
        logHelper.log("Done!!");
        process.exit(1);
});