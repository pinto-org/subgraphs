import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { afterEach, assert, beforeEach, clearStore, describe, newMockEvent, test } from "matchstick-as/assembly/index";
import { PintoFeeBurned } from "../generated/Basin-ABIs/PintoFeeWell";
import { handlePintoFeeBurned, handleSwap, handleShift } from "../src/handlers/WellHandler";
import { BASIN_BLOCK, BEAN_ERC20, WETH } from "../../../core/constants/raw/BeanstalkEthConstants";
import { initL1Version } from "./entity-mocking/MockVersion";
import { mockL1TokenPrices } from "./entity-mocking/MockToken";
import { boreDefaultWell } from "./helpers/Aquifer";
import { mockAddLiquidity, mockSync } from "./helpers/Liquidity";
import { createSwapEvent, createShiftEvent } from "./helpers/Well";
import { WELL, SWAP_ACCOUNT, CURRENT_BLOCK_TIMESTAMP } from "./helpers/Constants";
import { loadWell } from "../src/entities/Well";

const INPUT = BigInt.fromString("1000000000");
const OUTPUT = BigInt.fromString("100000000000000000");
const FEE = BigInt.fromString("2500000");
const START = [BigInt.fromString("50000000000"), BigInt.fromString("20000000000000000000")];

function burn(amount: BigInt = FEE, address: Address = WELL): void {
  const e = changetype<PintoFeeBurned>(newMockEvent());
  e.address = address;
  e.block.number = BASIN_BLOCK;
  e.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  e.logIndex = BigInt.fromI32(100);
  e.parameters = [new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))];
  handlePintoFeeBurned(e);
}

function swap(from: Address, to: Address, amountIn: BigInt, amountOut: BigInt): void {
  const event = createSwapEvent(WELL, SWAP_ACCOUNT, from, to, amountIn, amountOut);
  event.block.number = BASIN_BLOCK;
  handleSwap(event);
}

describe("Pinto fee reserves", () => {
  beforeEach(() => {
    initL1Version();
    mockL1TokenPrices();
    boreDefaultWell();
    mockAddLiquidity(START);
  });
  afterEach(() => clearStore());

  test("burn before gross-input Swap is counted exactly once", () => {
    const supply = loadWell(WELL).lpTokenSupply;
    burn();
    assert.entityCount("Trade", 1); // the initial add only
    swap(BEAN_ERC20, WETH, INPUT, OUTPUT);
    assert.bigIntEquals(loadWell(WELL).reserves[0], START[0].plus(INPUT).minus(FEE));
    assert.bigIntEquals(loadWell(WELL).reserves[1], START[1].minus(OUTPUT));
    assert.bigIntEquals(loadWell(WELL).lpTokenSupply, supply);
    assert.entityCount("Trade", 2);
    assert.entityCount("PintoFeeBurnRecord", 1);
  });

  test("burn after Swap updates reserves without a second trade or extra volume", () => {
    swap(WETH, BEAN_ERC20, OUTPUT, INPUT);
    const volume = loadWell(WELL).cumulativeTradeVolumeUSD;
    burn();
    assert.bigIntEquals(loadWell(WELL).reserves[0], START[0].minus(INPUT).minus(FEE));
    assert.bigIntEquals(loadWell(WELL).reserves[1], START[1].plus(OUTPUT));
    assert.assertTrue(loadWell(WELL).cumulativeTradeVolumeUSD.equals(volume));
    assert.entityCount("Trade", 2);
  });

  test("Shift final reserves do not double debit a preceding burn", () => {
    burn();
    const finalReserves = [START[0].plus(INPUT).minus(FEE), START[1].minus(OUTPUT)];
    const event = createShiftEvent(WELL, SWAP_ACCOUNT, finalReserves, WETH, OUTPUT);
    event.block.number = BASIN_BLOCK;
    handleShift(event);
    assert.bigIntEquals(loadWell(WELL).reserves[0], finalReserves[0]);
    assert.bigIntEquals(loadWell(WELL).reserves[1], finalReserves[1]);
    assert.entityCount("Trade", 2);
  });

  test("Sync final reserves do not double debit a preceding burn", () => {
    burn();
    const finalReserves = [START[0].plus(INPUT).minus(FEE), START[1]];
    mockSync(finalReserves);
    assert.bigIntEquals(loadWell(WELL).reserves[0], finalReserves[0]);
    assert.bigIntEquals(loadWell(WELL).reserves[1], finalReserves[1]);
  });

  test("a fee greater than the previous reserve can precede a large gross input", () => {
    const largeFee = START[0].plus(FEE);
    burn(largeFee);
    swap(BEAN_ERC20, WETH, largeFee.times(BigInt.fromI32(1000)), OUTPUT);
    assert.bigIntEquals(loadWell(WELL).reserves[0], START[0].plus(largeFee.times(BigInt.fromI32(999))));
  });

  test("an arbitrary Well cannot emit the fee event into canonical accounting", () => {
    burn(FEE, Address.fromString("0x1111111111111111111111111111111111111111"));
    assert.entityCount("PintoFeeBurnRecord", 0);
    assert.bigIntEquals(loadWell(WELL).reserves[0], START[0]);
  });
});
