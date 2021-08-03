import * as mongoose from 'mongoose';

import { Wallet } from "../models/walletModel";

export class WalletHelper {

    saveWallet(data) {
        return new Promise(async (resolve, reject) => {   

            let saveData = new Wallet(data);

            await saveData.save(async (err, wallet) => {
                if (err) {
                    console.log(err);
                    resolve(false);
                } else {
                 resolve(wallet._id);
                }
            });
        });
    }

    async getWallet(_id) {
        let wallet = await Wallet.findById(_id);
        return wallet;
    }

    async getWallets(){
        return await Wallet.find({});
    }
}