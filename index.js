const TelegramBot = require("node-telegram-bot-api");
const { parseString } = require("xml2js");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const TOKEN = "6468141535:AAHqWqokBwhUYG-QxpTQDK9ZUJF7X6jURGY";
const bot = new TelegramBot(TOKEN, { polling: true });

let chatIds = [];

const saveChatIdsToFile = () => {
  const fs = require("fs");
  fs.writeFile("./chatIds.txt", JSON.stringify(chatIds), function (err) {
    if (err) return console.log(err);
  });
};

const loadChatIdsFromFile = () => {
  const fs = require("fs");
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
  if (msg.text === "/get") {
    getGoldPrice((text) => {
      bot.sendMessage(msg.chat.id, text, {
        parse_mode: "HTML",
      });
    });
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
        });
        callback(html);
      });
    });
}

let currentPrice = "";

const cron = require("node-cron");
// Schedule tasks to be run on every 1 hour
cron.schedule("0 * * * *", function () {
  getGoldPrice((text) => {
    if (currentPrice === text) return;
    currentPrice = text;
    chatIds.forEach((chatId) => {
      bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
      });
    });
  });
});
