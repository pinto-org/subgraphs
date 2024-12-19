import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as/assembly/index";
import {
  BEAN_3CRV,
  BEAN_ERC20,
  BEAN_WETH_CP2_WELL,
  BEANSTALK as BEANSTALK_ETH,
  CRV3_TOKEN,
  WETH
} from "../../../../core/constants/raw/BeanstalkEthConstants";
import { BEAN_USD_PRICE, WELL } from "./Constants";
import { setMockBeanPrice } from "../../../../core/tests/event-mocking/Price";
import { ONE_BD, ZERO_BD } from "../../../../core/utils/Decimals";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import * as PintoBase from "../../../../core/constants/raw/PintoBaseConstants";

let prevPriceMocked = ZERO_BD;
let mockedERC20s: Address[] = [];

export function createContractCallMocks(
  priceMultiple: BigDecimal = ONE_BD,
  well: Address = WELL,
  tokens: Address[] = [BEAN_ERC20, WETH]
): void {
  if (prevPriceMocked != priceMultiple) {
    prevPriceMocked = priceMultiple;
    const price = BigInt.fromString(new BigDecimal(BEAN_USD_PRICE).times(priceMultiple).truncate(0).toString());

    setMockBeanPrice({
      price: price,
      liquidity: BigInt.fromString("26025239751318").times(BigInt.fromU32(2)),
      deltaB: BigInt.fromString("-866349934591").times(BigInt.fromU32(2)),
      ps: [
        {
          contract: BEAN_3CRV,
          tokens: [BEAN_ERC20, CRV3_TOKEN],
          balances: [BigInt.fromString("14306013160240"), BigInt.fromString("12306817594155799426763734")],
          price: price,
          liquidity: BigInt.fromString("26025239751318"),
          beanLiquidity: BigInt.fromString("13012619875659"),
          nonBeanLiquidity: BigInt.fromString("13012619875659"),
          deltaB: BigInt.fromString("-866349934591"),
          lpUsd: BigInt.fromString("969328"),
          lpBdv: BigInt.fromString("1032515")
        },
        {
          contract: BEAN_WETH_CP2_WELL,
          tokens: [BEAN_ERC20, WETH],
          balances: [BigInt.fromString("2000000000"), BigInt.fromString("1500000000000000000")],
          price: price,
          liquidity: BigInt.fromString("26025239751318"),
          beanLiquidity: BigInt.fromString("13012619875659"),
          nonBeanLiquidity: BigInt.fromString("13012619875659"),
          deltaB: BigInt.fromString("-866349934591"),
          lpUsd: BigInt.fromString("969328"),
          lpBdv: BigInt.fromString("1032515")
        }
      ]
    });
  }

  if (!mockedERC20s.includes(well)) {
    createMockedFunction(well, "name", "name():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("Well LP")]);
    createMockedFunction(well, "symbol", "symbol():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("BEAN-WETH-wCP2")]);
    createMockedFunction(well, "decimals", "decimals():(uint8)")
      .withArgs([])
      .returns([ethereum.Value.fromI32(12)]);
    mockedERC20s.push(well);

    createMockedFunction(BEANSTALK_ETH, "getTokenUsdPrice", "getTokenUsdPrice(address):(uint256)")
      .withArgs([ethereum.Value.fromAddress(WETH)])
      .reverts();
  }

  if (!mockedERC20s.includes(tokens[0])) {
    createMockedFunction(tokens[0], "name", "name():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("Bean")]);
    createMockedFunction(tokens[0], "symbol", "symbol():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("BEAN")]);
    createMockedFunction(tokens[0], "decimals", "decimals():(uint8)")
      .withArgs([])
      .returns([ethereum.Value.fromI32(6)]);
    mockedERC20s.push(tokens[0]);
  }

  if (!mockedERC20s.includes(tokens[1])) {
    createMockedFunction(tokens[1], "name", "name():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("WETH")]);
    createMockedFunction(tokens[1], "symbol", "symbol():(string)")
      .withArgs([])
      .returns([ethereum.Value.fromString("WETH")]);
    createMockedFunction(tokens[1], "decimals", "decimals():(uint8)")
      .withArgs([])
      .returns([ethereum.Value.fromI32(18)]);
    mockedERC20s.push(tokens[1]);
  }
}

export function mockAllPintoTokens(): void {
  createMockedFunction(PintoBase.BEAN_ERC20, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("PINTO")]);
  createMockedFunction(PintoBase.WETH, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("WETH")]);
  createMockedFunction(PintoBase.CBETH, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("cbETH")]);
  createMockedFunction(PintoBase.CBBTC, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("cbBTC")]);
  createMockedFunction(PintoBase.WSOL, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("WSOL")]);
  createMockedFunction(PintoBase.USDC, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("USDC")]);

  createMockedFunction(PintoBase.BEAN_ERC20, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("PINTO")]);
  createMockedFunction(PintoBase.WETH, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("WETH")]);
  createMockedFunction(PintoBase.CBETH, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("cbETH")]);
  createMockedFunction(PintoBase.CBBTC, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("cbBTC")]);
  createMockedFunction(PintoBase.WSOL, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("WSOL")]);
  createMockedFunction(PintoBase.USDC, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString("USDC")]);

  createMockedFunction(PintoBase.BEAN_ERC20, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(6)]);
  createMockedFunction(PintoBase.WETH, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(18)]);
  createMockedFunction(PintoBase.CBETH, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(18)]);
  createMockedFunction(PintoBase.CBBTC, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(8)]);
  createMockedFunction(PintoBase.WSOL, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(9)]);
  createMockedFunction(PintoBase.USDC, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(6)]);

  mockedERC20s.push(PintoBase.BEAN_ERC20);
  mockedERC20s.push(PintoBase.WETH);
  mockedERC20s.push(PintoBase.CBETH);
  mockedERC20s.push(PintoBase.CBBTC);
  mockedERC20s.push(PintoBase.WSOL);
  mockedERC20s.push(PintoBase.USDC);
}
