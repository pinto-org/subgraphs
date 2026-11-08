import { BigInt, Bytes, DataSourceContext, ethereum } from "@graphprotocol/graph-ts";
import { afterEach, assert, beforeEach, clearStore, newMockEvent, test } from "matchstick-as/assembly/index";
import { dataSourceMock } from "matchstick-as/assembly/data_source_mock";
import { AutoConvertWell, PintoFeeWellUpgraded, WellFunctionReplaced } from "../generated/Basin-ABIs/PintoAutoConvert";
import {
  handleAutoConvertWell,
  handlePintoFeeWellUpgraded,
  handleWellFunctionReplaced
} from "../src/handlers/AutoConvertHandler";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { mockPintoTokenPrices } from "./entity-mocking/MockToken";
import { borePintoWells, createBoreWellEvent } from "./helpers/Aquifer";
import { mockAddLiquidity, mockRemoveLiquidityOneBean } from "./helpers/Liquidity";
import {
  BEAN_SWAP_AMOUNT,
  WELL_LP_AMOUNT,
  WETH_SWAP_AMOUNT,
  AQUIFER,
  IMPLEMENTATION,
  WELL_FUNCTION,
  WELL_DATA
} from "./helpers/Constants";
import { PINTO_CBBTC, PINTO_WETH, BEAN_ERC20, CBBTC } from "../../../core/constants/raw/PintoBaseConstants";
import { ONE_BD, ZERO_BI } from "../../../core/utils/Decimals";
import { Trade, WellHourlySnapshot, BeanstalkHourlySnapshot } from "../generated/schema";
import { getLiquidityEntityId } from "../src/entities/Trade";
import { loadWell } from "../src/entities/Well";
import { handleBoreWell } from "../src/handlers/AquiferTemplateHandler";
import { loadBeanstalk } from "../src/entities/Beanstalk";
import { takeWellSnapshots } from "../src/entities/snapshots/Well";
import { takeBeanstalkSnapshots } from "../src/entities/snapshots/Beanstalk";

function uint(name: string, n: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(n));
}
beforeEach(() => {
  dataSourceMock.resetValues();
  initPintoVersion();
  borePintoWells();
  mockPintoTokenPrices();
});
afterEach(() => {
  clearStore();
  dataSourceMock.resetValues();
});

test("one AutoConvertWell classifies the aggregate LP removal, without a second market trade", () => {
  mockAddLiquidity([BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT], WELL_LP_AMOUNT.times(BigInt.fromI32(5)), ONE_BD, PINTO_CBBTC);
  const removal = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, PINTO_CBBTC);
  const id = getLiquidityEntityId("REMOVE_LIQUIDITY", removal, WELL_LP_AMOUNT, true);
  const event = changetype<AutoConvertWell>(newMockEvent());
  event.transaction = removal.transaction;
  event.block = removal.block;
  event.parameters = [
    uint("programId", BigInt.fromI32(1)),
    uint("observationSeason", BigInt.fromI32(100)),
    new ethereum.EventParam("well", ethereum.Value.fromAddress(PINTO_CBBTC)),
    uint("lpAmount", WELL_LP_AMOUNT),
    uint("beanAmount", BEAN_SWAP_AMOUNT),
    uint("bdvConverted", BEAN_SWAP_AMOUNT)
  ];
  handleAutoConvertWell(event);
  assert.assertTrue(Trade.load(id)!.isConvert);
  assert.assertTrue(loadWell(PINTO_CBBTC).convertVolumeUSD.gt(ONE_BD));
  assert.entityCount("Trade", 2);
  const well = loadWell(PINTO_CBBTC);
  const snapshot = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString())!;
  assert.assertTrue(snapshot.convertVolumeUSD.equals(well.convertVolumeUSD));
  assert.assertTrue(snapshot.deltaConvertVolumeUSD.equals(well.convertVolumeUSD));
  const global = loadBeanstalk();
  const globalSnapshot = BeanstalkHourlySnapshot.load("beanstalk-" + global.lastSeason)!;
  assert.assertTrue(globalSnapshot.cumulativeConvertUpVolumeUSD.equals(well.convertVolumeUSD));
  assert.assertTrue(globalSnapshot.deltaConvertUpVolumeUSD.equals(well.convertVolumeUSD));
  // A coordinated batch can include a Well with no input; it creates no phantom conversion.
  event.parameters[3] = uint("lpAmount", ZERO_BI);
  const volume = loadWell(PINTO_CBBTC).convertVolumeUSD;
  handleAutoConvertWell(event);
  assert.assertTrue(loadWell(PINTO_CBBTC).convertVolumeUSD.equals(volume));
  assert.entityCount("Trade", 2);
  // The next empty season must not inherit the previous season's conversion.
  event.block.timestamp = event.block.timestamp.plus(BigInt.fromI32(3600));
  global.lastSeason = "2";
  global.save();
  takeWellSnapshots(well, event.block);
  takeBeanstalkSnapshots(global, event.block);
  const next = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString())!;
  assert.assertTrue(next.deltaConvertVolumeUSD.equals(ZERO_BI.toBigDecimal()));
  assert.assertTrue(
    BeanstalkHourlySnapshot.load("beanstalk-2")!.deltaConvertUpVolumeUSD.equals(ZERO_BI.toBigDecimal())
  );
});

test("multi-Well snapshots include the last conversion leg without requiring a later trade", () => {
  const wells = [PINTO_CBBTC, PINTO_WETH];
  for (let i = 0; i < wells.length; i++) {
    mockAddLiquidity([BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT], WELL_LP_AMOUNT.times(BigInt.fromI32(5)), ONE_BD, wells[i]);
  }
  let total = ZERO_BI.toBigDecimal();
  for (let i = 0; i < wells.length; i++) {
    const removal = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, wells[i]);
    const event = changetype<AutoConvertWell>(newMockEvent());
    event.transaction = removal.transaction;
    event.block = removal.block;
    event.parameters = [
      uint("programId", BigInt.fromI32(1)),
      uint("observationSeason", BigInt.fromI32(100)),
      new ethereum.EventParam("well", ethereum.Value.fromAddress(wells[i])),
      uint("lpAmount", WELL_LP_AMOUNT),
      uint("beanAmount", BEAN_SWAP_AMOUNT),
      uint("bdvConverted", BEAN_SWAP_AMOUNT)
    ];
    handleAutoConvertWell(event);
    const well = loadWell(wells[i]);
    total = total.plus(well.convertVolumeUSD);
    const snapshot = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString())!;
    assert.assertTrue(snapshot.deltaConvertVolumeUSD.equals(well.convertVolumeUSD));
  }
  const global = loadBeanstalk();
  const snapshot = BeanstalkHourlySnapshot.load("beanstalk-" + global.lastSeason)!;
  assert.assertTrue(snapshot.cumulativeConvertUpVolumeUSD.equals(total));
  assert.assertTrue(snapshot.deltaConvertUpVolumeUSD.equals(total));
  assert.entityCount("Trade", 4);
});

test("release implementation BoreWell is ignored until the actual proxy upgrade", () => {
  const context = new DataSourceContext();
  context.setString("pintoBoredWells", `${IMPLEMENTATION.toHexString()}=${PINTO_CBBTC.toHexString()}`);
  dataSourceMock.setContext(context);
  const oldImplementation = loadWell(PINTO_CBBTC).boredWell;
  const fn = new ethereum.Tuple();
  fn.push(ethereum.Value.fromAddress(WELL_FUNCTION));
  fn.push(ethereum.Value.fromBytes(Bytes.empty()));
  handleBoreWell(createBoreWellEvent(AQUIFER, IMPLEMENTATION, [BEAN_ERC20, CBBTC], fn, [], IMPLEMENTATION, WELL_DATA));
  assert.entityCount("Well", 2);
  assert.entityCount("WellUpgradeHistory", 2);
  assert.assertTrue(loadWell(PINTO_CBBTC).boredWell.equals(oldImplementation));

  const changed = changetype<WellFunctionReplaced>(newMockEvent());
  changed.parameters = [
    new ethereum.EventParam("well", ethereum.Value.fromAddress(PINTO_CBBTC)),
    new ethereum.EventParam("oldFunction", ethereum.Value.fromAddress(WELL_FUNCTION)),
    new ethereum.EventParam("newFunction", ethereum.Value.fromAddress(IMPLEMENTATION))
  ];
  handleWellFunctionReplaced(changed);
  assert.assertTrue(loadWell(PINTO_CBBTC).wellFunction.equals(IMPLEMENTATION));
  const upgraded = changetype<PintoFeeWellUpgraded>(newMockEvent());
  upgraded.parameters = [
    new ethereum.EventParam("well", ethereum.Value.fromAddress(PINTO_CBBTC)),
    new ethereum.EventParam("boredImplementation", ethereum.Value.fromAddress(IMPLEMENTATION)),
    new ethereum.EventParam("feeBase", ethereum.Value.fromAddress(IMPLEMENTATION))
  ];
  handlePintoFeeWellUpgraded(upgraded);
  assert.assertTrue(loadWell(PINTO_CBBTC).boredWell.equals(IMPLEMENTATION));
  assert.entityCount("WellUpgradeHistory", 3);
});
