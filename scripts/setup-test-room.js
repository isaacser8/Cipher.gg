const { chromium } = require("playwright");

const URL = "http://localhost:5173";
const PLAYERS = ["Isaac", "Jerry", "Michelle", "ES", "KY"];

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ["--new-window"],
  });
  const context = await browser.newContext();

  // First player hosts
  const hostPage = await context.newPage();
  await hostPage.goto(URL);
  await hostPage.waitForLoadState("networkidle");
  await hostPage.getByRole("button", { name: "Host New" }).click();
  await hostPage.getByPlaceholder("ENTER YOUR NAME").fill(PLAYERS[0]);
  await hostPage
    .getByRole("button", { name: "START SESSION", exact: true })
    .click();

  // Wait for lobby to load and get the room code
  await hostPage.waitForURL(/\/lobby\//);
  const roomCode = hostPage.url().split("/lobby/")[1];
  console.log(`Room code: ${roomCode}`);

  // Host sets team size to 5 and readies up
  await hostPage.selectOption("select", "5");
  console.log("Team size set to 5!");
  await hostPage.getByRole("button", { name: "Ready Up" }).click();
  console.log(`${PLAYERS[0]} is ready!`);

  // Remaining 4 players join and ready up
  for (let i = 1; i < PLAYERS.length; i++) {
    const page = await context.newPage();
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("ENTER YOUR NAME").fill(PLAYERS[i]);
    await page.getByPlaceholder("enter 6-digit code").fill(roomCode);
    await page.locator("button.bg-gradient-to-r.from-purple-600").click();
    await page.waitForURL(/\/lobby\//, { timeout: 10000 });
    await page.getByRole("button", { name: "Ready Up" }).click();
    console.log(`${PLAYERS[i]} joined!`);
  }

  console.log("All ready! Click Start Game on the host tab.");

  // Click
  // Keep browser open for manual testing
  await new Promise(() => {});
})();
