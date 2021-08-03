
import * as mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({

    address: {
        type: String,
    },

    pubKey: {
        type: String,
    },

    pubKeyHash: {
        type: String,
    },

    p2pkh: {
        type: String,
    },

    p2shp2wpkh:{
        type: String,
    },

    p2wpkh:{
        type: String,
    },

    wif:{
        type: String,
    },
    createdOn: {
        type: Date,
        default: Date.now,
    },
});

export const Wallet = mongoose.model('wallet', WalletSchema);         