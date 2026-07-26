const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildFallbackInsights(user, recentMatches = []) {
  const stats = user.stats || {};
  const matchesPlayed = stats.matchesPlayed || 0;
  const winsAsGood = stats.winsAsGood || 0;
  const winsAsEvil = stats.winsAsEvil || 0;
  const assassinationAccuracy = stats.assassinationAccuracy || 0;

  const insights = [];

  if (matchesPlayed < 3) {
    insights.push({
      title: "Build More Match History",
      message:
        "You have limited match data so far. Play more completed games to make your training insights more accurate.",
    });
  }

  if (assassinationAccuracy < 40 && matchesPlayed >= 3) {
    insights.push({
      title: "Improve Merlin Detection",
      message:
        "Your assassination accuracy is low. During Evil games, track who subtly guides successful quests without appearing too obvious.",
    });
  }

  if (winsAsEvil < winsAsGood && matchesPlayed >= 3) {
    insights.push({
      title: "Improve Evil Deception",
      message:
        "Your Evil results appear weaker than your Good results. Try blending into normal Good voting patterns before choosing when to sabotage.",
    });
  }

  if (winsAsGood < winsAsEvil && matchesPlayed >= 3) {
    insights.push({
      title: "Strengthen Good Deduction",
      message:
        "Your Good results appear weaker than your Evil results. Pay closer attention to rejected teams, repeated voting patterns, and who benefits from failed quests.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Balanced Performance",
      message:
        "Your current stats do not show one obvious weakness yet. Review recent match outcomes and focus on consistency across both Good and Evil roles.",
    });
  }

  return insights.slice(0, 3);
}

async function generateTrainingInsights({ user, recentMatches }) {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackInsights(user, recentMatches);
  }

    const safePayload = {
    username: user.username,
    stats: user.stats,
    recentMatches: recentMatches.map((match) => ({
        winner: match.winner,
        winReason: match.winReason,
        myRole: match.myRole,
        myTeam: match.myTeam,
        didWin: match.didWin,
        questSummary: match.questSummary,
        createdAt: match.createdAt,
    })),
  };

  const prompt = `
You are a strategy coach for Cipher.gg, an Avalon-style hidden-role social deduction game.

Given the player's statistics and recent match summaries, generate 3 concise training insights.

Rules:
- Do not invent data.
- If data is limited, say that the advice is preliminary.
- Focus on practical strategy improvement.
- Mention deduction, deception, team voting, quest outcomes, or Merlin/Assassin reasoning when relevant.
- Return only valid JSON in this exact shape:
{
  "insights": [
    { "title": "string", "message": "string" }
  ]
}

Player data:
${JSON.stringify(safePayload, null, 2)}
`;

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    const text = response.output_text;
    const parsed = JSON.parse(text);

    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      return buildFallbackInsights(user, recentMatches);
    }

    return parsed.insights.slice(0, 3);
  } catch (error) {
    console.error("Failed to generate AI training insights:", error);
    return buildFallbackInsights(user, recentMatches);
  }
}

module.exports = {
  generateTrainingInsights,
  buildFallbackInsights,
};