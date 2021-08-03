
import * as mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({

    sender_id: {
        type: mongoose.Types.ObjectId
    },

    receiver_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    fee: {
        type: Number,
        required: true
    },

    confirmations: {
        type : Number,
        default: 0
    },

    hex: {
        type: String,
        default: ''
    },

    transaction_type: {
        type: String,
        enum: ["withdraw", "deposit"],
        required: "Enter the transaction type",
    },
    
    createdOn: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model('transaction', TransactionSchema);         