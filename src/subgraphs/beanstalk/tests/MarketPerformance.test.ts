import {
  afterEach,
  beforeEach,
  assert,
  clearStore,
  describe,
  test,
  createMockedFunction,
  log
} from "matchstick-as/assembly/index";
import { handleSunrise } from "../src/handlers/SeasonHandler";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { v } from "../src/utils/constants/Version";
import { loadSilo } from "../src/entities/Silo";
import { getPoolTokens, PoolTokens } from "../../../core/constants/RuntimeConstants";
import { Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { BI_10 } from "../../../core/utils/Decimals";

const setWhitelistTokens = (toWhitelist: PoolTokens[]): void => {
  const silo = loadSilo(v().protocolAddress);
  const whitelistedTokens = toWhitelist.map<Bytes>((token) => token.pool as Bytes);
  silo.whitelistedTokens = whitelistedTokens;
  silo.save();
};

const mockWellBalance = (toSet: PoolTokens, balance: BigInt): void => {
  createMockedFunction(toSet.tokens[1], "balanceOf", "balanceOf(address):(uint256)")
    .withArgs([ethereum.Value.fromAddress(toSet.pool)])
    .returns([ethereum.Value.fromUnsignedBigInt(balance)]);
};

describe("Market Performance", () => {
  beforeEach(() => {
    initPintoVersion();

    const allToWhitelist = getPoolTokens(v()).slice(0, 2);
    setWhitelistTokens(allToWhitelist);

    mockWellBalance(allToWhitelist[0], BI_10.pow(18));
    mockWellBalance(allToWhitelist[1], BigInt.fromString("2").times(BI_10.pow(18)));
    //getTokenUsdPrice(address token)
  });
  afterEach(() => {
    clearStore();
  });

  describe("On Sunrise", () => {
    test("initial investigation", () => {
      // check what are the silo whitelisted tokens
      const silo = loadSilo(v().protocolAddress);
      log.info("whitelisted tokens: {}", [silo.whitelistedTokens.length.toString()]);
    });
    test("First Season", () => {
      //handleSunrise()
      // Initiated an entity, didnt complete any; no cumulative should exist
    });

    test("Sets seasonal values (1 season)", () => {
      //handleSunrise()
    });

    test("Applies cumulative values (2 seasons)", () => {
      //handleSunrise()
    });
  });
});
