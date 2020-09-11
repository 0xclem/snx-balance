import React, {useState} from 'react';
import styled from 'styled-components';
import './App.css';
import snx from 'synthetix';
import ethers from 'ethers';
import {differenceInMonths} from 'date-fns';

const START_DATE = new Date('2020-03-13');
const INITIAL_BLOCK_NUMBER = 9659832;

const getUnlockedPercentage = date => {
  const diffInMonths = Math.trunc(differenceInMonths(date, START_DATE) / 3);
  return diffInMonths * 0.25;
};

function App() {
  const [apiKey, setApiKey] = useState('');
  const [wallet1, setWallet1] = useState('');
  const [wallet2, setWallet2] = useState('');
  const [wallet3, setWallet3] = useState('');
  const [wallet4, setWallet4] = useState('');
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  const onSubmit = async () => {
    const wallets = [wallet1, wallet2, wallet3, wallet4].filter(
      wallet => wallet
    );

    if (!apiKey) {
      setError('Infura key needed');
      return;
    }
    if (!wallets || wallets.length === 0) {
      setError('Wallet(s) needed');
      return;
    }

    const unlockedPercentage = getUnlockedPercentage(new Date());
    const infuraProvider = new ethers.providers.InfuraProvider(
      'homestead',
      apiKey
    );

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

    setData({
      totalOldBalance,
      unlockedPercentage,
      soldAmount,
      vestedAmount,
      wallets,
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <Row>
          <input
            type="text"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Infura API key"
          ></input>
        </Row>
        <Row>
          <input
            type="text"
            value={wallet1}
            onChange={e => setWallet1(e.target.value)}
            placeholder="Wallet 1"
          ></input>
          <input
            type="text"
            value={wallet2}
            onChange={e => setWallet2(e.target.value)}
            placeholder="Wallet 2"
          ></input>
          <input
            type="text"
            value={wallet3}
            onChange={e => setWallet3(e.target.value)}
            placeholder="Wallet 3"
          ></input>
          <input
            type="text"
            value={wallet4}
            onChange={e => setWallet4(e.target.value)}
            placeholder="Wallet 4"
          ></input>
        </Row>
        <Row>
          <button
            style={{marginLeft: '10px', fontSize: '18px'}}
            onClick={() => onSubmit()}
          >
            Submit
          </button>
        </Row>
        {error ? <Row style={{color: 'red'}}>{error}</Row> : null}
        <RowData style={{fontSize: '18px'}}>
          <Row style={{marginTop: '10px'}}>
            Block on March 13th: {INITIAL_BLOCK_NUMBER}
          </Row>
          <Row style={{marginTop: '10px'}}>
            {`Total Escrowed Balance on March 13th: ${
              data.totalOldBalance || 0
            } SNX`}
          </Row>
          <Row style={{marginTop: '10px'}}>{`Unlocked percentage: ${
            data.unlockedPercentage ? data.unlockedPercentage * 100 : 0
          }%`}</Row>
          <Row style={{marginTop: '10px'}}>{`Unlocked Balance: ${
            data.vestedAmount || 0
          } SNX`}</Row>
          <Row style={{marginTop: '10px'}}>{`Number of wallets: ${
            data.wallets ? data.wallets.length : 0
          }`}</Row>
          <Row style={{marginTop: '10px'}}>{`Sold: ${data.soldAmount || 0} (${(
            (100 * (data.soldAmount || 0)) /
            (data.vestedAmount || 0)
          ).toFixed(2)}%)`}</Row>
          <Row style={{marginTop: '10px'}}>
            {`Remaining balance allowed to sell: ${
              (data.vestedAmount || 0) - (data.soldAmount || 0)
            } SNX`}
          </Row>
        </RowData>
      </header>
    </div>
  );
}

const Row = styled.div`
  display: flex;
  margin-top: 20px;
`;

const RowData = styled.div`
  display: flex;
  flex-direction: column;
`;

export default App;
