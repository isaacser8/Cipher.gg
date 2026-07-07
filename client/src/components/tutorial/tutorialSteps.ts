export interface TutorialStep {
  title: string;
  content: string;
  targetId: string;
}

export const homeTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Cipher.gg',
    content:
      'Cipher.gg helps automate Avalon-style gameplay, including room setup, player readiness, missions, voting, and endgame results.',
    targetId: 'home-card',
  },
  {
    title: 'Choose Your Alias',
    content:
      'Your alias is your in-game name. Choose an interesting name!',
    targetId: 'alias-input',
  },
  {
    title: 'Join or Host a Session',
    content:
      'Join Session lets you enter a friend’s room code. Host New creates a new lobby for your group.',
    targetId: 'mode-tabs',
  },
  {
    title: 'Room Code',
    content:
      'If you are joining a session, enter the room code shared by the host!',
    targetId: 'room-code-input',
  },
  {
    title: 'Start Playing',
    content:
      'Once your alias and room details are ready, step into the lobby!',
    targetId: 'start-session-button',
  },
];

export const lobbyTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to the Lobby',
    content:
      'This is where players gather before the match begins. The host can also manage lobby settings here.',
    targetId: 'lobby-main',
  },
  {
    title: 'Room Code',
    content:
      'Share this room code with your friends so they can join the your game.',
    targetId: 'lobby-room-code',
  },
  {
    title: 'Agent Roster',
    content:
      'The roster shows all connected agents, the host, and also the status of each player.',
    targetId: 'lobby-roster',
  },
  {
    title: 'Session Log and Chat',
    content:
      'Use the chatbox to follow lobby updates and send messages before the game starts.',
    targetId: 'lobby-chat',
  },
  {
    title: 'Ready Up',
    content:
      'Ready up if you are ready for some intense games with you friends!',
    targetId: 'ready-button',
  },
];

export const gameTutorialSteps: TutorialStep[] = [
  {
    title: 'Phase and Timer',
    content:
      'The top bar shows the current phase and remaining time. Keep an eye on it when making a decision.',
    targetId: 'game-header',
  },
  {
    title: 'Mission Progress',
    content:
      'This panel tracks mission success, failure, and rejected votes.',
    targetId: 'mission-progress',
  },
  {
    title: 'Agent Roster',
    content:
      'This shows all players and helps you track leadership, suspicion, and team composition.',
    targetId: 'agent-roster',
  },
  {
    title: 'Role Card',
    content:
      'Your role card shows your private role, team, and special information.',
    targetId: 'role-card',
  },
  {
    title: 'Chat and Notes',
    content:
      'Use chat and private notes to track deductions, lies, voting patterns, and spot suspicious behaviour.',
    targetId: 'game-tools',
  },
  {
    title: 'Action Panel',
    content:
      'The bottom panel changes based on the current phase. Use it to propose teams, vote, perform missions, or assassinate.',
    targetId: 'action-panel',
  },
];