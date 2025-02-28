import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadWrappedDeposit } from "../entities/Silo";
import {
  findPreviousWrappedDepositSnapshot,
  takeWrappedDepositSnapshots
} from "../entities/snapshots/WrappedSiloERC20";
import { loadBeanstalk } from "../entities/Beanstalk";

// Updates calculated yields for all wrapped silo tokens. Should be invoked seasonally.
export function updateAllWrappedDepositYields(block: ethereum.Block): void {
  const beanstalk = loadBeanstalk();

  const wrappedDepositTokens = beanstalk.wrappedDepositTokens.load();
  for (let i = 0; i < wrappedDepositTokens.length; ++i) {
    updateWrappedDepositYields(wrappedDepositTokens[i].id, block);
  }
}

// Updates calculated yields for this wrapped silo token
export function updateWrappedDepositYields(token: Address, block: ethereum.Block): void {
  const wrappedDeposit = loadWrappedDeposit(token);

  const snapshot24h = findPreviousWrappedDepositSnapshot(wrappedDeposit, 24 * 1);
  if (snapshot24h !== null) {
    const vAPY = computeAnnualizedRate(getPercentChange(snapshot24h.redeemRate, wrappedDeposit.redeemRate), 1);
    wrappedDeposit.apy24h = BigDecimal.fromString(vAPY.toString());
  }

  const snapshot7d = findPreviousWrappedDepositSnapshot(wrappedDeposit, 24 * 7);
  if (snapshot7d !== null) {
    const vAPY = computeAnnualizedRate(getPercentChange(snapshot7d.redeemRate, wrappedDeposit.redeemRate), 7);
    wrappedDeposit.apy7d = BigDecimal.fromString(vAPY.toString());
  }

  const snapshot30d = findPreviousWrappedDepositSnapshot(wrappedDeposit, 24 * 30);
  if (snapshot30d !== null) {
    const vAPY = computeAnnualizedRate(getPercentChange(snapshot30d.redeemRate, wrappedDeposit.redeemRate), 30);
    wrappedDeposit.apy30d = BigDecimal.fromString(vAPY.toString());
  }

  const snapshot90d = findPreviousWrappedDepositSnapshot(wrappedDeposit, 24 * 90);
  if (snapshot90d !== null) {
    const vAPY = computeAnnualizedRate(getPercentChange(snapshot90d.redeemRate, wrappedDeposit.redeemRate), 90);
    wrappedDeposit.apy90d = BigDecimal.fromString(vAPY.toString());
  }

  takeWrappedDepositSnapshots(wrappedDeposit, block);
  wrappedDeposit.save();
}

// Returns the annualized percentage increase if the given increase/time period is compounded over 365 days
export function computeAnnualizedRate(rate: f64, periodDays: f64): f64 {
  let base: f64 = 1.0 + rate;
  let exponent: f64 = 365.0 / periodDays;
  return Math.pow(base, exponent) - 1.0;
}

function getPercentChange(before: BigInt, after: BigInt): f64 {
  const beforeFloat: f64 = parseFloat(before.toString());
  const afterFloat: f64 = parseFloat(after.toString());
  return (afterFloat - beforeFloat) / beforeFloat;
}
