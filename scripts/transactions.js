/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
var util = require('./util.js');

// Generate Combined Transactions
var Transactions = function(rpcData, poolAddressScript, extraNoncePlaceholder, txMessages, recipients, network) {

    // Establish Transactions Variables [1]
    var txLockTime = 0;
    var txInSequence = 0;
    var txInPrevOutHash = "";
    var txInPrevOutIndex = Math.pow(2, 32) - 1;
    var txVersion = txMessages === true ? 2 : 1;

    // Establish Transactions Variables [2]
    var reward = rpcData.coinbasevalue;
    var rewardToPool = reward;
    var txOutputBuffers = [];

    // Handle Comments if Necessary
    var txComment = txMessages === true ?
        util.serializeString('https://github.com/blinkhash/blinkhash-stratum-pool') :
        Buffer.from([]);

    // Handle ScriptSig [1]
    var scriptSigPart1 = Buffer.concat([
        util.serializeNumber(rpcData.height),
        Buffer.from(rpcData.coinbaseaux.flags, 'hex'),
        util.serializeNumber(Date.now() / 1000 | 0),
        Buffer.from([extraNoncePlaceholder.length])
    ]);

    // Handle ScriptSig [2]
    var scriptSigPart2 = util.serializeString('/blinkhash-stratum-pool/');

    // Combine Transaction [1]
    var p1 = Buffer.concat([
        util.packUInt32LE(txVersion),
        util.varIntBuffer(1),
        util.uint256BufferFromHash(txInPrevOutHash),
        util.packUInt32LE(txInPrevOutIndex),
        util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
        scriptSigPart1
    ]);

    // Handle Block Transactions
    for (var i = 0; i < recipients.length; i++) {
        var recipientReward = Math.floor(recipients[i].percent * reward);
        rewardToPool -= recipientReward;
        txOutputBuffers.push(Buffer.concat([
            util.packInt64LE(recipientReward),
            util.varIntBuffer(recipients[i].script.length),
            recipients[i].script
        ]));
    }

    // Handle Pool Transaction
    txOutputBuffers.unshift(Buffer.concat([
        util.packInt64LE(rewardToPool),
        util.varIntBuffer(poolAddressScript.length),
        poolAddressScript
    ]));

    // Handle Witness Commitment
    if (rpcData.default_witness_commitment !== undefined) {
        witness_commitment = Buffer.from(rpcData.default_witness_commitment, 'hex');
        txOutputBuffers.unshift(Buffer.concat([
            util.packInt64LE(0),
            util.varIntBuffer(witness_commitment.length),
            witness_commitment
        ]));
    }

    // Combine All Transactions
    var outputTransactions = Buffer.concat([
        util.varIntBuffer(txOutputBuffers.length),
        Buffer.concat(txOutputBuffers)
    ]);

    // Combine Transaction [2]
    var p2 = Buffer.concat([
        scriptSigPart2,
        util.packUInt32LE(txInSequence),
        outputTransactions,
        util.packUInt32LE(txLockTime),
        txComment
    ]);

    // Return Generated Transaction
    return [p1, p2];
};

// Export Transactions
module.exports = Transactions;
