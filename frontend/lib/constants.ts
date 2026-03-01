// Typing passages — variations of the Waystone Inn opening from The Name of the Wind
export const TYPING_PASSAGES = [
  `It was night again. The Waystone Inn lay in silence, and it was a silence of three parts. The most obvious part was a hollow, echoing quiet, made by things that were lacking. If there had been a wind it would have sighed through the trees, set the inn's sign creaking on its hooks, and brushed the silence down the road like trailing autumn leaves. If there had been a crowd, even a handful of men inside the inn, they would have filled the silence with conversation and laughter, the clatter and clamor one expects from a drinking house during the dark hours of night. If there had been music... but no, of course there was no music. In fact there were none of these things, and so the silence remained.`,
  `It was night again. The Waystone Inn lay in silence, and it was a silence of three parts. The first part was a hollow, echoing quiet, made by things that were lacking. If there had been horses stabled in the barn they would have stamped and champed and broken it to pieces. If there had been a crowd of guests, even a handful of guests bedded down for the night, their restless breathing and mingled snores would have gently thawed the silence like a warm spring wind. If there had been music... but no, of course there was no music. In fact there were none of these things, and so the silence remained.`,
  `It was night again. The Waystone Inn lay in silence, and it was a silence of three parts. The most obvious part was a hollow, echoing quiet, made by things that were lacking. If there had been a steady rain it would have drummed against the roof, sluiced the eaves, and washed the silence slowly out to sea. If there had been lovers in the beds of the inn, they would have sighed and moaned and shamed the silence into being on its way. If there had been music... but no, of course there was no music. In fact there were none of these things, and so the silence remained.`,
  `Dawn was coming. The Waystone Inn lay in silence, and it was a silence of three parts. The most obvious part was a vast, echoing quiet made by things that were lacking. If there had been a storm, raindrops would have tapped and pattered against the selas vines behind the inn. Thunder would have muttered and rumbled and chased the silence down the road like fallen autumn leaves. If there had been travelers stirring in their rooms they would have stretched and grumbled the silence away like fraying, half-forgotten dreams. If there had been music... but no, of course there was no music. In fact there were none of these things, and so the silence remained.`,
  `It was still night in the middle of Newarre. The Waystone Inn lay in silence and it was a silence of three parts. The most obvious part was a vast echoing quiet made by things that were lacking. If the horizon had shown the slightest kiss of blue, the town would be stirring. There would be the crackle of kindling, the gentle murmur of water simmering for porridge or tea. The slow dewy hush of folk walking through the grass would have brushed the silence off the front steps of houses with the indifferent briskness of an old birch broom. If Newarre had been large enough to warrant watchmen, they would have trudged and grumbled the silence away like an unwelcome stranger. If there'd been music... but no, of course there was no music. In fact there were none of these things, and so the silence remained.`,
];

export function getRandomPassage(): string {
  return TYPING_PASSAGES[Math.floor(Math.random() * TYPING_PASSAGES.length)];
}

// Polling intervals (milliseconds)
export const COMPETITION_POLL_INTERVAL = 30_000; // 30 seconds
export const LEADERBOARD_POLL_INTERVAL = 15_000; // 15 seconds
export const PLAYER_STATE_POLL_INTERVAL = 15_000; // 15 seconds

// AUSD token decimals
export const AUSD_DECIMALS = 6;

// Score multiplier (scores stored as integers × 100)
export const SCORE_MULTIPLIER = 100;
