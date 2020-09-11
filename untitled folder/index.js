'use strict';

const snx = require('synthetix');
const ethers = require('ethers');
var differenceInMonths = require('date-fns/differenceInMonths');

const START_DATE = new Date('2020-03-13');
const INITIAL_BLOCK_NUMBER = 9659832;

const getUnlockedPercentage = date => {
  const diffInMonths = Math.trunc(differenceInMonths(date, START_DATE) / 3);
  return diffInMonths * 0.25;
};

const getBalance = async ({key, wallets}) => {
  if (!key) {
    console.log('Infura key needed');
    return;
  }
  if (!wallets || wallets.length === 0) {
    console.log('Wallet(s) needed');
    return;
  }

  const unlockedPercentage = getUnlockedPercentage(new Date());
  const infuraProvider = new ethers.providers.InfuraProvider('homestead', key);

  // SNX Proxy
  const {address: snxProxyAddress} = snx.getTarget({
    network: 'mainnet',
    contract: 'ProxyERC20',
  });
  const {abi: snxProxyABI} = snx.getSource({
    network: 'mainnet',
    contract: 'Synthetix',
  });
  const snxProxy = new ethers.Contract(
    snxProxyAddress,
    snxProxyABI,
    infuraProvider
  );

  // SNX Reward Escrow
  const {address: rewardEscrowsAddress} = snx.getTarget({
    network: 'mainnet',
    contract: 'RewardEscrow',
  });
  const {abi: rewardsEscrowABI} = snx.getSource({
    network: 'mainnet',
    contract: 'RewardEscrow',
  });
  const snxRewardsEscrow = new ethers.Contract(
    rewardEscrowsAddress,
    rewardsEscrowABI,
    infuraProvider
  );

  let totalOldBalance = 0;
  let totalCurrentBalance = 0;
  let totalOldRewards = 0;
  let totalCurrentRewards = 0;

  for (const wallet of wallets) {
    const [oldBalance, balance, oldRewards, rewards] = await Promise.all([
      snxProxy.collateral(wallet, {blockTag: INITIAL_BLOCK_NUMBER}),
      snxProxy.collateral(wallet),
      snxRewardsEscrow.balanceOf(wallet, {
        blockTag: INITIAL_BLOCK_NUMBER,
      }),
      snxRewardsEscrow.balanceOf(wallet),
    ]);
    totalOldBalance += oldBalance / 1e18;
    totalCurrentBalance += balance / 1e18;
    totalOldRewards += oldRewards / 1e18;
    totalCurrentRewards += rewards / 1e18;
  }

  const rewardsToDeduct = totalCurrentRewards - totalOldRewards;

  const vestedAmount = totalOldBalance * unlockedPercentage;
  const correctedBalance = totalCurrentBalance - rewardsToDeduct;
  const soldAmount = totalOldBalance - correctedBalance;

  console.log('====================================');
  console.log(`Total Escrowed Balance on March 13th: ${totalOldBalance} SNX`);
  console.log('====================================');
  console.log(`Unlocked percentage: ${100 * unlockedPercentage}%`);
  console.log(`Unlocked Balance: ${vestedAmount} SNX`);
  console.log(`Number of wallets: ${wallets.length}`);
  console.log('====================================');
  console.log(
    `Sold: ${soldAmount} (${((100 * soldAmount) / vestedAmount).toFixed(2)}%)`
  );
  console.log(
    `Remaining balance allowed to sell: ${vestedAmount - soldAmount} SNX`
  );
  console.log('====================================');
};

module.exports = getBalance;
