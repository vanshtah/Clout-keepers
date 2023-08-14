const express = require("express");
var cors = require('cors');
const fetch = require('node-fetch');
const ethers = require("ethers");
const positionRouterABI = require("./positionRouterABI.json");
const fastPriceABI = require("./fastPriceFeedABI.json");
const { updatePriceBitsAndOptionallyExecute } = require("./utils");
require("dotenv").config();
const {
  ETH_ADDRESS,
  BTC_ADDRESS,
  USDC_ADDRESS,
  TLOS_ADDRESS,
  PROVIDER_URL,
  WSPROVIDER,
  FASTPRICEFEEDADDRESS,
  POSITIONROUTERADDRESS,
} = require("./config.json");

const tokens = [
  {
    symbol: "USDC",
    precision: 1000,
    address: USDC_ADDRESS,
  },
  {
    symbol: "TLOS",
    precision: 1000,
    address: TLOS_ADDRESS,  
  },
  {
    symbol: "ETH",
    precision: 1000,
    address: ETH_ADDRESS,
  },
  {
    symbol: "BTC",
    precision: 1000,
    address: BTC_ADDRESS,
  },
];

const KEEPER_DEPLOY_KEY = process.env.KEEPER_DEPLOY_KEY;
const FAST_PRICE_FEED_ADDRESS = FASTPRICEFEEDADDRESS;
const POSITION_ROUTER_ADDRESS = POSITIONROUTERADDRESS;

const providerws = new ethers.providers.WebSocketProvider(WSPROVIDER);
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const keeper = new ethers.Wallet(KEEPER_DEPLOY_KEY, provider);

const fastPriceFeed = new ethers.Contract(
  FAST_PRICE_FEED_ADDRESS,
  fastPriceABI,
  provider
);

const positionRouterWs = new ethers.Contract(
  POSITION_ROUTER_ADDRESS,
  positionRouterABI,
  providerws
);

const positionRouter = new ethers.Contract(
  POSITION_ROUTER_ADDRESS,
  positionRouterABI,
  provider
);

function pingAddressHandler() {
  try {
    updatePriceBitsAndOptionallyExecute(
      tokens,
      fastPriceFeed,
      positionRouter,
      keeper
    );
  } catch (e) {
    logger.error(e);
  }
}

setInterval(pingAddressHandler, 60 * 3 * 1000);

async function PositionListener() {
  console.log("Listening to events");

  positionRouterWs.on(
    "CreateIncreasePosition",
    (
      account,
      path,
      indexToken,
      amountIn,
      minOut,
      sizeDelta,
      isLong,
      acceptablePrice,
      executionFee,
      index,
      queueIndex,
      blockNumber,
      blockTime,
      gasPrice
    ) => {
      console.log(
        `CreateIncreasePosition: ${JSON.stringify({
          account,
          path,
          indexToken,
          amountIn,
          minOut,
          sizeDelta,
          isLong,
          acceptablePrice,
          executionFee,
          index,
          queueIndex,
          blockNumber,
          blockTime,
          gasPrice,
        })}`
      );

      try {
        updatePriceBitsAndOptionallyExecute(
          tokens,
          fastPriceFeed,
          positionRouter,
          keeper
        );
      } catch (e) {
        logger.error(e);
      }
    }
  );

  positionRouterWs.on(
    "CreateDecreasePosition",
    (
      account,
      path,
      indexToken,
      collateralDelta,
      sizeDelta,
      isLong,
      receiver,
      acceptablePrice,
      minOut,
      executionFee,
      index,
      queueIndex,
      blockNumber,
      blockTime
    ) => {
      console.log(
        `CreateDecreasePosition: ${JSON.stringify({
          account,
          path,
          indexToken,
          collateralDelta,
          sizeDelta,
          isLong,
          receiver,
          acceptablePrice,
          minOut,
          executionFee,
          index,
          queueIndex,
          blockNumber,
          blockTime,
        })}`
      );

      try {
        updatePriceBitsAndOptionallyExecute(
          tokens,
          fastPriceFeed,
          positionRouter,
          keeper
        );
      } catch (e) {
        logger.error(e);
      }
    }
  );
}

PositionListener().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const app = express();
app.use(cors());
const port = 3010;

app.get("/heartbeat", (req, res) => {
  res.send({
    status: "OK",
    time: new Date().toISOString(),
  });
});

app.get("/", async (req, res) => {
  res.send("Server is running and listening to contract events!");
});

app.listen(port, async () => {
  console.log(`Server is running on port ${port}.`);
});

app.get("/getdata", async (req, res) => {
  let symbol = req.query.symbol;
  let period = req.query.period;

  console.log(req.query)

  let url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}_USDT&interval=${period}`;

    try {
      const res1 = await fetch(url);
      const prices = await res1.json();

      return res.send(prices)
      // return;
    } catch (ex) {
      console.log(ex)
      return res.send("Unable to fetch");
    }

})
