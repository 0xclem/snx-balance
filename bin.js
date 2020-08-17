#!/usr/bin/env node

const program = require('commander');

const snxBalanceChecker = require('.');

program
  .command('getBalances')
  .option('-k, --key <value>', 'The infura archive API key')
  .option('-w, --wallets [values...]', 'A list of wallets')

  .action(async ({key, wallets}) => {
    snxBalanceChecker({key, wallets});
  });

program.parse(process.argv);
