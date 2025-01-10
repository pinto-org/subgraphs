import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";
import { BoreWell } from "../../generated/Basin-ABIs/Aquifer";
import { handleBoreWell } from "../../src/handlers/AquiferTemplateHandler";
import { AQUIFER, IMPLEMENTATION, PUMP, WELL, WELL_DATA, WELL_FUNCTION } from "./Constants";
import { createContractCallMocks } from "./Functions";
import { UPGRADEABLE_MAPPING } from "../../src/utils/UpgradeableMapping";
import * as BeanstalkEth from "../../../../core/constants/raw/BeanstalkEthConstants";
import * as BeanstalkArb from "../../../../core/constants/raw/BeanstalkArbConstants";
import * as PintoBase from "../../../../core/constants/raw/PintoBaseConstants";
import { ONE_BD } from "../../../../core/utils/Decimals";

const wellFunctionTuple = new ethereum.Tuple();
wellFunctionTuple.push(ethereum.Value.fromAddress(WELL_FUNCTION));
wellFunctionTuple.push(ethereum.Value.fromBytes(Bytes.empty()));

let pumpTuple = new ethereum.Tuple();
pumpTuple.push(ethereum.Value.fromAddress(PUMP));
pumpTuple.push(ethereum.Value.fromBytes(Bytes.empty()));

export function createBoreWellEvent(
  aquifer: Address,
  well: Address,
  tokens: Address[],
  wellFunction: ethereum.Tuple,
  pumps: ethereum.Tuple[],
  implementation: Address,
  wellData: Bytes
): BoreWell {
  let event = changetype<BoreWell>(newMockEvent());

  event.address = aquifer;
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("well", ethereum.Value.fromAddress(well));
  let param2 = new ethereum.EventParam("implementation", ethereum.Value.fromAddress(implementation));
  let param3 = new ethereum.EventParam("tokens", ethereum.Value.fromAddressArray(tokens));
  let param4 = new ethereum.EventParam("wellFunction", ethereum.Value.fromTuple(wellFunction));
  let param5 = new ethereum.EventParam("pumps", ethereum.Value.fromTupleArray(pumps));
  let param6 = new ethereum.EventParam("auger", ethereum.Value.fromBytes(wellData));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);
  event.parameters.push(param4);
  event.parameters.push(param5);
  event.parameters.push(param6);

  return event as BoreWell;
}

export function boreDefaultWell(): void {
  createContractCallMocks();
  handleBoreWell(
    createBoreWellEvent(
      AQUIFER,
      WELL,
      [BeanstalkEth.BEAN_ERC20, BeanstalkEth.WETH],
      wellFunctionTuple,
      [pumpTuple],
      IMPLEMENTATION,
      WELL_DATA
    )
  );
}

export function boreUpgradeableWell(index: i32): void {
  const tokens = [PintoBase.BEAN_ERC20, PintoBase.WETH];
  createContractCallMocks(ONE_BD, UPGRADEABLE_MAPPING[6].proxy, tokens);
  handleBoreWell(
    createBoreWellEvent(
      AQUIFER,
      UPGRADEABLE_MAPPING[6].boredWells[index],
      tokens,
      wellFunctionTuple,
      [pumpTuple],
      IMPLEMENTATION,
      WELL_DATA
    )
  );
}

export function borePintoWells(): void {
  const tokensBtc = [PintoBase.BEAN_ERC20, PintoBase.CBBTC];
  createContractCallMocks(ONE_BD, PintoBase.PINTO_CBBTC, tokensBtc);
  handleBoreWell(
    createBoreWellEvent(
      AQUIFER,
      Address.fromString("0x175c021718788c613F666018de08864767ede78C"),
      tokensBtc,
      wellFunctionTuple,
      [pumpTuple],
      IMPLEMENTATION,
      WELL_DATA
    )
  );

  const tokensWeth = [PintoBase.BEAN_ERC20, PintoBase.WETH];
  createContractCallMocks(ONE_BD, PintoBase.PINTO_WETH, tokensWeth);
  handleBoreWell(
    createBoreWellEvent(
      AQUIFER,
      Address.fromString("0x8cab609400b70eC65973A1Ad4DF63193B82D43c1"),
      tokensWeth,
      wellFunctionTuple,
      [pumpTuple],
      IMPLEMENTATION,
      WELL_DATA
    )
  );
}
