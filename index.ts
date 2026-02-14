import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
config();

const evmAddress = process.env.EVM_WALLET as `0x${string}`;
const svmAddress = process.env.SVM_ADDRESS;
if (!evmAddress || !svmAddress) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const facilitatorUrl = process.env.FACILITATOR_URL;
if (!facilitatorUrl) {
  console.error("❌ FACILITATOR_URL environment variable is required");
  process.exit(1);
}
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
console.log("✅ Facilitator client initialized");
console.log(`📡 Facilitator URL: ${facilitatorUrl}`);
console.log(`💰 EVM Wallet: ${evmAddress}`);
console.log(`💰 SVM Wallet: ${svmAddress}`);

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "eip155:84532",
            payTo: evmAddress,
          },
          {
            scheme: "exact",
            price: "$0.001",
            network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            payTo: svmAddress,
          },
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
      "GET /allora": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:84532",
            payTo: evmAddress,
          },
          {
            scheme: "exact",
            price: "$0.01",
            network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            payTo: svmAddress,
          },
        ],
        description: "Allora price predictions",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient)
      .register("eip155:84532", new ExactEvmScheme())
      .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme()),
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/allora", async (req, res) => {
  const { asset, timeframe } = req.query;
  
  // Validate API key exists
  if (!process.env.ALLORA_API_KEY) {
    return res.status(500).send({ error: "ALLORA_API_KEY not configured" });
  }
  
  // Validate required params
  if (!asset || !timeframe) {
    return res.status(400).send({ error: "asset and timeframe query params required" });
  }
  
  try {
    const alloraUrl = `https://api.allora.network/v2/allora/consumer/price/ethereum-111551111/${asset}/${timeframe}`;
    const response = await fetch(alloraUrl, {
      headers: { 'x-api-key': process.env.ALLORA_API_KEY }
    });
    
    if (!response.ok) {
      return res.status(response.status).send({ error: "Allora API request failed" });
    }
    
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error("Allora endpoint error:", error);
    res.status(500).send({ error: "Failed to fetch Allora data" });
  }
});

app.listen(4022, () => {
  console.log(`Server listening at http://localhost:${4022}`);
});