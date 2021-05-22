require('@nomiclabs/hardhat-waffle')
const { config } = require('dotenv')
config()

const mnemonic = process.env.MNEMONIC
const infura_api = process.env.INFURA_API

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/074defc86881430da33be9151f3beaf8',
      accounts: { mnemonic },
    },
  },
}
