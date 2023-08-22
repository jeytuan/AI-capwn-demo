const express = require('express');
const axios = require('axios');
const Web3 = require('web3');
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const app = express();
const PORT = process.env.PORT || 3000;

const web3 = new Web3();

const KEY_VAULT_NAME = 'AI-Capwn-keyvault';
const KEY_VAULT_URL = `https://${KEY_VAULT_NAME}.vault.azure.net`;
const SECRET_NAME = 'AICapwn-InfuraAPIKey';

const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(KEY_VAULT_URL, credential);

let INFURA_API_KEY = '';

async function initializeInfuraKey() {
    try {
        const secret = await secretClient.getSecret(SECRET_NAME);
        INFURA_API_KEY = secret.value;
        web3.setProvider(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`));
    } catch (err) {
        console.error('Error retrieving Infura API key:', err);
        process.exit(1);
    }
}

// Define the Lido contracts
const lidoContracts = {
    "lidolocator": "0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb",
    "lidotoken": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    "wsteth": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    "eip712helper": "0x8F73e4C2A6D852bb4ab2A45E6a9CF5715b3228B7",
    "stakingrouter": "0xFdDf38947aFB03C621C71b06C9C70bce73f12999",
    "nodeoperatorsregistry": "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5",
    "depositsecuritymodule": "0xC77F8768774E1c9244BEed705C4354f2113CFc09",
    "rewardsvault": "0x388C818CA8B9251b393131C08a736A67ccB19297",
    "withdrawalqueueerc721": "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1",
    "withdrawalvault": "0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f",
    "burner": "0xD15a672319Cf0352560eE76d9e89eAB0889046D3",
    "mevboostrelay": "0xF95f069F9AD107938F6ba802a3da87892298610E"
};

// Merge the Lido contracts with any other contracts you might have
const contracts = {
    ...lidoContracts,
    "linea": "0xYourLineaContractAddressHere"
};

app.get('/latest-block', async (req, res) => {
    const payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_blockNumber",
        "params": []
    };

    try {
        const response = await axios.post(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`, payload);
        const blockNumber = parseInt(response.data.result, 16);
        res.send(`Current Ethereum block number: ${blockNumber}`);
    } catch (error) {
        console.error("Error fetching block number:", error);
        res.status(500).send("Error fetching block number.");
    }
});

// Fetching Contract Balance
app.get('/contract-balance/:contractName', async (req, res) => {
    const address = contracts[req.params.contractName.toLowerCase()];

    if (!address) {
        return res.status(400).send(`Invalid contract name. Available contracts are: ${Object.keys(contracts).join(", ")}`);
    }

    const payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getBalance",
        "params": [address, "latest"]
    };

    try {
        const response = await axios.post(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`, payload);
        const balanceInWei = response.data.result;
        const balanceInEth = web3.utils.fromWei(balanceInWei, 'ether');
        res.send(`Contract balance for ${req.params.contractName}: ${balanceInEth} ETH`);
    } catch (error) {
        console.error("Error fetching contract balance:", error);
        res.status(500).send("Error fetching contract balance.");
    }
});

// Fetching Contract Bytecode
app.get('/contract-bytecode/:contractName', async (req, res) => {
    const address = contracts[req.params.contractName.toLowerCase()];

    if (!address) {
        return res.status(400).send(`Invalid contract name. Available contracts are: ${Object.keys(contracts).join(", ")}`);
    }

    const payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getCode",
        "params": [address, "latest"]
    };

    try {
        const response = await axios.post(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`, payload);
        res.send(`Contract bytecode for ${req.params.contractName}: ${response.data.result}`);
    } catch (error) {
        console.error("Error fetching contract bytecode:", error);
        res.status(500).send("Error fetching contract bytecode.");
    }
});

initializeInfuraKey().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});

