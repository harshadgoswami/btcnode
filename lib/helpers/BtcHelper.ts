import * as mongoose from 'mongoose';
import {
    ECPair,
    networks as NETWORKS,
    Transaction,
    TransactionBuilder,
    Psbt,
    crypto,
    payments,
    networks
} from 'bitcoinjs-lib';

const bip32 = require('bip32');
const bip39 = require('bip39');
const request = require('request');
import { LogHelper } from './LogHelper';


export class BtcHelper {

    btcInSatoshi = 10e7;
    transactionCostInSatoshi = 0;
    network: any = NETWORKS.regtest;

    constructor() {
        
        this.transactionCostInSatoshi = (Number(process.env.BTC_TRANSACTIONCOST) * this.btcInSatoshi);

        if (process.env.BTC_NET == "testnet") {
            this.network = NETWORKS.testnet;
        } else if (process.env.BTC_NET == "regtest") {
            this.network = NETWORKS.regtest;
        }else{
            this.network = NETWORKS.bitcoin;
        }

    }

    async createWallet(userId: number) {

        // @todo - create user id dynamically.
        let logHelper = new LogHelper();
        let currentUserId = userId;
        let network = this.network;
        //

        const wallets = [process.env.BTC_RANDOMKEY];

        // Get mnemonic from entropy
        let mnemonic = bip39.entropyToMnemonic(wallets[0]);
        // console.log(`${Object.keys(wallets)} mnemonic  `, mnemonic);

        logHelper.log('Inside Fn: createWallet => Wallets | Mnemonics ', Object.keys(wallets), mnemonic);

        let returnObject: any = {};

        return new Promise(async (resolve, reject) => {

            // Get seed from mnemonic
            bip39.mnemonicToSeed(mnemonic).then(async (seed) => {

                // console.log(`${Object.keys(wallets)} seed  `, seed.toString('hex'));
                logHelper.log('Inside Fn: createWallet => Wallets | Seed ', Object.keys(wallets), seed.toString('hex'));

                // Get master BIP32 master from seed
                let master = bip32.fromSeed(seed, this.network);

                // Get private key WIF
                // console.log(`${Object.keys(wallets)} master wif  `, master.toWIF());
                logHelper.log('Inside Fn: createWallet => Wallets | Master WIF ', Object.keys(wallets), master.toWIF());

                // Get BIP32 extended private key
                // console.log(`${Object.keys(wallets)} master xpriv  `, master.toBase58());
                logHelper.log('Inside Fn: createWallet => Wallets | Master to Base ', Object.keys(wallets), master.toBase58());

                // Get BIP32 extended public key
                // console.log(`${Object.keys(wallets)} master xpub  `, master.neutered().toBase58());
                logHelper.log('Inside Fn: createWallet => Wallets | Master Neutered ', Object.keys(wallets), master.neutered().toBase58());


                //
                // Get child node
                let child = master.derivePath(`m/0'/0'/${currentUserId}'`);

                // Get child EC private key
                // Get child wif private key
                let wif = child.toWIF();

                // Get child EC public key
                let ECPubKey = child.publicKey.toString('hex')

                // Get child EC public key hash
                let ECPubKeyHash = crypto.hash160(child.publicKey).toString('hex')

                // 
                // Addresses
                // P2PKH
                let p2pkh = payments.p2pkh({ pubkey: child.publicKey, network }).address

                // P2WPKH
                let p2wpkh = payments.p2wpkh({ pubkey: child.publicKey, network })
                let p2wpkhAddress = p2wpkh.address

                // P2SH-P2WPKH
                let p2sh_p2wpkh = payments.p2sh({ redeem: p2wpkh, network }).address

                //
                //
                logHelper.log("----------------------------------------------------------------------------------");
                logHelper.log(`Bitcoin Network : `, networks.regtest == network ? "REGTEST" : "TESTNET");
                logHelper.log("----------------------------------------------------------------------------------");



                logHelper.log(`{
                    "wif": "${wif}",
                    "pubKey": "${ECPubKey}",
                    "pubKeyHash": "${ECPubKeyHash}",
                    "p2pkh": "${p2pkh}",
                    "p2sh-p2wpkh": "${p2sh_p2wpkh}",
                    "p2wpkh": "${p2wpkhAddress}"
                }`);

                returnObject["wif"] = wif;
                returnObject["pubKey"] = ECPubKey;
                returnObject["pubKeyHash"] = ECPubKeyHash;
                returnObject["p2pkh"] = p2pkh;
                returnObject["p2sh-p2wpkh"] = p2sh_p2wpkh;
                returnObject["p2wpkh"] = p2wpkhAddress;

                if (process.env.WEB_MODE == "prod" || process.env.WEB_MODE == "dev") {
                    //
                    (
                        async () => {

                            let logHelper = new LogHelper();
                            // Import address
                            // curl --user myusername
                            // --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "importaddress", "params": ["myaddress", "testing", false] }'
                            // -H 'content-type: text/plain;' http://127.0.0.1:8332/

                            // console.log(`ADDRESS IMPORT IS : ${returnObject["p2pkh"]}`)
                            logHelper.log('Inside OnchainHelper: ADDRESS IMPORTED IS', returnObject["p2pkh"]);

                            let rpcMethod = "importaddress";                                // rpc method
                            let arrayOfParameters = `["${returnObject["p2pkh"]}", "testing", true]`;       // address | label | rescan enable or not
                            let id = "vbit-regtest-import-address";                    // id

                            //temp commeneted
                            let response = await this.getTransactionData(rpcMethod, arrayOfParameters, id);

                            //console.log("RESPONSE ", response);
                            logHelper.log('getTransactionData response data ', response);

                            resolve(returnObject);

                        })();
                } else {
                    resolve(returnObject);
                }

            });



        });


    }

    async sendBitcoin(sender,receiver,amount,fee){
          
            // get list upspent
            {
                let logHelper = new LogHelper();
                let totalTransactionBtc = amount + fee;

                let rpcMethod: string = "listunspent";
                let arrayOfParameters: string = `[6, 9999999, [\"${sender['p2pkh']}\"]]`;
                let id: string = "vbit-regtest-unspent";
                let response: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
                let balanceSatoshiSender = 0;
                let transactionInputMap = new Map();
                let unspentSum = 0;
                

                if (response.result.length > 0) {
                        
                        // iterate response
                        let txnIndex = 1;
                        let totalUnspent = 0;
                        await this.asyncForEach(
                            response.result,                                                    // array of objects
                            async (transaction) => {
                                if (unspentSum < totalTransactionBtc) {
                                    let rpcMethod: string = "gettransaction";
                                    let arrayOfParameters: string = `[\"${transaction.txid}\"]`;
                                    let id: string = "vbit-regtest-unspent";
                                    let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);

                                    
                                    transactionInputMap.set(txnIndex, { vout: transaction.vout, txid: transaction.txid, hex: res.result.hex, scriptPubKey: transaction.scriptPubKey, redeemScript: ((transaction.redeemScript) ? transaction.redeemScript : null) });    //
                                    txnIndex += 1;
                                    balanceSatoshiSender += (Number(transaction.amount) * 10e7 );
                                    totalUnspent += 1;
                                }
                                unspentSum += Number(transaction.amount);
                            }
                        );

                        balanceSatoshiSender = Math.floor(balanceSatoshiSender);
                }

                if (transactionInputMap.size > 0 && unspentSum >= totalTransactionBtc) {

                        //transactionInputMap 
                        const txb = new Psbt({ network: this.network });
                        const keyPairSender = ECPair.fromWIF(sender['wif'], this.network);

                        // implement transaction builder
                        transactionInputMap.forEach((value, key) => {

                            console.log('txiddddddddddddddddd', value.txid, value.vout)
                
                            const isSegwit = value.hex.substring(8, 12) === '0001'
                
                            if (isSegwit && false) {
                                txb.addInput({
                                    hash: value.txid,
                                    index: value.vout,
                                    witnessUtxo: {
                                        script: Buffer.from(value.scriptPubKey, 'hex'),
                                        value: value.amount * 10e7 // value in satoshi
                                    },
                                    redeemScript: Buffer.from(value.redeemScript, 'hex')
                                });
                            } else {
                                txb.addInput({
                                    hash: value.txid,
                                    index: value.vout,
                                    nonWitnessUtxo: Buffer.from(value.hex, 'hex')
                                });
                            }
                        });

                        let _btcTransferIntoSatoshi = 0

                        let receivers = [ {receiver: receiver, amount: amount}];

                        await receivers.map((rec) => {
                            let transferIntoSatoshi = Number(rec["amount"]) * 10e7;
                            _btcTransferIntoSatoshi += Math.floor(transferIntoSatoshi);
                            txb.addOutput({
                                address: rec['receiver']["address"],
                                value: Math.floor(transferIntoSatoshi) // value in satoshi (0.5 BTC)
                            });
                        });

                        let finalCost = fee * 10e7;
                        let remainingBalanceAfterTransfer = (balanceSatoshiSender - (_btcTransferIntoSatoshi + finalCost));

                        if(remainingBalanceAfterTransfer > 0) {
                            let btcRemaining = (Number(remainingBalanceAfterTransfer) / 10e7);
                            let noOfunspent = 0;
                            if ((Number(btcRemaining) / 4) >= 0.5) {  // more then 2 btc 
                                noOfunspent = 8;
                            } else if ((Number(btcRemaining) / 3) >= 0.5) { // more then 1.5 and less then 2
                                noOfunspent = 6;
                            } else if ((Number(btcRemaining) / 2) >= 0.5) {  // more then 1 and less then 1.5
                                noOfunspent = 4;
                            }
                            // transfer remaining amount to spit unspent transactions
                            for (let index = 0; index < noOfunspent; index++) {
                                let splitSatoshi = Math.floor(Number(remainingBalanceAfterTransfer) / Number(noOfunspent));
                                txb.addOutput({
                                    address: sender['address'],
                                    value: splitSatoshi // value in satoshi (0.5 BTC)
                                });
                            }
                        }

                        for (let index = 0; index < transactionInputMap.size; index++) {
                            txb.signInput(index, keyPairSender);
                        }
            
                        
                        txb.validateSignaturesOfAllInputs();
                        txb.finalizeAllInputs();
                        const tx: Transaction = txb.extractTransaction();
                        
                        
            
                        logHelper.log('Raw Transaction data', tx.toHex());

                        
                        rpcMethod = "sendrawtransaction";
                        arrayOfParameters = "[\"" + tx.toHex() + "\"]";
                        id = "vbit-regtest-send-rawtransaction";                          
                        let rawTransactionHash: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);

                        logHelper.log('Getting transaction id :', JSON.stringify(rawTransactionHash));


                        if (rawTransactionHash.result) {
                            return rawTransactionHash.result;
                        }else{
                            return false;
                        }
                }else{
                    return false;
                }
            }
    }

    async getWalletBalance(wallet){

        let rpcMethod: string = "listunspent";
        let arrayOfParameters: string = `[6, 9999999, [\"${wallet['p2pkh']}\"]]`;
        let id: string = "vbit-regtest-unspent";
        let response: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
        let balance = 0;

        if (response.result.length > 0) {

            await this.asyncForEach(
                response.result,                                                    // array of objects
                async (transaction) => {
                    balance += transaction.amount;
                }
            );

            return balance;

        }else{
            return 0;
        }
    }

    async getTransactionConfirmations(hex): Promise<number> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "gettransaction";
            let arrayOfParameters: string = `[\"${hex}\"]`;
            let id: string = "vbit-regtest-unspent";
            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result.confirmations)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }

    async getLatestBlockCount(): Promise<number> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "getblockcount";
            let arrayOfParameters: string = `[]`;
            let id: string = "vbit-regtest-unspent";

            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }

    async getBlockHash(number): Promise<any> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "getblockhash";
            let arrayOfParameters: string = `[${number}]`;
            let id: string = "this-regtest-unspent";
            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }

    async getBlockDetail(hash): Promise<any> {

        return new Promise(async (resolve, reject) => {

            
            let rpcMethod: string = "getblock";
            let arrayOfParameters: string = `[\"${hash}\"]`;
            let id: string = "vbit-regtest-unspent";

            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }

    async gettransactionDetail(txid): Promise<any> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "gettransaction";
            let arrayOfParameters: string = `[\"${txid}\"]`;
            let id: string = "vbit-regtest-unspent";

            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }

    async getRawTransactionDetail(hexstring): Promise<any> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "decoderawtransaction";
            let arrayOfParameters: string = `[\"${hexstring}\"]`;
            let id: string = "vbit-regtest-unspent";

            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }


    async getRawTransaction(hexstring): Promise<any> {

        return new Promise(async (resolve, reject) => {

            let rpcMethod: string = "getrawtransaction";
            let arrayOfParameters: string = `[\"${hexstring}\"]`;
            let id: string = "vbit-regtest-unspent";

            let res: any = await this.getTransactionData(rpcMethod, arrayOfParameters, id);
            if (res) {
                if (res.result) {
                    resolve(res.result)
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    }


    async getTransactionData(_rpcMethod, _arrayOfMethods, _id) {
        let logHelper = new LogHelper();
        // synchronous call
        let requestParameters = this.requestObject(_rpcMethod, _arrayOfMethods, _id);
        console.log('requestParameters', requestParameters)

        return new Promise((resolve, reject) => {
            //
            request(requestParameters, (error, response, body) => {
                //
                if (error) {
                    reject(error);
                }


                logHelper.log('Get transaction data', body)

                if (body) {
                    resolve(JSON.parse(body));
                } else {
                    resolve({});
                }

            });
        });
    }

    requestObject(_method, _params, _id) {
        //
        const username = process.env.BTC_USERNAME;
        const password = process.env.BTC_PASSWORD;
        const rpcPort = process.env.BTC_RPCPORT;
        const btcNoteHost = process.env.BTC_NODE_HOST;

        const peerUrl = `http://${username}:${password}@${btcNoteHost}:${rpcPort}`;
        console.log('Url ------- ', peerUrl)
        if (_method && _params) {      //
            return {
                url: peerUrl,
                method: "POST",
                headers: { "content-type": "text/plain" },
                json: false,
                body: `{"method": "${_method}","params": ${_params},"id": "${_id}"}`
            }
        }
    }

    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
    
}