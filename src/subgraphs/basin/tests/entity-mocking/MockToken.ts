import { BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { BI_MAX } from "../../../../core/utils/Decimals";
import { loadOrCreateToken } from "../../src/entities/Token";
import { v } from "../../src/utils/constants/Version";
import * as BeanstalkEth from "../../../../core/constants/raw/BeanstalkEthConstants";
import * as PintoBase from "../../../../core/constants/raw/PintoBaseConstants";
import { mockAllPintoTokens, mockL1Tokens } from "../helpers/Functions";

export function mockL1TokenPrices(): void {
  mockL1Tokens();

  const bean = loadOrCreateToken(getProtocolToken(v(), BI_MAX));
  bean.lastPriceUSD = BigDecimal.fromString("1.005");
  bean.save();

  const weth = loadOrCreateToken(BeanstalkEth.WETH);
  weth.lastPriceUSD = BigDecimal.fromString("1400");
  weth.save();
}

export function mockPintoTokenPrices(): void {
  mockAllPintoTokens();

  const pinto = loadOrCreateToken(getProtocolToken(v(), BI_MAX));
  pinto.lastPriceUSD = BigDecimal.fromString("1.005");
  pinto.save();

  const weth = loadOrCreateToken(PintoBase.WETH);
  weth.lastPriceUSD = BigDecimal.fromString("3700");
  weth.save();

  const cbeth = loadOrCreateToken(PintoBase.CBETH);
  cbeth.lastPriceUSD = BigDecimal.fromString("4150");
  cbeth.save();

  const cbbtc = loadOrCreateToken(PintoBase.CBBTC);
  cbbtc.lastPriceUSD = BigDecimal.fromString("105000");
  cbbtc.save();

  const wsol = loadOrCreateToken(PintoBase.WSOL);
  wsol.lastPriceUSD = BigDecimal.fromString("215");
  wsol.save();

  const usdc = loadOrCreateToken(PintoBase.USDC);
  usdc.lastPriceUSD = BigDecimal.fromString("1");
  usdc.save();
}
