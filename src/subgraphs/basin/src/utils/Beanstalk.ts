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

export function convert(params: ConvertParams): void {
  // Find any corresponding deposit/withdraw entities and indicate them as converts.
  // Both can exist in the case of LP->LP converts.
  let count = 0;

  const depositId = `${params.event.transaction.hash.toHexString()}-${params.toToken.toHexString()}-${params.toAmount.toString()}`;
  const depositEntity = Deposit.load(depositId);
  if (depositEntity != null) {
    depositEntity.isConvert = true;
    depositEntity.save();
    addConvertStats(
      toAddress(depositEntity.well),
      depositEntity.tradeVolumeReserves,
      depositEntity.tradeVolumeReservesUSD,
      depositEntity.tradeVolumeUSD
    );
  }

  const withdrawId = `${params.event.transaction.hash.toHexString()}-${params.fromToken.toHexString()}-${params.fromAmount.toString()}`;
  const withdrawEntity = Withdraw.load(withdrawId);
  if (withdrawEntity != null) {
    withdrawEntity.isConvert = true;
    withdrawEntity.save();
    addConvertStats(
      toAddress(withdrawEntity.well),
      withdrawEntity.tradeVolumeReserves,
      withdrawEntity.tradeVolumeReservesUSD,
      withdrawEntity.tradeVolumeUSD
    );
  }
}

function addConvertStats(
  wellAddress: Address,
  tradeVolumeReserves: BigInt[],
  tradeVolumeReservesUSD: BigDecimal[],
  tradeVolumeUSD: BigDecimal
) {
  const well = loadWell(wellAddress);
  well.convertVolumeReserves = addBigIntArray(well.convertVolumeReserves, tradeVolumeReserves);
  well.convertVolumeReservesUSD = addBigDecimalArray(well.convertVolumeReservesUSD, tradeVolumeReservesUSD);
  well.convertVolumeUSD = well.convertVolumeUSD.plus(tradeVolumeUSD);
  well.save();

  // Must be a Beanstalk Well also
  const beanstalk = loadBeanstalk();
  beanstalk.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD.plus(tradeVolumeUSD);
  // TODO: If LP convert its neither up nor down.
}
