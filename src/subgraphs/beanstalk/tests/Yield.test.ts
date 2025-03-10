import { BigInt, BigDecimal, log, Bytes } from "@graphprotocol/graph-ts";
import { assert, beforeEach, describe, test } from "matchstick-as/assembly/index";
import { BigDecimal_isClose, ZERO_BD, ZERO_BI } from "../../../core/utils/Decimals";
import {
  loadSilo,
  loadSiloAsset,
  loadSiloYield,
  loadTokenYield,
  loadWhitelistTokenSetting
} from "../src/entities/Silo";
import {
  BEAN_3CRV,
  BEAN_ERC20,
  BEAN_WETH_CP2_WELL,
  BEANSTALK,
  UNRIPE_BEAN,
  UNRIPE_LP,
  LUSD_3POOL
} from "../../../core/constants/raw/BeanstalkEthConstants";
import { setSeason } from "./utils/Season";
import { calculateAPYPreGauge } from "../src/utils/legacy/LegacyYield";
import { calculateGaugeVAPYs, updateSiloVAPYs } from "../src/utils/Yield";
import { initL1Version } from "./entity-mocking/MockVersion";

describe("APY Calculations", () => {
  beforeEach(() => {
    initL1Version();
  });
  describe("Pre-Gauge", () => {
    test("No Bean mints", () => {
      const apy = calculateAPYPreGauge(
        BigDecimal.fromString("0"), // n
        BigDecimal.fromString("2"), // seedsPerBDV
        BigDecimal.fromString("2"), // seedsPerBeanBDV
        BigInt.fromString("1636664801904743831"), // stalk
        BigInt.fromString("24942000280720") // seeds
      );

      log.info(`bean apy: {}`, [apy[0].toString()]);
      log.info(`stalk apy: {}`, [apy[1].toString()]);
      assert.assertTrue((apy[0] as BigDecimal).equals(BigDecimal.fromString("0")));
      assert.assertTrue((apy[1] as BigDecimal).gt(BigDecimal.fromString("0")));
    });

    // Sequence recreated here for testing:
    // https://docs.google.com/spreadsheets/d/1h7pPEydeAMze_uZMZzodTB3kvEXz_dGGje4KKm83gRM/edit#gid=1845553589
    test("Yields are higher with 4 seeds", () => {
      const apy2 = calculateAPYPreGauge(
        BigDecimal.fromString("1278"),
        BigDecimal.fromString("3"),
        BigDecimal.fromString("3"),
        BigInt.fromString("1636664801904743831"),
        BigInt.fromString("24942000280720")
      );
      const apy4 = calculateAPYPreGauge(
        BigDecimal.fromString("1278"),
        BigDecimal.fromString("4.5"),
        BigDecimal.fromString("3"),
        BigInt.fromString("1636664801904743831"),
        BigInt.fromString("24942000280720")
      );

      log.info(`bean apy (2 seeds): {}`, [(apy2[0] as BigDecimal).toString()]);
      log.info(`bean apy (4 seeds): {}`, [(apy4[0] as BigDecimal).toString()]);
      log.info(`stalk apy (2 seeds): {}`, [(apy2[1] as BigDecimal).toString()]);
      log.info(`stalk apy (4 seeds): {}`, [(apy4[1] as BigDecimal).toString()]);
      const desiredPrecision = BigDecimal.fromString("0.0001");
      assert.assertTrue(BigDecimal_isClose(apy2[0], BigDecimal.fromString("0.14346160171558054"), desiredPrecision));
      assert.assertTrue(BigDecimal_isClose(apy4[0], BigDecimal.fromString("0.18299935285933523"), desiredPrecision));
      assert.assertTrue(BigDecimal_isClose(apy2[1], BigDecimal.fromString("2.9293613175698485"), desiredPrecision));
      assert.assertTrue(BigDecimal_isClose(apy4[1], BigDecimal.fromString("4.318733617611663"), desiredPrecision));
    });
  });

  describe("With Seed Gauge", () => {
    test("Token yields - direct calculation", () => {
      // using non-gauge bdv 19556945 + 24417908 + 164986 (Unripe + 3crv after dewhitelisted)
      const apy = calculateGaugeVAPYs(
        [-1, 0, -2],
        BigDecimal.fromString("1278"),
        [BigDecimal.fromString("100")],
        [BigDecimal.fromString("899088")],
        BigDecimal.fromString("44139839"),
        [BigDecimal.fromString("100")],
        BigDecimal.fromString("0.33"),
        BigDecimal.fromString("2798474"),
        BigDecimal.fromString("161540879"),
        BigDecimal.fromString("4320"),
        ZERO_BI,
        [ZERO_BD, ZERO_BD],
        [[ZERO_BD, ZERO_BD]],
        [ZERO_BD, ZERO_BD],
        [null, null, ZERO_BD]
      );

      for (let i = 0; i < apy.length; ++i) {
        log.info(`bean apy: {}`, [(apy[i][0] as BigDecimal).toString()]);
        log.info(`stalk apy: {}`, [(apy[i][1] as BigDecimal).toString()]);
      }

      // Bean apy
      const desiredPrecision = BigDecimal.fromString("0.0001");
      assert.assertTrue(BigDecimal_isClose(apy[0][0], BigDecimal.fromString("0.350833589560757907"), desiredPrecision));
      assert.assertTrue(BigDecimal_isClose(apy[0][1], BigDecimal.fromString("1.658686024525446868"), desiredPrecision));

      // Profiling:
      // Calculated in a single call + fixed point arithmetic: 2900ms
      // Pre fixed-point:
      // Calculated in a single call - 5000 ms
      // Calculated separately - 8750ms
      // for (let i = -1; i <= 0; ++i) {
      //   const apy = YieldHandler.calculateGaugeVAPYs(
      //     [i],
      //     BigDecimal.fromString("100"),
      //     [BigDecimal.fromString("100")],
      //     [BigDecimal.fromString("899088")],
      //     BigDecimal.fromString("43974853"),
      //     [BigDecimal.fromString("100")],
      //     BigDecimal.fromString("0.33"),
      //     BigDecimal.fromString("2798474"),
      //     BigDecimal.fromString("161540879"),
      //     BigDecimal.fromString("4320"),
      //     ZERO_BI,
      //     [ZERO_BD, ZERO_BD],
      //     [[ZERO_BD], [ZERO_BD]],
      //     [ZERO_BD, ZERO_BD],
      //     [null]
      //   );

      //   log.info(`bean apy: {}`, [(apy[0][0] as BigDecimal).toString()]);
      //   log.info(`stalk apy: {}`, [(apy[0][1] as BigDecimal).toString()]);
      // }

      // const apyUnripe = YieldHandler.calculateGaugeVAPYs(
      //   [-2],
      //   BigDecimal.fromString("100"),
      //   [BigDecimal.fromString("100")],
      //   [BigDecimal.fromString("899088")],
      //   BigDecimal.fromString("43974853"),
      //   [BigDecimal.fromString("100")],
      //   BigDecimal.fromString("0.33"),
      //   BigDecimal.fromString("2798474"),
      //   BigDecimal.fromString("161540879"),
      //   BigDecimal.fromString("4320"),
      //   ZERO_BI,
      //   [ZERO_BD, ZERO_BD],
      //   [[ZERO_BD], [ZERO_BD]],
      //   [ZERO_BD, ZERO_BD],
      //   [ZERO_BD]
      // );

      // log.info(`bean apy: {}`, [(apyUnripe[0][0] as BigDecimal).toString()]);
      // log.info(`stalk apy: {}`, [(apyUnripe[0][1] as BigDecimal).toString()]);
    });

    test("Token yields - entity calculation", () => {
      // Set up the required entities for the calculation to have access to the required values
      let silo = loadSilo(BEANSTALK);
      silo.stalk = BigInt.fromString("1615408790000000000");
      silo.beanToMaxLpGpPerBdvRatio = BigInt.fromString("33000000000000000000");
      silo.whitelistedTokens = [BEAN_ERC20, BEAN_WETH_CP2_WELL, UNRIPE_BEAN, UNRIPE_LP];
      silo.dewhitelistedTokens = [BEAN_3CRV];
      silo.save();

      setSeason(20000);

      /// Whitelist/gauge/seed settings
      let beanWhitelistSettings = loadWhitelistTokenSetting(BEAN_ERC20);
      // Nothing needs to be set for bean
      beanWhitelistSettings.save();

      let beanEthWhitelistSettings = loadWhitelistTokenSetting(BEAN_WETH_CP2_WELL);
      beanEthWhitelistSettings.gaugePoints = BigInt.fromString("100000000000000000000");
      beanEthWhitelistSettings.isGaugeEnabled = true;
      beanEthWhitelistSettings.optimalPercentDepositedBdv = BigInt.fromString("100000000");
      beanEthWhitelistSettings.save();

      let urbeanWhitelistSettings = loadWhitelistTokenSetting(UNRIPE_BEAN);
      urbeanWhitelistSettings.stalkEarnedPerSeason = ZERO_BI;
      urbeanWhitelistSettings.save();

      let urlpWhitelistSettings = loadWhitelistTokenSetting(UNRIPE_LP);
      urlpWhitelistSettings.stalkEarnedPerSeason = ZERO_BI;
      urlpWhitelistSettings.save();

      /// Deposited BDVs
      let beanSiloAsset = loadSiloAsset(BEANSTALK, BEAN_ERC20);
      beanSiloAsset.depositedBDV = BigInt.fromString("2798474000000");
      beanSiloAsset.save();

      let beanEthSiloAsset = loadSiloAsset(BEANSTALK, BEAN_WETH_CP2_WELL);
      beanEthSiloAsset.depositedBDV = BigInt.fromString("899088000000");
      beanEthSiloAsset.save();

      let bean3crvSiloAsset = loadSiloAsset(BEANSTALK, BEAN_3CRV);
      bean3crvSiloAsset.depositedBDV = BigInt.fromString("164986000000");
      bean3crvSiloAsset.save();

      let urbeanSiloAsset = loadSiloAsset(BEANSTALK, UNRIPE_BEAN);
      urbeanSiloAsset.depositedBDV = BigInt.fromString("19556945000000");
      urbeanSiloAsset.save();

      let urlpSiloAsset = loadSiloAsset(BEANSTALK, UNRIPE_LP);
      urlpSiloAsset.depositedBDV = BigInt.fromString("24417908000000");
      urlpSiloAsset.save();

      // Nondeposited silo asset, should not have any effect
      let farmAsset = loadSiloAsset(BEANSTALK, LUSD_3POOL);
      farmAsset.save();

      // Individual farmer's silo asset, should not have any effect
      let farmerDeposit = loadSiloAsset(LUSD_3POOL, UNRIPE_BEAN);
      farmerDeposit.depositedBDV = BigInt.fromString("1234567890000");
      farmerDeposit.save();

      /// Set EMA, whitelisted tokens
      // bean3crv intentionally not whitelisted. It should still be included in non-gauge deposited bdv
      let siloYield = loadSiloYield(20000, 720);
      siloYield.beansPerSeasonEMA = BigDecimal.fromString("1278");
      siloYield.whitelistedTokens = silo.whitelistedTokens;
      siloYield.save();

      /// Actual entity-based calculation here
      updateSiloVAPYs(BEANSTALK, ZERO_BI, 720);

      const desiredPrecision = BigDecimal.fromString("0.0001");
      const beanResult = loadTokenYield(BEAN_ERC20, 20000, 720);
      log.info("bean apy {}", [beanResult.beanAPY.toString()]);
      log.info("stalk apy {}", [beanResult.stalkAPY.toString()]);
      assert.assertTrue(
        BigDecimal_isClose(beanResult.beanAPY, BigDecimal.fromString("0.350833589560757907"), desiredPrecision)
      );
      assert.assertTrue(
        BigDecimal_isClose(beanResult.stalkAPY, BigDecimal.fromString("1.658686024525446868"), desiredPrecision)
      );

      const wethResult = loadTokenYield(BEAN_WETH_CP2_WELL, 20000, 720);
      log.info("bean apy {}", [wethResult.beanAPY.toString()]);
      log.info("stalk apy {}", [wethResult.stalkAPY.toString()]);
      assert.assertTrue(
        BigDecimal_isClose(wethResult.beanAPY, BigDecimal.fromString("0.479789213832026299"), desiredPrecision)
      );
      assert.assertTrue(
        BigDecimal_isClose(wethResult.stalkAPY, BigDecimal.fromString("3.092994680033632858"), desiredPrecision)
      );

      const zeroGsResult = loadTokenYield(UNRIPE_BEAN, 20000, 720);
      log.info("bean apy {}", [zeroGsResult.beanAPY.toString()]);
      log.info("stalk apy {}", [zeroGsResult.stalkAPY.toString()]);
      assert.assertTrue(
        BigDecimal_isClose(zeroGsResult.beanAPY, BigDecimal.fromString("0.221606859225904494"), desiredPrecision)
      );
      assert.assertTrue(
        BigDecimal_isClose(zeroGsResult.stalkAPY, BigDecimal.fromString("0.222879524712790346"), desiredPrecision)
      );
    });

    test("Token yields - multiple gauge LP, one with no GP", () => {
      // 0 is beanweth, 1 is beanwsteth
      const apy = calculateGaugeVAPYs(
        [0, 1],
        BigDecimal.fromString("100"),
        // [BigDecimal.fromString("1"), BigDecimal.fromString("499")],
        [BigDecimal.fromString("0"), BigDecimal.fromString("509")],
        [BigDecimal.fromString("152986"), BigDecimal.fromString("2917")],
        BigDecimal.fromString("45143199"),
        [BigDecimal.fromString("20"), BigDecimal.fromString("80")],
        BigDecimal.fromString("1"),
        BigDecimal.fromString("5588356"),
        BigDecimal.fromString("172360290"),
        BigDecimal.fromString("4320"),
        ZERO_BI,
        [ZERO_BD, ZERO_BD],
        [
          [ZERO_BD, ZERO_BD],
          [ZERO_BD, ZERO_BD]
        ],
        [ZERO_BD, ZERO_BD],
        [null, null]
      );

      for (let i = 0; i < apy.length; ++i) {
        log.info(`bean apy: {}`, [(apy[i][0] as BigDecimal).toString()]);
        log.info(`stalk apy: {}`, [(apy[i][1] as BigDecimal).toString()]);
      }
      // Not adding any asserts for now as part of the multi-lp implementation is still incomplete
    });
  });
});
