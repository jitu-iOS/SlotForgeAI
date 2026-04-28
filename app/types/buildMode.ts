export type BuildMode = "slot" | "utility" | "game-2d";

export interface UtilityForm {
  appName: string;
  industry: string;
  persona: string;
  coreFunction: string;
  visualStyle: string;
  colorPalette: string;
  layoutDensity: string;
  brandKeywords: string;
}

export interface Game2DForm {
  gameTitle: string;
  genre: string;
  theme: string;
  artStyle: string;
  colorPalette: string;
  playerCharacter: string;
  enemies: string;
  environment: string;
  hudStyle: string;
  endTone: string;
}

export type UtilityAssetType =
  | "app_icon"
  | "login_screen"
  | "dashboard"
  | "data_table"
  | "settings"
  | "empty_state"
  | "mobile_view"
  | "notification";

export type Game2DAssetType =
  | "title_screen"
  | "player_sprite"
  | "enemy_sprite"
  | "environment"
  | "tileset"
  | "hud_frame"
  | "power_up"
  | "gameover_screen";
