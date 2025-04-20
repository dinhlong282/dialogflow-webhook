const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(bodyParser.json());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Cấu hình OpenAI SDK mới
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema sản phẩm
const Product = mongoose.model("Product", {
  id: Number,
  name: String,
  image: String,
  category: String,
  new_price: String,
  old_price: String,
  date: Date,
  avilable: Boolean,
  description: String,
  rating: Number,
});

// Webhook Dialogflow
app.post("/webhook", async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;
  const userMessage = req.body.queryResult.queryText;
  console.log("📩 Intent received from Dialogflow:", intentName);

  // Intent: Sản phẩm nam
  if (intentName === "ask_male_product") {
    try {
      const menProducts = await Product.find({ category: "men" });

      if (menProducts.length === 0) {
        return res.json({
          fulfillmentText: "Hiện tại shop chưa có sản phẩm dành cho nam.",
        });
      }

      const responseText = menProducts
        .map((p, i) => {
          return `${i + 1}. ${p.name} - ${
            p.new_price
          }K<br>https://your-domain.com/product/${p.id}`;
        })
        .join("<br><br>");

      return res.json({
        fulfillmentText: `Dưới đây là một số sản phẩm dành cho nam:<br><br>${responseText}`,
      });
    } catch (error) {
      console.error("❌ MongoDB error:", error);
      return res.json({
        fulfillmentText: "Đã xảy ra lỗi khi lấy sản phẩm từ hệ thống.",
      });
    }
  }

  // Intent: Hỏi tự do (dùng ChatGPT)
  if (intentName === "ask_product_gpt") {
    try {
      console.log("👉 Gửi yêu cầu đến OpenAI với nội dung:", userMessage);

      const gptRes = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Bạn là nhân viên tư vấn thân thiện của shop thời trang online. Trả lời ngắn gọn, dễ hiểu, giúp người dùng chọn sản phẩm phù hợp.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const answer = gptRes.choices[0].message.content;
      console.log("✅ Phản hồi từ GPT:", answer);

      return res.json({
        fulfillmentText: answer,
      });
    } catch (err) {
      console.error(
        "❌ Lỗi khi gọi OpenAI:",
        err?.response?.data || err.message || err
      );
      return res.json({
        fulfillmentText:
          "Xin lỗi, tôi không thể phản hồi lúc này. Vui lòng thử lại sau.",
      });
    }
  }

  // Mặc định
  return res.json({
    fulfillmentText: "Xin lỗi, tôi chưa hiểu yêu cầu của bạn.",
  });
});

app.get("/", (req, res) => {
  res.send("✅ Dialogflow Webhook is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server is running at http://localhost:${PORT}`);
});
