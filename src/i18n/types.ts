export interface TranslationDictionary {
  appName: string;
  subTitle: string;
  menus: {
    file: string;
    newWorld: string;
    replayStory: string;
    loadWorld: string;
    saveWorld: string;
    exit: string;

    options: string;
    combatDifficulty: string;
    gameSpeed: string;
    worldControl: string;
    statistics: string;
    soundOn: string;
    musicOn: string;
    pause: string;

    window: string;
    hideMe: string;
    fullscreen: string;
    scale: string;

    language: string;

    help: string;
    howToPlay: string;
    about: string;
  };
  toolbar: {
    newGame: string;
    save: string;
    load: string;
    pause: string;
    sound: string;
    music: string;
    locator: string;
    language: string;
    help: string;
  };
  sidebar: {
    status: string;
    health: string;
    force: string;
    weapon: string;
    item: string;
    locator: string;
    inventory: string;
    noneEquipped: string;
    planet: string;
    zone: string;
  };
  dialogs: {
    ok: string;
    cancel: string;
    close: string;
    aboutTitle: string;
    aboutText: string;
    difficultyTitle: string;
    difficultyEasy: string;
    difficultyMedium: string;
    difficultyHard: string;
    speedTitle: string;
    speedSlow: string;
    speedNormal: string;
    speedFast: string;
    worldControlTitle: string;
    worldControlPrompt: string;
    worldSmall: string;
    worldMedium: string;
    worldLarge: string;
    statsTitle: string;
    lastScore: string;
    highScore: string;
    gamesWon: string;
    gamesLost: string;
    helpTitle: string;
    helpText: string;
    victoryTitle: string;
    victoryText: string;
    defeatTitle: string;
    defeatText: string;
  };
  items: {
    lightsaber: string;
    blaster: string;
    blasterRifle: string;
    thermalDetonator: string;
    redKeycard: string;
    blueKeycard: string;
    locator: string;
    credits: string;
    junk: string;
    medkit: string;
    mushroom: string;
    holocron: string;
    astromechPart: string;
    energyCell: string;
  };
  lore: {
    yodaGreeting: string;
    mayTheForceBeWithYou: string;
    sealedObstacle: string;
    dagobahArrival: string;
    cantinaMusic: string;
    vaderApproaches: string;
  };
  mobile: {
    attack: string;
    use: string;
    inventory: string;
  };
  startup: {
    clickToStart: string;
    orPressKey: string;
  };
}

export type SupportedLanguage = 'en' | 'pt-BR' | 'zh-CN' | 'ru' | 'de';
