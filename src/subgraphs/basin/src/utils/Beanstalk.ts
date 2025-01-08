import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { loadWell } from "../entities/Well";
import { addBigDecimalArray, addBigIntArray } from "../../../../core/utils/Decimals";
import { Deposit, Withdraw } from "../../generated/schema";
import { toAddress } from "../../../../core/utils/Bytes";
import { loadBeanstalk } from "../entities/Beanstalk";

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

  const depositId = `${params.event.transaction.hash.toHexString()}-${params.toToken.toHexString()}-${params.toAmount.toString()}`;
  const depositEntity = Deposit.load(depositId);
  if (depositEntity != null) {
    depositEntity.isConvert = true;
    depositEntity.save();
    ++wellCount;
  }

  const withdrawId = `${params.event.transaction.hash.toHexString()}-${params.fromToken.toHexString()}-${params.fromAmount.toString()}`;
  const withdrawEntity = Withdraw.load(withdrawId);
  if (withdrawEntity != null) {
    withdrawEntity.isConvert = true;
    withdrawEntity.save();
    ++wellCount;
  }

  // Deposit/Withdraw can involve the non-bean token, however this would only occur in NEUTRAL convert type,
  // thus assigning Deposit = DOWN/Withdraw = UP is correct for Converts involving a single Well.
  if (depositEntity != null) {
    addWellConvertStats(
      toAddress(depositEntity.well),
      depositEntity.tradeVolumeReserves,
      depositEntity.tradeVolumeReservesUSD,
      depositEntity.tradeVolumeUSD,
      wellCount == 1 ? ConvertDirection.DOWN : ConvertDirection.NEUTRAL
    );
  }

  if (withdrawEntity != null) {
    addWellConvertStats(
      toAddress(withdrawEntity.well),
      withdrawEntity.tradeVolumeReserves,
      withdrawEntity.tradeVolumeReservesUSD,
      withdrawEntity.tradeVolumeUSD,
      wellCount == 1 ? ConvertDirection.UP : ConvertDirection.NEUTRAL
    );
  }
}

function addWellConvertStats(
  wellAddress: Address,
  tradeVolumeReserves: BigInt[],
  tradeVolumeReservesUSD: BigDecimal[],
  tradeVolumeUSD: BigDecimal,
  direction: ConvertDirection
): void {
  const well = loadWell(wellAddress);
  well.convertVolumeReserves = addBigIntArray(well.convertVolumeReserves, tradeVolumeReserves);
  well.convertVolumeReservesUSD = addBigDecimalArray(
    well.convertVolumeReservesUSD,
    tradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  well.convertVolumeUSD = well.convertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
  well.save();

  const beanstalk = loadBeanstalk();
  if (direction == ConvertDirection.NEUTRAL) {
    // LP->LP converts will invoke this method once per Well. Avoid double-counting the same usd value
    const halfVolume = tradeVolumeUSD.div(BigDecimal.fromString("2"));
    beanstalk.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD.plus(halfVolume).truncate(2);
    beanstalk.cumulativeConvertNeutralVolumeUSD = beanstalk.cumulativeConvertNeutralVolumeUSD
      .plus(halfVolume)
      .truncate(2);
  } else {
    beanstalk.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD.plus(tradeVolumeUSD).truncate(2);
    if (direction == ConvertDirection.UP) {
      beanstalk.cumulativeConvertUpVolumeUSD = beanstalk.cumulativeConvertUpVolumeUSD.plus(tradeVolumeUSD).truncate(2);
    } else if (direction == ConvertDirection.DOWN) {
      beanstalk.cumulativeConvertDownVolumeUSD = beanstalk.cumulativeConvertDownVolumeUSD
        .plus(tradeVolumeUSD)
        .truncate(2);
    }
  }
  beanstalk.save();
}
