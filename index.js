require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { parseString } = require("xml2js");
const cron = require("node-cron");
const fs = require("fs");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const TOKEN = process.env.TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

let chatIds = [];

const saveChatIdsToFile = () => {
  fs.writeFile("./chatIds.txt", JSON.stringify(chatIds), function (err) {
    if (err) return console.log(err);
  });
};

const loadChatIdsFromFile = () => {
  fs.readFile("./chatIds.txt", "utf8", function (err, data) {
    if (err) {
      chatIds = [];
    } else {
      chatIds = JSON.parse(data);
    }
  });
};

loadChatIdsFromFile();

bot.onText(/\/start/, (msg) => {
  console.log("ALo");
  bot.sendMessage(
    msg.chat.id,
    "Chào mừng bạn đến với bot nhận thông tin giá vàng.\nBạn đã được thêm vào danh sách nhận thông tin giá vàng.\nMã số của bạn là: " +
      msg.chat.id
  );
  if (!chatIds.includes(msg.chat.id)) {
    chatIds.push(msg.chat.id);
    saveChatIdsToFile();
  }
});

bot.on("message", async (msg) => {
  switch (msg.text) {
    case "/get":
      getGoldPrice((text) => {
        bot.sendMessage(msg.chat.id, text, {
          parse_mode: "HTML",
        });
      });
      break;
    case "/end":
      chatIds = chatIds.filter((id) => id !== msg.chat.id);
      saveChatIdsToFile();
      break;
    case "/help":
      bot.sendMessage(
        msg.chat.id,
        "Bot hỗ trợ các lệnh sau: \n - <code>/start</code>: Đăng ký nhận giá vàng \n - <code>/get</code>: Lấy giá vàng hiện tại \n - <code>/end</code>: Hủy đăng ký nhận giá vàng",
        {
          parse_mode: "HTML",
        }
      );
      break;
    case "/start":
      break;
    default:
      bot.sendMessage(
        msg.chat.id,
        "Lệnh không hợp lệ. Nhập <code>/help</code> để xem hướng dẫn.",
        {
          parse_mode: "HTML",
        }
      );
  }
});

function getGoldPrice(callback) {
  return fetch("https://sjc.com.vn/xml/tygiavang.xml")
    .then(function (response) {
      return response.text();
    })
    .then(async function (xmlString) {
      parseString(xmlString, function (err, result) {
        const cities = result["root"]["ratelist"][0]["city"];
        const updated = result["root"]["ratelist"][0]["$"]["updated"];
        let html = `<b>Giá vàng SJC</b> \nCập nhật lúc: <code>${updated}</code>\n\n`;

        cities.forEach((city) => {
          html += `<i>${city["$"]["name"]}</i>\n`;
          city["item"].forEach((item) => {
            html += ` - <b>${item["$"]["type"]}</b>: <code>${item["$"]["buy"]}/${item["$"]["sell"]}</code>\n`;
          });
          html += "\n";
        });
        callback(html);
      });
    });
}

const loadCurrentPrice = (cb) => {
  const fs = require("fs");
  fs.readFile("./currentPrice.txt", "utf8", function (err, data) {
    if (err) {
      cb("");
    } else {
      cb(data);
    }
  });
};

const saveCurrentPrice = (price) => {
  const fs = require("fs");
  fs.writeFile("./currentPrice.txt", price, function (err) {
    if (err) return console.log(err);
  });
};

// Schedule tasks to be run on every 1 hour
cron.schedule("0 * * * *", function () {
  getGoldPrice((text) => {
    loadCurrentPrice((currentPrice) => {
      if (currentPrice === text) return;
      currentPrice = text;
      chatIds.forEach((chatId) => {
        bot.sendMessage(chatId, text, {
          parse_mode: "HTML",
        });
      });
      saveCurrentPrice(currentPrice);
    });
  });
});
