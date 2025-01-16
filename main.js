const fs = require("fs");
const axios = require("axios");
const displayBanner = require("./config/banner");
const colors = require("./config/colors");
const logger = require("./config/logger");

class Account {
  constructor(loginToken, index) {
    this.loginToken = loginToken;
    this.sessionToken = "";
    this.accountIndex = index;
  }

  formatRunningTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    return `${String(days).padStart(2, "0")}:${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(2, "0")}`;
  }

  async login() {
    try {
      logger.info(
        `${colors.info}Account ${colors.accountName}${this.accountIndex}${colors.info} > Attempting to login...${colors.reset}`
      );

      const loginResponse = await axios.post(
        `https://api.app.multiple.cc/ChromePlugin/Login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.loginToken}`,
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US;q=0.9",
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        }
      );

      if (loginResponse.data.success && loginResponse.data.data.token) {
        this.sessionToken = loginResponse.data.data.token;
        logger.success(
          `${colors.success}Account ${colors.accountName}${this.accountIndex}${colors.success} > New session token obtained${colors.reset}`
        );
        return true;
      }

      logger.warn(
        `${colors.warning}Account ${colors.accountName}${this.accountIndex}${colors.warning} > Session token not found in response${colors.reset}`
      );
      return false;
    } catch (error) {
      logger.error(
        `${colors.error}Account ${colors.accountName}${this.accountIndex}${colors.error} > Login error: ${error.message}${colors.reset}`
      );
      return false;
    }
  }

  async checkLoginStatus() {
    try {
      const response = await axios.get(
        `https://api.app.multiple.cc/ChromePlugin/GetInformation`,
        {
          headers: {
            Authorization: `Bearer ${this.sessionToken}`,
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US;q=0.9",
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        }
      );

      if (response.data.success && response.data.data.isOnline) {
        const formattedTime = this.formatRunningTime(
          response.data.data.totalRunningTime
        );
        logger.success(
          `${colors.success}Account ${colors.accountName}${this.accountIndex}${colors.success} > Status: Online ${colors.timerCount}(Running Time: ${formattedTime})${colors.reset}`
        );
        return true;
      }
      logger.warn(
        `${colors.warning}Account ${colors.accountName}${this.accountIndex}${colors.warning} > Status: Offline${colors.reset}`
      );
      return false;
    } catch (error) {
      logger.error(
        `${colors.error}Account ${colors.accountName}${this.accountIndex}${colors.error} > Status check error: ${error.message}${colors.reset}`
      );
      return false;
    }
  }

  async start() {
    const initialLogin = await this.login();
    if (!initialLogin) {
      logger.error(
        `${colors.error}Account ${colors.accountName}${this.accountIndex}${colors.error} > Initial login failed${colors.reset}`
      );
      return;
    }

    setInterval(async () => {
      const isLoggedIn = await this.checkLoginStatus();

      if (!isLoggedIn) {
        logger.warn(
          `${colors.warning}Account ${colors.accountName}${this.accountIndex}${colors.warning} > Status offline, attempting to login again...${colors.reset}`
        );
        const loginSuccess = await this.login();
        if (loginSuccess) {
          logger.success(
            `${colors.success}Account ${colors.accountName}${this.accountIndex}${colors.success} > Login successful${colors.reset}`
          );
          await this.checkLoginStatus();
        } else {
          logger.error(
            `${colors.error}Account ${colors.accountName}${this.accountIndex}${colors.error} > Login failed${colors.reset}`
          );
        }
      }
    }, 60000);
  }
}

class AutoLogin {
  constructor() {
    this.tokenFile = "data.txt";
    this.accounts = [];
  }

  async loadAccounts() {
    try {
      const fileContent = await fs.promises.readFile(this.tokenFile, "utf8");
      const tokens = fileContent.split("\n").filter((token) => token.trim());

      logger.info(
        `${colors.info}Found ${colors.custom}${tokens.length}${colors.info} account(s) in data.txt${colors.reset}`
      );

      tokens.forEach((token, index) => {
        this.accounts.push(new Account(token.trim(), index + 1));
      });

      return true;
    } catch (error) {
      logger.error(
        `${colors.error}Error reading tokens: ${error.message}${colors.reset}`
      );
      return false;
    }
  }

  async start() {
    displayBanner();
    logger.info(
      `${colors.info}Starting Multiple Account Auto Login...${colors.reset}`
    );

    const accountsLoaded = await this.loadAccounts();
    if (!accountsLoaded || this.accounts.length === 0) {
      logger.error(
        `${colors.error}No accounts found in data.txt${colors.reset}`
      );
      return;
    }

    this.accounts.forEach((account) => {
      account.start();
    });
  }
}

const autoLogin = new AutoLogin();
autoLogin.start().catch((error) => {
  logger.error(`${colors.error}System Error: ${error.message}${colors.reset}`);
});
