import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { loadWell } from "../entities/Well";
import { addBigDecimalArray, addBigIntArray } from "../../../../core/utils/Decimals";
import { toAddress } from "../../../../core/utils/Bytes";
import { loadBeanstalk } from "../entities/Beanstalk";
import { Trade } from "../../generated/schema";

class ConvertParams {
  event: ethereum.Event;
  account: Address;
  fromToken: Address;
  toToken: Address;
  fromAmount: BigInt;
  toAmount: BigInt;
}

enum ConvertDirection {
  UP,
  DOWN,
  NEUTRAL
}

export function convert(params: ConvertParams): void {
  // Find any corresponding deposit/withdraw entities and indicate them as converts.
  // Both can exist in the case of LP->LP converts.
  let wellCount = 0;

  const addId = `ADD_LIQUIDITY-${params.event.transaction.hash.toHexString()}-${params.toToken.toHexString()}-${params.toAmount.toString()}`;
  const addEntity = Trade.load(addId);
  if (addEntity != null) {
    addEntity.isConvert = true;
    addEntity.save();
    ++wellCount;
  }

  const removeId = `REMOVE_LIQUIDITY-${params.event.transaction.hash.toHexString()}-${params.fromToken.toHexString()}-${params.fromAmount.toString()}`;
  const removeEntity = Trade.load(removeId);
  if (removeEntity != null) {
    removeEntity.isConvert = true;
    removeEntity.save();
    ++wellCount;
  }

  // Deposit/Withdraw can involve the non-bean token, however this would only occur in NEUTRAL convert type,
  // thus assigning Deposit = DOWN/Withdraw = UP is correct for Converts involving a single Well.
  if (addEntity != null) {
    addWellConvertStats(
      toAddress(addEntity.well),
      addEntity.tradeVolumeReserves,
      addEntity.tradeVolumeReservesUSD,
      addEntity.tradeVolumeUSD,
      addEntity.transferVolumeUSD,
      wellCount == 1 ? ConvertDirection.DOWN : ConvertDirection.NEUTRAL
    );
  }

  if (removeEntity != null) {
    addWellConvertStats(
      toAddress(removeEntity.well),
      removeEntity.tradeVolumeReserves,
      removeEntity.tradeVolumeReservesUSD,
      removeEntity.tradeVolumeUSD,
      removeEntity.transferVolumeUSD,
      wellCount == 1 ? ConvertDirection.UP : ConvertDirection.NEUTRAL
    );
  }
}

function addWellConvertStats(
  wellAddress: Address,
  tradeVolumeReserves: BigInt[],
  tradeVolumeReservesUSD: BigDecimal[],
  tradeVolumeUSD: BigDecimal,
  transferVolumeUSD: BigDecimal,
  direction: ConvertDirection
): void {
  const well = loadWell(wellAddress);
  well.convertVolumeReserves = addBigIntArray(well.convertVolumeReserves, tradeVolumeReserves);
  well.rollingDailyConvertVolumeReserves = addBigIntArray(well.rollingDailyConvertVolumeReserves, tradeVolumeReserves);
  well.rollingWeeklyConvertVolumeReserves = addBigIntArray(
    well.rollingWeeklyConvertVolumeReserves,
    tradeVolumeReserves
  );

  well.convertVolumeReservesUSD = addBigDecimalArray(
    well.convertVolumeReservesUSD,
    tradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  well.rollingDailyConvertVolumeReservesUSD = addBigDecimalArray(
    well.rollingDailyConvertVolumeReservesUSD,
    tradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  well.rollingWeeklyConvertVolumeReservesUSD = addBigDecimalArray(
    well.rollingWeeklyConvertVolumeReservesUSD,
    tradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));

  well.convertVolumeUSD = well.convertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  well.rollingDailyConvertVolumeUSD = well.rollingDailyConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  well.rollingWeeklyConvertVolumeUSD = well.rollingWeeklyConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  well.save();

  const beanstalk = loadBeanstalk();
  beanstalk.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  beanstalk.rollingDailyConvertVolumeUSD = beanstalk.rollingDailyConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  beanstalk.rollingWeeklyConvertVolumeUSD = beanstalk.rollingWeeklyConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);

  if (direction == ConvertDirection.NEUTRAL) {
    // Example: 10k convert from WETH -> CBBTC.
    // ~10k volume (5k sell, 5k buy).
    // ~10k transfer amount (10k/2 + 10k/2). Transfer amount halved due to this method called twice.
    beanstalk.cumulativeConvertNeutralTradeVolumeUSD = beanstalk.cumulativeConvertNeutralTradeVolumeUSD
      .plus(tradeVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertNeutralTradeVolumeUSD = beanstalk.rollingDailyConvertNeutralTradeVolumeUSD
      .plus(tradeVolumeUSD)
      .truncate(2);
    beanstalk.rollingWeeklyConvertNeutralTradeVolumeUSD = beanstalk.rollingWeeklyConvertNeutralTradeVolumeUSD
      .plus(tradeVolumeUSD)
      .truncate(2);

    const halfTransferUSD = transferVolumeUSD.div(BigDecimal.fromString("2"));
    beanstalk.cumulativeConvertNeutralTransferVolumeUSD = beanstalk.cumulativeConvertNeutralTransferVolumeUSD
      .plus(halfTransferUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertNeutralTransferVolumeUSD = beanstalk.rollingDailyConvertNeutralTransferVolumeUSD
      .plus(halfTransferUSD)
      .truncate(2);
    beanstalk.rollingWeeklyConvertNeutralTransferVolumeUSD = beanstalk.rollingWeeklyConvertNeutralTransferVolumeUSD
      .plus(halfTransferUSD)
      .truncate(2);
  } else {
    if (direction == ConvertDirection.UP) {
      beanstalk.cumulativeConvertUpVolumeUSD = beanstalk.cumulativeConvertUpVolumeUSD.plus(tradeVolumeUSD).truncate(2);
      beanstalk.rollingDailyConvertUpVolumeUSD = beanstalk.rollingDailyConvertUpVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertUpVolumeUSD = beanstalk.rollingWeeklyConvertUpVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
    } else if (direction == ConvertDirection.DOWN) {
      beanstalk.cumulativeConvertDownVolumeUSD = beanstalk.cumulativeConvertDownVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
      beanstalk.rollingDailyConvertDownVolumeUSD = beanstalk.rollingDailyConvertDownVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertDownVolumeUSD = beanstalk.rollingWeeklyConvertDownVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
    }
  }
  beanstalk.save();
}
