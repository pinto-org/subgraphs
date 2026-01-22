import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Version } from "../../../generated/schema";
import { VersionDto } from "../../../../../core/constants/RuntimeConstants";
import { toAddress } from "../../../../../core/utils/Bytes";
import * as BeanstalkEth from "../../../../../core/constants/raw/BeanstalkEthConstants";
import * as BeanstalkArb from "../../../../../core/constants/raw/BeanstalkArbConstants";
import * as PintoBase from "../../../../../core/constants/raw/PintoBaseConstants";

export function handleInitVersion(block: ethereum.Block): void {
  const versionEntity = new Version("subgraph");
  versionEntity.versionNumber = "1.12.1";
  versionEntity.subgraphName = subgraphNameForBlockNumber(block.number);
  versionEntity.protocolAddress = protocolForBlockNumber(block.number);
  versionEntity.chain = chainForBlockNumber(block.number);
  versionEntity.save();
}

function subgraphNameForBlockNumber(blockNumber: BigInt): string {
  if (blockNumber == BeanstalkEth.BEANSTALK_BLOCK) {
    return "beanstalk";
  } else if (blockNumber == BeanstalkArb.RESEED_BLOCK) {
    return "beanstalk";
  } else if (blockNumber == PintoBase.PINTOSTALK_BLOCK) {
    return "pintostalk";
  }
  throw new Error("Unable to initialize subgraph name for this block number");
}

function protocolForBlockNumber(blockNumber: BigInt): Address {
  if (blockNumber == BeanstalkEth.BEANSTALK_BLOCK) {
    return BeanstalkEth.BEANSTALK;
  } else if (blockNumber == BeanstalkArb.RESEED_BLOCK) {
    return BeanstalkArb.BEANSTALK;
  } else if (blockNumber == PintoBase.PINTOSTALK_BLOCK) {
    return PintoBase.BEANSTALK;
  }
  throw new Error("Unable to initialize protocol address for this block number");
}

function chainForBlockNumber(blockNumber: BigInt): string {
  if (blockNumber == BeanstalkEth.BEANSTALK_BLOCK) {
    return "ethereum";
  } else if (blockNumber == BeanstalkArb.RESEED_BLOCK) {
    return "arbitrum";
  } else if (blockNumber == PintoBase.PINTOSTALK_BLOCK) {
    return "base";
  }
  throw new Error("Unable to initialize chain for this block number");
}

export function v(): VersionDto {
  const versionEntity = Version.load("subgraph")!;
  return {
    subgraphName: versionEntity.subgraphName,
    versionNumber: versionEntity.versionNumber,
    protocolAddress: toAddress(versionEntity.protocolAddress),
    chain: versionEntity.chain
  };
}
