import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { boreDefaultWell } from "./helpers/Aquifer";
import { initL1Version } from "./entity-mocking/MockVersion";
import { handleDewhitelistToken } from "../src/handlers/BeanstalkHandler";
import { createDewhitelistTokenEvent } from "./helpers/Beanstalk";
import { WELL } from "./helpers/Constants";

describe("Whitelisting", () => {
  beforeEach(() => {
    initL1Version();
    boreDefaultWell();
  });

  afterEach(() => {
    clearStore();
  });

  test("Dewhitelist", () => {
    assert.fieldEquals("Well", WELL.toHexString(), "isBeanstalk", "true");
    handleDewhitelistToken(createDewhitelistTokenEvent(WELL));
    // In practice, it was decided to be preferable for all tracking to continue for dewhitelisted wells.
    // Therefore the isBeanstalk flag does not get flipped.
    assert.fieldEquals("Well", WELL.toHexString(), "isBeanstalk", "true");
  });
});
