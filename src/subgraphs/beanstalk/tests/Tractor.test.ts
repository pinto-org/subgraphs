import { afterEach, beforeEach, assert, clearStore, describe, test, log } from "matchstick-as/assembly/index";
import { Bytes, BigInt, ethereum, Address } from "@graphprotocol/graph-ts";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { v } from "../src/utils/constants/Version";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { BI_MAX, ZERO_BI } from "../../../core/utils/Decimals";
import { createOperatorRewardEvent, createTractorEvent } from "./event-mocking/Tractor";
import { handleOperatorReward, handleTractor } from "../src/handlers/TractorHandler";

const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");

const executeTractor = (
  publisher: Address,
  operator: Address,
  reward: BigInt = ZERO_BI,
  token: Address | null = null
): void => {
  if (token === null) {
    token = getProtocolToken(v(), BI_MAX);
  }
  const tractorEvent = createTractorEvent(operator, publisher, Bytes.fromI32(5));
  const rewardEvent = createOperatorRewardEvent(0, publisher, operator, token, reward);
  handleOperatorReward(rewardEvent);
  handleTractor(tractorEvent);
};

describe("Tractor", () => {
  beforeEach(() => {
    initPintoVersion();
  });
  afterEach(() => {
    clearStore();
  });

  test("Tractor execution counter", () => {
    executeTractor(ADDR1, ADDR2);
    executeTractor(ADDR2, ADDR1);
    executeTractor(ADDR2, ADDR1);

    assert.fieldEquals(
      "TractorReward",
      `${ADDR1.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "publisherExecutions",
      "1"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR1.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "operatorExecutions",
      "2"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR2.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "publisherExecutions",
      "2"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR2.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "operatorExecutions",
      "1"
    );
    assert.fieldEquals("Tractor", "tractor", "totalExecutions", "3");
  });

  test("Tracks paid/received rewards", () => {
    executeTractor(ADDR1, ADDR2, BigInt.fromString("5000"));
    executeTractor(ADDR1, ADDR2, BigInt.fromString("8000"));
    executeTractor(ADDR1, ADDR2, BigInt.fromString("-2000"));

    assert.fieldEquals(
      "TractorReward",
      `${ADDR1.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "publisherPosAmount",
      "13000"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR1.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "publisherNegAmount",
      "2000"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR2.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "operatorPosAmount",
      "13000"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR2.toHexString()}-0-${getProtocolToken(v(), BI_MAX).toHexString()}`,
      "operatorNegAmount",
      "2000"
    );
    assert.fieldEquals("Tractor", "tractor", "totalPosBeanTips", "13000");
    assert.fieldEquals("Tractor", "tractor", "totalNegBeanTips", "2000");
  });

  test("Global tractor rewards does not include non-bean tokens", () => {
    executeTractor(ADDR1, ADDR2, BigInt.fromString("5000"));
    assert.fieldEquals("Tractor", "tractor", "totalPosBeanTips", "5000");
    assert.fieldEquals("Tractor", "tractor", "totalNegBeanTips", "0");
    assert.fieldEquals("Tractor", "tractor", "totalExecutions", "1");

    // Execute again with non-bean reward
    executeTractor(ADDR1, ADDR2, BigInt.fromString("12000"), ADDR2);

    assert.fieldEquals("Tractor", "tractor", "totalPosBeanTips", "5000");
    assert.fieldEquals("Tractor", "tractor", "totalNegBeanTips", "0");
    assert.fieldEquals("Tractor", "tractor", "totalExecutions", "2");

    assert.fieldEquals(
      "TractorReward",
      `${ADDR1.toHexString()}-0-${ADDR2.toHexString()}`,
      "publisherPosAmount",
      "12000"
    );
    assert.fieldEquals(
      "TractorReward",
      `${ADDR2.toHexString()}-0-${ADDR2.toHexString()}`,
      "operatorPosAmount",
      "12000"
    );
  });

  // The below was an attempt at decoding the blueprint data. It's not working and appears to have hit a limitation with ethereum.decode
  // test("(not working) Test blueprint data decoding logic", () => {
  //   const advancedFarmSelector = Bytes.fromHexString("0x36bfafbd");
  //   // advancedPipe((address,bytes,bytes)[],uint256)
  //   const advancedPipeSelector = Bytes.fromHexString("0xb452c7ae");
  //   // sowBlueprintv0(uint8[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address[],address,int256)
  //   const sowBlueprintV0Selector = Bytes.fromHexString("0xc0b902e8");

  //   // From PublishRequisition event, blueprint.data
  //   const requisition_blueprint_data = Bytes.fromHexString(
  //     "0x36bfafbd0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000042000000000000000000000000000000000000000000000000000000000000003a4b452c7ae00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000dee24c99e8df7f0e058f4f48f228cc07db704fc000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000002443ca8e1b20000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000127e0a100000000000000000000000000000000000000000000000000000000000496ed400000000000000000000000000000000000000000000000000000000022de6440000000000000000000000000000000000000000000000000000000002abc8d40000000000000000000000000000000000000000000000000000025c712ac47800000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000000000000000000000000000000000000000012c0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000ff0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  //   );
  //   const advancedFarm = Bytes.fromUint8Array(requisition_blueprint_data.subarray(4));

  //   const decodedAdvFarm = ethereum.decode("(bytes, bytes)[]", advancedFarm);
  //   if (decodedAdvFarm !== null) {
  //     log.debug("Decoded adv farm", []);
  //     const advancedFarmArray = decodedAdvFarm.toArray();
  //     for (let i = 0; i < advancedFarmArray.length; ++i) {
  //       const advancedFarmTuple = advancedFarmArray[i].toTuple();
  //       const farmCalldata = advancedFarmTuple[0].toBytes();
  //       log.debug("Got advancedFarm calldata {}", [farmCalldata.toHexString()]);

  //       const farmCallSelector = Bytes.fromUint8Array(farmCalldata.subarray(0, 4));
  //       if (farmCallSelector != advancedPipeSelector) {
  //         log.debug("Calldata wasnt for advanced pipe {}", [farmCallSelector.toHexString()]);
  //         continue;
  //       }
  //       const advPipeBytes = Bytes.fromUint8Array(farmCalldata.subarray(4));

  //       const decodedAdvPipe = ethereum.decode("((address,bytes,bytes)[],uint256)", advPipeBytes);
  //       if (decodedAdvPipe !== null) {
  //         log.debug("Decoded adv pipe", []);
  //         const advancedPipeCalls = decodedAdvPipe.toTuple()[0].toArray();
  //         for (let j = 0; j < advancedPipeCalls.length; ++j) {
  //           const pipeCalldata = advancedPipeCalls[i].toTuple()[1].toBytes();
  //           log.debug("Got advancedPipe calldata {}", [pipeCalldata.toHexString()]);

  //           const advPipeSelector = Bytes.fromUint8Array(pipeCalldata.subarray(0, 4));
  //           if (advPipeSelector != sowBlueprintV0Selector) {
  //             log.debug("Calldata wasnt for sow blueprint {}", [advPipeSelector.toHexString()]);
  //             continue;
  //           }
  //           const sowBlueprintBytes = Bytes.fromUint8Array(pipeCalldata.subarray(4));

  //           const decodedSowBlueprintV0 = ethereum.decode(
  //             "(uint8[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address[],address,int256)",
  //             sowBlueprintBytes
  //           );
  //           if (decodedSowBlueprintV0 !== null) {
  //             log.debug("Decoded sow blueprint v0", []);
  //             const sowParamsTuple = decodedSowBlueprintV0.toTuple();
  //             const sowAmount = sowParamsTuple[1].toBigInt();
  //             const minTemp = sowParamsTuple[4].toBigInt();
  //             const maxLine = sowParamsTuple[5].toBigInt();

  //             log.debug("Extracted values from order: {} {} {}", [
  //               sowAmount.toString(),
  //               minTemp.toString(),
  //               maxLine.toString()
  //             ]);
  //           }
  //         }
  //       } else {
  //         log.debug("Failed to decode adv pipe {}", [advPipeBytes.toHexString()]);
  //       }
  //     }
  //   }
  // });
});
