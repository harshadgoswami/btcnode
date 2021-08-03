import * as mongoose from 'mongoose';

import { Transaction } from "../models/transactionModel";

export class TransactionHelper {

    saveTransaction(data) {
        return new Promise(async (resolve, reject) => {   

            let saveData = new Transaction(data);

            await saveData.save(async (err, transaction) => {
                if (err) {
                    console.log(err);
                    resolve(false);
                } else {
                 resolve(transaction._id);
                }
            });
        });
    }

    async getTransactionById(_id) {
        let transaction = await Transaction.findById(_id);
        return transaction;
    }

    
}