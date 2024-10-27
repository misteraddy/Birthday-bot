const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const userModel = require("./src/models/User");
const birthdayModel = require("./src/models/Birthday");
const cron = require("node-cron");

dotenv.config();

(async () => {
  try {
    await connectDB();
    console.log("DB connected successfully");
  } catch (err) {
    console.error("Error connecting to DB:", err);
    process.kill(process.pid, "SIGTERM");
  }
})();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  const from = ctx.update.message.from;

  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Error saving user data:", err);
    await ctx.reply("Facing difficulties in saving user data.");
  }

  await ctx.reply(
    `Hey ${from.first_name}! 🎉 Welcome! I'm here to keep track of important birthdays for you. Just add birthdays to my list, and I'll make sure you never miss a celebration. Let’s make every birthday special! 🎂`
  );
});

bot.command("add", async (ctx) => {
  const [name, date] = ctx.message.text.split(" ").slice(1);
  const birthday = new Date(date);

  if (!name || isNaN(birthday)) {
    return ctx.reply("Please provide a valid name and date (YYYY-MM-DD).");
  }

  const userId = ctx.from.id;

  try {
    await birthdayModel.findOneAndUpdate(
      { tgId: userId, name },
      { birthday, tgId: userId, name, isNotified: false },
      { upsert: true, new: true }
    );

    ctx.reply(`Birthday for ${name} on ${date} has been added.`);
  } catch (error) {
    console.error("Error adding birthday:", error);
    ctx.reply("There was an error adding the birthday. Please try again.");
  }
});

bot.command("birthdays", async (ctx) => {
  const from = ctx.update.message.from;

  const birthdays = await birthdayModel.find({ tgId: from.id });

  if (birthdays.length === 0) {
    return await ctx.reply("No birthdays have been added yet.");
  }

  let message = "🎂 Here are the birthdays:\n";

  birthdays.forEach((user) => {
    message += `${user.name}: ${user.birthday.toDateString()}\n`;
  });

  await ctx.reply(message);
});

cron.schedule("0 * * * *", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const userWithBirthdayToday = await birthdayModel.find({
      birthday: {
        $gte: today,
        $lt: new Date(today.getTime() + 86400000),
      },
      isNotified: false,
    });

    if (userWithBirthdayToday.length > 0) {
      userWithBirthdayToday.forEach(async (user) => {
        try {
          await bot.telegram.sendMessage(
            user.tgId,
            `🎉 It's ${user.name}'s birthday today! Type /ok to acknowledge.`
          );
        } catch (err) {
          console.error(
            `Failed to send birthday message to ${user.tgId}:`,
            err
          );
        }
      });
    }
  } catch (error) {
    console.error("Error retrieving today's birthdays:", error);
  }
});

bot.command("ok", async (ctx) => {
  const userId = ctx.from.id;

  try {
    await birthdayModel.updateMany(
      { tgId: userId, isNotified: false }, 
      { $set: { isNotified: true } }
    );
    await ctx.reply("Thank you! No more birthday reminders for today.");
  } catch (error) {
    console.error("Error updating acknowledgment:", error);
    await ctx.reply("There was an error acknowledging your reminder. Please try again.");
  }
});

cron.schedule("0 0 * * *", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await birthdayModel.updateMany(
      {
        birthday: {
          $gte: today,
          $lt: new Date(today.getTime() + 86400000),
        },
      },
      {
        $set: { isNotified: false },
      }
    );
  } catch (error) {
    console.error("Error resetting notifications:", error);
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
