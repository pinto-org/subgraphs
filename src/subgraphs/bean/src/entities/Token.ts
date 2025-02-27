import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { ZERO_BD } from "../../../../core/utils/Decimals";
import { Token } from "../../generated/schema";
import { getTokenInfo } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";

export function loadOrCreateToken(address: Address): Token {
  let token = Token.load(address);
  if (token == null) {
    const tokenInfo = getTokenInfo(v(), address);
    token = new Token(address);
    token.name = tokenInfo.name;
    token.decimals = tokenInfo.decimals;
    token.lastPriceUSD = ZERO_BD;
    token.save();
  }
  return token as Token;
}

export function updateTokenPrice(address: Address, price: BigDecimal): void {
  let token = loadOrCreateToken(address);
  token.lastPriceUSD = price;
  token.save();
}
