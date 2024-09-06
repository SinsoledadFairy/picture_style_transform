const Web3 = require('web3');
const crypto = require('crypto');
const Datastore = require('nedb');
const path = require('path');


const DATABASE_FILE = path.join(__dirname, '这是数据库.db');
const httpProvider = new Web3.providers.HttpProvider("http://121.248.49.48:8545"); //需要修改


const web3 = new Web3(httpProvider);
const db = new Datastore({ filename: DATABASE_FILE, autoload: true });

let transactionHashValue = null;

function generate16BitHash(message) {
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    return hash.slice(0, 8);
}

function storeMessage(key, value) {
    const entry = {key, value};
    db.findOne({ key: key }, (err, doc) => {
        if (err) {
            console.error("寄了:", err);
        } else if (doc) {
            console.log(`重复存储了: { K: ${key}, V: ${doc.value} }`);
        } else {
            db.insert(entry, (err, newDoc) => {
            if (err) {
                console.error("没存进去寄了:", err);
            } else {
                console.log(`已存储: { K: ${key}, V: ${value} }`);
            }
        });
    }
});
}

function deleteMessage(key) {

    db.remove({ key: key }, {}, (err, numRemoved) => {
        if (err) {
            console.error("删除失败:", err);
        } else if (numRemoved === 0) {
            console.log("没得删");
        } else {
            console.log(`已删除: { K: ${key} }`);
        }
    });
}

function updateMessage(key, message) {
    db.update({ key: key }, { $set: { value: message } }, {}, (err, numReplaced) => {
        if (err) {
            console.error("更新失败:", err);
        } else if (numReplaced === 0) {
            console.log("没有找到对应的记录");
        } else {
            console.log(`已更新: { K: ${key}, 新的值: ${message} }`);
        }
    });
}

function searchMessage(key) {
    const nospace = key.trim();
    console.log("查询hash:", nospace);
    return new Promise((resolve, reject) => {
        db.findOne({key:nospace}, (err, doc) => {
            if (err) {
                reject("Error:" + err);
            } else if (doc) {
                console.log("value is:", doc);
                resolve(doc.message);
            } else {
                console.log("找不到", nospace);
            }
        });
    });
}

//检查用的,试试db能不能用，全列出来
function listdb()
{
    db.find({}, (err, docs) => {
        if (err) {
            console.error("Error retrieving database contents:", err);
        } else {
            console.log("Current database contents:", docs);
        }
    });
}

function transactionstore(transactionHash) {
    web3.eth.getTransaction(transactionHash)
        .then(transaction => {
                const hexData = transaction.input;
                const decodedtext = JSON.parse(web3.utils.hexToUtf8(hexData));
                console.log("明文", decodedtext);
                const {type,message,originalmessage} = decodedtext;
                const originalHash = generate16BitHash(originalmessage);
                if (type === 'add') {
                    console.log("This is an 'add' transaction.");
                    const hash = generate16BitHash(message);
                    storeMessage(hash, message);
                } else if (type === 'update') {
                    console.log("This is an 'update' transaction.");
                    // const hash = generate16BitHash(message);
                    updateMessage(originalHash, message);
                } else if (type === 'revoke') {
                    console.log("This is a 'revoke' transaction.");
                    deleteMessage(originalHash);
                } else {
                    console.log("Unknown transaction type.");
                }
            })
        .catch(err => {
                console.error(err);
            });
    }
    

function creatTransaction(from,to,type,text,originalmessage) {
    const transactionData = {
        type: type,
        message: text
    };
    if (originalmessage !== undefined) {
        transactionData.originalmessage = originalmessage;
    }
    const encodedData = web3.utils.toHex(JSON.stringify(transactionData));
    web3.eth.accounts.signTransaction({
        from: from,
        to: to,
        value: web3.utils.toWei("0.1", "ether"),
        gas: 24000,
        data: web3.utils.toHex(encodedData)
    }, "73e66f099144f820753aa3a5e131785b528081da572e16339fcd02de05de719e")
    .then(signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
    .then(receipt => {
        console.log(receipt.transactionHash);
        console.log(receipt);
        transactionHashValue = receipt.transactionHash;
        transactionstore(transactionHashValue);
    })
    .catch(err => {
    console.error(err);
    });
}

creatTransaction("0xab7F5238cbEfB02062241cf979e4994b656FB944",//from
                 "0x4ba8e5f51647d56455ef36b1d760a0a1749e9126",//to
                 "add",// add, update, revoke
                 "helloworld_dpki",//正文，仅限于更新或者新增时要增加的东西
                 "helloworld");//仅限于更新或撤销时要删掉的东西（是全文不是key值），也可以是key

setTimeout(() => {
                    searchMessage("fcfc1253"); //用key查询
                    listdb();  // 执行数据库列表操作
                }, 5000);  // 1秒延迟












// console.log(web3.modules)
// console.log(Web3.version)
// console.log(web3.currentProvider)
// console.log(web3.eth.currentProvider)
// web3.eth.getChainId().then(console.log)
// web3.eth.net.getId().then(console.log)
// web3.eth.net.isListening().then(console.log)
// web3.eth.getHashrate().then(console.log)
// web3.eth.getGasPrice().then(console.log)
// web3.eth.getBlockNumber().then(console.log)
// web3.eth.getBlock(0).then(console.log)
// web3.eth.getBlockTransactionCount(0).then(console.log)
// web3.eth.getTransaction("0x6fb16893c86e3afb683c424a95e85f5963fb8159d4d1d674e06217a8b35f3e46").then(console.log)
// web3.eth.getTransactionReceipt("0x80278bbdb9b8164b17e35e0bff06fbaa515a28a71b2c1101df796e0ea132e673").then(console.log)
// web3.eth.getTransactionCount("0xab7F5238cbEfB02062241cf979e4994b656FB944").then(console.log)

// web3.eth.getAccounts().then(console.log)
// web3.eth.personal.newAccount('ray123456').then(console.log);
// web3.eth.personal.importRawKey("63a0c8003d0e1ce2d9513e2f0981f1ebb928136c0a36637962169ca94ac1553b", "kk").then(console.log);
// web3.eth.getAccounts().then(console.log)
// web3.eth.getBalance("0xab7F5238cbEfB02062241cf979e4994b656FB944").then(console.log)

// var transactionOptions = {
//     from: "0xab7F5238cbEfB02062241cf979e4994b656FB944",
//     to: '0x4ba8e5f51647d56455ef36b1d760a0a1749e9126',
//     value: "100000000000",
//     gas: 21500,
//     data: web3.utils.toHex("feel the might of fyralath")
// }

// web3.eth.accounts.signTransaction(transactionOptions,"73e66f099144f820753aa3a5e131785b528081da572e16339fcd02de05de719e").then(console.log);
// web3.eth.sendSignedTransaction("0xf8856c8502540be4008253fc944ba8e5f51647d56455ef36b1d760a0a1749e912685174876e8009a6665656c20746865206d69676874206f6620667972616c6174688208e7a0a7a72f0c1c98f3af524477e390a224281e12daf1d9749bacfe3c15ce1abf3498a00d6d5181b8281ed1261c1203bca5a0798d37b1f104c61c3676e59369c05c7abc").on('receipt', console.log);
// web3.eth.getTransaction("0xaf342e174eda22d8ab197a955686a639b36d6f07005f08abc463e0f92050b1ce").then(console.log)

////生成交易，data中为明文
// web3.eth.accounts.signTransaction({
//     from: "0xab7F5238cbEfB02062241cf979e4994b656FB944",
//     to: '0x4ba8e5f51647d56455ef36b1d760a0a1749e9126',
//     value: web3.utils.toWei("0.1", "ether"),
//     gas: 24000,
//     data: web3.utils.toHex("feel the might of fyralath")
// }, "73e66f099144f820753aa3a5e131785b528081da572e16339fcd02de05de719e")
// .then(signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
// .then(receipt => {
//     console.log("Transaction receipt: ", receipt);
// })
// .catch(err => {
//     console.error("Error: ", err);
// });

// 查询交易，并摘取input即data字段
// web3.eth.getTransaction("0xaf342e174eda22d8ab197a955686a639b36d6f07005f08abc463e0f92050b1ce")
// .then(transaction => {
//     // console.log("Transaction details: ", transaction);
//     const hexData = transaction.input;
//     const decodedMessage = web3.utils.hexToUtf8(hexData);
//     console.log("Decoded message: ", decodedMessage);
//     const t16hash = generate16BitHash(decodedMessage);
//     console.log("Hash: ", t16hash);
//     storeMessage(t16hash, decodedMessage);
//     // let searchHash = t16hash;
//     // console.log("Search result: ", searchMessage(searchHash));
// })
// .catch(err => {
//     console.error("cant get: ", err);
// });

// console.log("Database contents: ", database);
// let searchHash = "cb62";
// console.log("Search result: ", searchMessage(searchHash));

// const transactionHash = "0xaf342e174eda22d8ab197a955686a639b36d6f07005f08abc463e0f92050b1ce";
// handleTransaction(transactionHash);