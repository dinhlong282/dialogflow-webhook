const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(bodyParser.json());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Định nghĩa lại schema sản phẩm giống bên backend
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

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;
  console.log("Intent received from Dialogflow:", intentName);

  if (intentName === "ask_male_product") {
    try {
      const menProducts = await Product.find({ category: "men" }).limit(3);

      if (menProducts.length === 0) {
        return res.json({
          fulfillmentText: "Hiện tại shop chưa có sản phẩm dành cho nam.",
        });
      }

      const responseText = menProducts
        .map((p, i) => `${i + 1}. ${p.name} - ${p.new_price}K`)
        .join("\n");

      return res.json({
        fulfillmentText: `Dưới đây là một số sản phẩm dành cho nam:\n${responseText}`,
      });
    } catch (error) {
      console.error("Error in fetching men products:", error);
      return res.json({
        fulfillmentText: "Đã xảy ra lỗi khi lấy sản phẩm nam từ cơ sở dữ liệu.",
      });
    }
  }

  // Mặc định nếu không đúng intent cần xử lý
  return res.json({
    fulfillmentText: "Xin lỗi, tôi chưa hiểu yêu cầu của bạn.",
  });
});

app.get("/", (req, res) => {
  res.send("Dialogflow webhook is running ✅");
});

app.listen(PORT, () => {
  console.log(`Dialogflow Webhook server running on http://localhost:${PORT}`);
});
